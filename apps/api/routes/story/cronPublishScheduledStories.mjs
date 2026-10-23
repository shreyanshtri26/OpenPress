// routes/story/cronPublishScheduledStories.mjs
// Invoked by EventBridge rule to auto-publish scheduled stories when their time arrives.
import { and, eq, lte } from "drizzle-orm";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";
import { formatStory } from "./storyHelper.mjs";
import {
  addRequester,
  createJob,
  isActiveJob,
  JobConflictError,
  mergeStories,
  parseStory,
  readJob,
  writeJob,
} from "../pagestudio/republishAllJob.mjs";
import { createS3Client } from '../../lib/storage.mjs';

const BUCKET_NAME = process.env.WEBSITE_BUCKET_NAME;
const FRONTEND_WEBSITE_URL = process.env.FRONTEND_WEBSITE_URL;
const s3Client = createS3Client({ region: process.env.STORAGE_REGION });

// Match saveHtml.mjs sanitization
function sanitizeForS3Key(str) {
  return str
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Same job the editor's publish triggers, so Home/section/author/story grids list the new stories.
// Only queued here: index.mjs runs the worker right after this handler returns.
const queueStoryRepublish = async (storiesToRepublish) => {
  const requester = { userId: null, email: "scheduler" };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { job, etag } = await readJob();
    try {
      if (isActiveJob(job)) {
        await writeJob(
          {
            ...job,
            rerunRequested: true,
            queuedRequesters: addRequester(job.queuedRequesters, requester),
            queuedReasons: [...new Set([...(job.queuedReasons || []), "story"])],
            queuedStories: mergeStories(job.queuedStories, storiesToRepublish),
            updatedAt: new Date().toISOString(),
          },
          etag
        );
      } else {
        await writeJob(
          createJob({ requestedBy: requester.email, rendererOrigin: null, layout: null, reason: "story", stories: storiesToRepublish }),
          etag
        );
      }
      return;
    } catch (err) {
      if (!(err instanceof JobConflictError)) throw err;
    }
  }
  console.warn("[cronPublishScheduledStories] Could not queue republish; job record too busy");
};

export const handler = async (event) => {
  console.log("[cronPublishScheduledStories] Triggered", JSON.stringify(event));
  const now = new Date().toISOString();
  const results = { processed: 0, published: 0, skipped: 0, errors: [] };
  const publishedStories = [];

  try {
    const dueStoryRows = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.status, "scheduled"),
          lte(stories.proposedFilingDate, now)
        )
      );

    const dueStories = dueStoryRows.map((r) => formatStory(r));
    console.log(`[cronPublishScheduledStories] Found ${dueStories.length} due stories`);

    for (const story of dueStories) {
      results.processed++;
      const { storyId, slug, Section, section, pendingHtmlKey } = story;

      try {
        // Match saveHtml.mjs: multi-select taxonomies store Section as an array; use the first entry.
        let resolvedSection = Section ?? section ?? "General";
        if (Array.isArray(resolvedSection)) {
          resolvedSection = resolvedSection.find(
            (s) => typeof s === "string" && s.trim().length > 0
          );
        }
        if (typeof resolvedSection !== "string" || !resolvedSection.trim()) {
          resolvedSection = "General";
        }

        const sanitizedSection = sanitizeForS3Key(resolvedSection);
        let sanitizedSlug = sanitizeForS3Key(slug || storyId);
        if (!sanitizedSlug.endsWith(".html")) {
          sanitizedSlug = `${sanitizedSlug}.html`;
        }

        const baseKey = `${sanitizedSection}/${sanitizedSlug}`;
        // Prefer the frozen key written at schedule time; fall back to reconstruction for pre-migration rows.
        const pendingKey = (typeof pendingHtmlKey === "string" && pendingHtmlKey.trim())
          ? pendingHtmlKey
          : `pending-html/${baseKey}`;

        // Copy pending -> live
        try {
          await s3Client.send(new CopyObjectCommand({
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${pendingKey}`,
            Key: baseKey,
            ContentType: "text/html; charset=utf-8",
            CacheControl: "no-store, no-cache, must-revalidate, max-age=0",
            MetadataDirective: "REPLACE"
          }));
        } catch (copyErr) {
          if (copyErr.name === "NoSuchKey" || copyErr.Code === "NoSuchKey") {
            console.warn(`[cronPublishScheduledStories] No pending HTML for story ${storyId}, skipping`);
            results.skipped++;
            continue;
          }
          throw copyErr;
        }

        // Delete pending object
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: pendingKey
          }));
        } catch (delErr) {
          console.warn(`[cronPublishScheduledStories] Failed to delete pending key ${pendingKey}:`, delErr.message);
        }

        // Update Postgres
        const publishUrl = FRONTEND_WEBSITE_URL
          ? `${FRONTEND_WEBSITE_URL}/${baseKey}`
          : null;

        await db
          .update(stories)
          .set({
            status: "published",
            publishedAt: new Date(),
            publish: "now",
            ...(publishUrl ? { publishUrl } : {}),
            pendingHtmlKey: null,
            updatedAt: new Date(),
          })
          .where(eq(stories.storyId, storyId));

        console.log(`[cronPublishScheduledStories] Published story ${storyId}`);
        results.published++;

        const parsed = parseStory({ storyId, slug: slug || storyId, section: resolvedSection, category: story.Category ?? story.category });
        if (parsed) publishedStories.push(parsed);
      } catch (storyErr) {
        console.error(`[cronPublishScheduledStories] Error processing story ${storyId}:`, storyErr);
        results.errors.push({ storyId, error: storyErr.message });
      }
    }

    if (publishedStories.length > 0) {
      try {
        await queueStoryRepublish(publishedStories);
      } catch (queueErr) {
        console.error("[cronPublishScheduledStories] Failed to queue republish:", queueErr);
      }
    }
  } catch (err) {
    console.error("[cronPublishScheduledStories] Fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Cron execution failed", error: err.message, results })
    };
  }

  console.log("[cronPublishScheduledStories] Complete:", results);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Scheduled publish cron complete", results })
  };
};
