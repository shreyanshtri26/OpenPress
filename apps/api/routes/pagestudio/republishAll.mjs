// POST /pagestudio/republishAll
// Publishes the requested pages in this invocation. The caller is not expected to
// wait: a function finishes its invocation even after the browser disconnects.

import { addRequester, createJob, isActiveJob, JOB_REASONS, JobConflictError, mergeStories, mergeTargets, parseStory, parseTargets, readJob, writeJob } from "./republishAllJob.mjs";
import { callHandler, runRepublishAllWorker } from "./republishAllWorker.mjs";
import { storyPublishUrl } from "./saveHtml.mjs";
import { handler as getPage } from "./getPage.mjs";
import { handler as autosavePage } from "./autosaveStory.mjs";
import { handler as updateStoryPublishUrl } from "../story/updateStoryPublishUrl.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** SSO website readers hold valid tokens; they must not rebuild the site. */
const AUDIENCE_ROLE = "audience";

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

/** Only https origins already in ALLOWED_ORIGINS may serve the renderer bundle. */
const resolveRendererOrigin = (candidate) => {
  if (!candidate || typeof candidate !== "string") return null;
  const normalized = candidate.trim().replace(/\/$/, "");
  if (!normalized.startsWith("https://")) return null;
  return allowedOrigins().includes(normalized) ? normalized : null;
};

/** Queues this change as a follow-up pass of the running job. Best-effort; races the worker. */
const requestRerun = async (job, etag, { reason, layout, requester, targets, stories }) => {
  let current = job;
  let currentEtag = etag;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await writeJob(
        {
          ...current,
          rerunRequested: true,
          queuedRequesters: addRequester(current.queuedRequesters, requester),
          queuedReasons: [...new Set([...(current.queuedReasons || []), reason])],
          queuedLayout: reason === "chrome" ? layout : current.queuedLayout ?? null,
          queuedTargets: reason === "campaign" && targets
            ? mergeTargets(current.queuedTargets, targets)
            : current.queuedTargets || [],
          queuedAllPages: !!current.queuedAllPages || (reason === "campaign" && !targets),
          queuedStories: mergeStories(current.queuedStories, stories),
          updatedAt: new Date().toISOString(),
        },
        currentEtag
      );
      return true;
    } catch (err) {
      if (!(err instanceof JobConflictError)) throw err;
      const refreshed = await readJob();
      // Finished in the meantime: nothing to flag.
      if (!refreshed.job || !isActiveJob(refreshed.job)) return false;
      current = refreshed.job;
      currentEtag = refreshed.etag;
    }
  }

  console.warn("[republishAll] could not flag a follow-up run; job record too busy");
  return false;
};

/** True while a run is still working the job. */
const leaseHeld = (job) => !!job?.leaseUntil && Date.parse(job.leaseUntil) > Date.now();

/**
 * Publishes until the job is done or this invocation runs out of time, then
 * reports where it got to. Unfinished work resumes on the next request.
 */
const runAndReport = async (context, jobId, extra = {}) => {
  await runRepublishAllWorker(context, { dedicated: true });

  const { job: finished } = await readJob();
  const done = finished?.phase === "done";

  return json(done ? 200 : 202, {
    ...extra,
    jobId,
    status: finished?.status ?? "unknown",
    phase: finished?.phase ?? null,
    done: finished?.done ?? 0,
    total: finished?.total ?? null,
    failedCount: finished?.failedCount ?? 0,
    finished: done,
  });
};

/** Home's chrome as extracted in the browser: four optional blocks. */
const isUsableLayout = (layout) => {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return false;

  const slots = ["above", "navbar", "below", "footer"];
  const shapeOk = slots.every((slot) => {
    const value = layout[slot];
    if (value === null || value === undefined) return true;
    return !!value && typeof value === "object" && typeof value.type === "string";
  });
  if (!shapeOk) return false;

  // An all-empty layout would strip the navbar and footer from every page.
  return slots.some((slot) => !!layout[slot]);
};

/** An empty template would blank every story page. */
const isUsableBlogData = (data) =>
  !!data &&
  typeof data === "object" &&
  ((Array.isArray(data.content) && data.content.length > 0) ||
    (!!data.zones && typeof data.zones === "object" && Object.keys(data.zones).length > 0));

/** Stores the editor's Blog template as published, so the worker renders from it. */
const saveBlogTemplate = async (data) => {
  const page = await callHandler(getPage, { queryStringParameters: { pageType: "Blog" } });
  if (page.statusCode !== 200) throw new Error(page.body?.message || "Failed to load the Blog page");

  const saved = await callHandler(autosavePage, {
    method: "PUT",
    body: JSON.stringify({
      pageId: page.body?.pageId,
      pageType: "Blog",
      status: "draft",
      data: { ...data, publishedSnapshot: data },
    }),
  });
  if (saved.statusCode !== 200) throw new Error(saved.body?.message || "Failed to save the Blog page");
};

export const handler = async (event, context) => {
  try {
    const user = event.user;
    if (!user) return json(401, { message: "401 Unauthorized request" });

    if (String(user.role || "").toLowerCase() === AUDIENCE_ROLE) {
      return json(403, { message: "Not allowed to republish the site" });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { message: "Invalid JSON body" });
    }

    const reason = JOB_REASONS.has(body.reason) ? body.reason : "chrome";

    // Only a chrome run carries a layout; it comes from the editor's placements registry.
    if (reason === "chrome" && !isUsableLayout(body.layout)) {
      return json(400, {
        message:
          "Missing or unusable layout: expected Home's navbar/footer/leaderboard blocks",
      });
    }

    const story = reason === "story" ? parseStory(body.story) : null;
    if (reason === "story" && !story) {
      return json(400, { message: "Missing story: expected storyId, slug and section" });
    }
    if (reason === "blog" && !isUsableBlogData(body.blogData)) {
      return json(400, { message: "Missing or empty Blog template" });
    }

    const rendererOrigin =
      resolveRendererOrigin(body.rendererOrigin) ||
      resolveRendererOrigin(event.headers?.origin || event.headers?.Origin);

    // Before the lock, so these hold even when this change is queued behind another run.
    const extra = {};
    if (story) {
      extra.publishUrl = storyPublishUrl(story.section, story.slug);
      const saved = await callHandler(updateStoryPublishUrl, {
        method: "PUT",
        storyId: story.storyId,
        body: JSON.stringify({ publishUrl: extra.publishUrl }),
      });
      if (saved.statusCode !== 200) {
        return json(saved.statusCode === 404 ? 404 : 500, {
          message: saved.body?.message || "Could not save the story's publish URL",
        });
      }
    }
    if (reason === "blog") await saveBlogTemplate(body.blogData);

    // One job record site-wide, so no two runs overlap.
    const { job: existing, etag } = await readJob();
    // Campaigns this change affects; without them a campaign run covers every page.
    const targets = reason === "campaign" ? parseTargets(body.campaigns) : null;
    const change = {
      reason,
      targets,
      stories: story ? [story] : [],
      layout: reason === "chrome" ? body.layout : null,
      requester: { userId: user.userId || user.id || null, email: user.email || null },
    };

    // A previous run that ran out of function time leaves an active job with an
    // expired lease. Queue this change behind it, then carry it on from its cursor.
    if (isActiveJob(existing) && !leaseHeld(existing)) {
      if (!(await requestRerun(existing, etag, change))) {
        return json(409, {
          ...extra,
          message: "A site-wide publish is already running",
          jobId: existing.jobId,
          followUpQueued: false,
        });
      }
      return await runAndReport(context, existing.jobId, extra);
    }

    if (isActiveJob(existing)) {
      // Flag a repeat pass so a change made mid-run is not lost.
      const followUpQueued = await requestRerun(existing, etag, change);

      return json(409, {
        ...extra,
        message: "A site-wide publish is already running",
        jobId: existing.jobId,
        status: existing.status,
        reason: existing.reason || "chrome",
        followUpQueued,
      });
    }

    const job = createJob({
      requestedBy: user.email || null,
      requestedByUserId: user.userId || user.id || null,
      layout: reason === "chrome" ? body.layout : null,
      rendererOrigin,
      reason,
      targets,
      stories: change.stories,
    });

    try {
      await writeJob(job, etag);
    } catch (err) {
      if (err instanceof JobConflictError) {
        // Someone else's click landed first; report theirs.
        const { job: current } = await readJob();
        return json(409, {
          ...extra,
          message: "A site-wide publish is already running",
          jobId: current?.jobId,
          status: current?.status,
        });
      }
      throw err;
    }


    return await runAndReport(context, job.jobId, extra);
  } catch (err) {
    console.error("[republishAll] failed to queue job:", err);
    return json(500, { message: "Server error queueing republish", error: err?.message });
  }
};
