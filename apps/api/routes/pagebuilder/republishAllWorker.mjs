// Site-wide republish worker. Runs inside the POST /pagebuilder/republishAll
// invocation, which keeps going after the browser disconnects.
//
// Rendering uses the PageBuilder's published renderer bundle and saving goes
// through the existing route handlers, so output matches an editor publish.
// Work is time-boxed and records a cursor, so a run that does not fit in one
// invocation resumes where it stopped. It must never throw.

import { createHash } from "crypto";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.mjs";
import { stories } from "../../db/schema.mjs";

import {
  JobConflictError,
  campaignRef,
  isActiveJob,
  readJob,
  recordCompletedPass,
  recordFailure,
  writeJob,
} from "./republishAllJob.mjs";

import { handler as getPage } from "./getPage.mjs";
import { handler as autosavePage } from "./autosaveStory.mjs";
import { handler as saveAboutHtml } from "./saveAboutHtmlToS3.mjs";
import { handler as saveSupportUsHtml } from "./saveSupportUsHtmlToS3.mjs";
import { handler as saveAuthorHtml } from "./saveAuthorHtmlToS3.mjs";
import { handler as saveAuthorsHtml } from "./saveAuthorsHtmlToS3.mjs";
import { handler as saveContactUsHtml } from "./saveContactUsHtmlToS3.mjs";
import { handler as saveErrorHtml } from "./saveErrorHtmlToS3.mjs";
import { handler as saveHomeHtml } from "./saveHomeHtmlToS3.mjs";
import { handler as saveHtml } from "./saveHtmlToS3.mjs";
import { handler as saveMediaCouncilHtml } from "./saveMediaCouncilHtmlToS3.mjs";
import { handler as savePrivacyPolicyHtml } from "./savePrivacyPolicyHtmlToS3.mjs";
import { handler as saveSectionHtml } from "./saveSectionHtmlToS3.mjs";
import { handler as saveSiteMap } from "./saveSiteMapToS3.mjs";
import { handler as saveNewsSiteMap } from "./saveNewsSiteMapToS3.mjs";
import { handler as getCampaigns } from "../campaigns/getCampaigns.mjs";
import { handler as getPlacements } from "../placements/getPlacements.mjs";
import { handler as getSectionValues } from "../taxonomy/getSectionValues.mjs";
import { handler as getAuthors } from "../users/getAuthors.mjs";
import { handler as fetchReadyToPublish } from "../story/fetchReadyToPublish.mjs";

/** Renderer bundle published next to the PageBuilder app. */
const RENDERER_PATH = "/publish-renderer.js";
/** Bundle API version this worker understands (see rendererEntry.ts). */
const SUPPORTED_RENDERER_API_VERSION = 2;

/** Stop this far before the Lambda would be killed, so the cursor gets saved. */
const SAFETY_MS = 10_000;
/** Below this much remaining time, skip the tick entirely rather than thrash. */
const MIN_TICK_MS = 15_000;
/** Lease horizon, renewed on every save, so a killed round frees the job soon. */
const LEASE_MS = 2 * 60 * 1000;
/** Used when no Lambda context is available (local test runs). */
const DEFAULT_BUDGET_MS = 5 * 60 * 1000;
const STORY_BATCH_SIZE = 1;
/** Same position this many ticks running means no progress is possible. */
const MAX_STALLED_TICKS = 3;

const SAVE_HANDLERS = {
  saveHomeHtml,
  saveAboutHtml,
  saveSupportUsHtml,
  savePrivacyPolicyHtml,
  saveMediaCouncilHtml,
  saveContactUsHtml,
  saveAuthorsHtml,
  saveErrorHtml,
  saveSectionHtml,
  saveAuthorHtml,
  saveHtml,
};

/** Calls a route handler directly and returns its parsed body. */
export const callHandler = async (handler, event = {}) => {
  const res = await handler({
    requestContext: { http: { method: event.method || "GET" } },
    ...event,
  });
  let body = null;
  try {
    body = res?.body ? JSON.parse(res.body) : null;
  } catch {
    body = null;
  }
  return { statusCode: res?.statusCode ?? 500, body };
};

const postTo = async (endpoint, payload) => {
  const handler = SAVE_HANDLERS[endpoint];
  if (!handler) throw new Error(`No save handler for endpoint ${endpoint}`);
  const { statusCode, body } = await callHandler(handler, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(body?.message || `${endpoint} returned HTTP ${statusCode}`);
  }
};

// ---------------------------------------------------------------------------
// Renderer bundle
// ---------------------------------------------------------------------------

let cachedRenderer = { hash: null, module: null };

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter((o) => o.startsWith("https://"));

/**
 * Imports the bundle source, caching by content hash. Throws if its API version
 * is not the one this worker understands.
 */
const importRenderer = async (source, label) => {
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
  if (cachedRenderer.hash !== hash) {
    // Imports are cached per URL; the content hash makes a redeploy take effect.
    const file = path.join(os.tmpdir(), `publish-renderer-${hash}.mjs`);
    await writeFile(file, source, "utf8");
    const module = await import(pathToFileURL(file).href);
    cachedRenderer = { hash, module };
  }

  const version = cachedRenderer.module?.RENDERER_API_VERSION;
  if (version !== SUPPORTED_RENDERER_API_VERSION) {
    cachedRenderer = { hash: null, module: null };
    throw new Error(`${label} → renderer API version ${version}, expected ${SUPPORTED_RENDERER_API_VERSION}`);
  }

  console.log(`[republishAll] renderer loaded from ${label} (${hash})`);
  return cachedRenderer.module;
};

/**
 * Loads the renderer bundle. In local development PUBLISH_RENDERER_FILE points at the built
 * file (apps/pagebuilder/dist/publish-renderer.js). Otherwise it is fetched from the request's
 * origin, falling back to the allow-list; only https origins in ALLOWED_ORIGINS are ever fetched.
 */
export const loadRenderer = async (job) => {
  let localFile = process.env.PUBLISH_RENDERER_FILE;
  if (localFile && !existsSync(localFile)) {
    const fallbacks = [
      localFile.replace('pagebuilder', 'pagestudio'),
      path.resolve(process.cwd(), '../pagestudio/dist/publish-renderer.js'),
      path.resolve(process.cwd(), 'apps/pagestudio/dist/publish-renderer.js'),
      path.resolve(process.cwd(), '../admin/dist/publish-renderer.js'),
      path.resolve(process.cwd(), 'apps/admin/dist/publish-renderer.js'),
    ];
    for (const f of fallbacks) {
      if (existsSync(f)) {
        localFile = f;
        break;
      }
    }
  }

  if (localFile && existsSync(localFile)) {
    return importRenderer(await readFile(localFile, "utf8"), localFile);
  }

  const candidates = [...new Set([job.rendererOrigin, ...allowedOrigins()].filter(Boolean))];
  if (candidates.length === 0) {
    throw new Error("No https origin available to load the renderer bundle from");
  }

  const failures = [];

  for (const origin of candidates) {
    const url = `${origin}${RENDERER_PATH}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        failures.push(`${url} → HTTP ${res.status}`);
        continue;
      }

      const source = await res.text();
      // CloudFront serves index.html for unknown paths, so a missing bundle is a 200.
      if (source.trimStart().startsWith("<")) {
        failures.push(`${url} → HTML, not a module (bundle not deployed?)`);
        continue;
      }

      return await importRenderer(source, url);
    } catch (err) {
      failures.push(`${url} → ${err.message}`);
    }
  }

  throw new Error(`Could not load renderer bundle. Tried: ${failures.join("; ")}`);
};

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** Everything the renderers need, read once per tick for a consistent view. */
const loadInputs = async (renderer) => {
  const [campaignsRes, sectionsRes, authorsRes, placementsRes, storiesRes] = await Promise.all([
    callHandler(getCampaigns),
    callHandler(getSectionValues),
    callHandler(getAuthors),
    callHandler(getPlacements),
    callHandler(fetchReadyToPublish, { queryStringParameters: {} }),
  ]);

  if (storiesRes.statusCode !== 200) {
    throw new Error(storiesRes.body?.message || "Failed to load published stories");
  }

  const campaigns = campaignsRes.statusCode === 200 ? campaignsRes.body?.campaigns || [] : [];
  // getSectionValues answers 404 when the taxonomy has never been created.
  const sections = sectionsRes.statusCode === 200 ? sectionsRes.body?.values || [] : [];
  const placements = placementsRes.statusCode === 200 ? placementsRes.body?.placements || [] : [];
  const stories = storiesRes.body?.data || [];

  // Fills the renderer bundle's author store; author cards read from it.
  const authors = renderer.seedAuthors(
    authorsRes.statusCode === 200 ? authorsRes.body : { authors: [] }
  );

  return {
    campaigns,
    sections,
    placements,
    authors,
    stories,
    ctx: {
      storiesById: renderer.buildStoriesById(stories),
      sections,
      campaigns,
    },
  };
};

/** Which pages this pass rebuilds. Chrome and untargeted campaign passes rebuild all. */
const pageFilter = (renderer, job, campaigns) => {
  if (
    job.reason !== "campaign" ||
    !Array.isArray(job.targets) ||
    typeof renderer.pageUsesCampaigns !== "function"
  ) {
    return () => true;
  }
  // Stored records as well, so an edit also reaches the campaign's new placements.
  const ids = new Set(job.targets.map((t) => t.campaignId));
  const refs = [
    ...job.targets,
    ...campaigns.filter((c) => ids.has(String(c?.campaignId || c?.id || ""))).map(campaignRef),
  ];
  return (data, options) => renderer.pageUsesCampaigns(data, refs, options);
};

const lower = (value) =>
  String((Array.isArray(value) ? value[0] : value) ?? "").trim().toLowerCase();

// Same byline matching the admin used when it published author pages itself.
const authorName = (value) =>
  String(typeof value === "string" ? value : value?.name || value?.authorName || value?.fullName || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const bylineAuthorIds = (story, authors) => {
  const byline = Array.isArray(story?.byline) ? story.byline : Array.isArray(story?.byLine) ? story.byLine : [];
  const ids = new Set();

  byline.forEach((entry) => {
    const candidate = authorName(entry);
    if (!candidate) return;
    const exact = authors.find((a) => authorName(a.name) === candidate);
    if (exact) return ids.add(exact.id);

    // A unique author whose name starts with the byline, e.g. "Jane" for "Jane Doe".
    const tokens = candidate.split(" ");
    const prefixed = authors.filter((a) => {
      const own = authorName(a.name).split(" ").filter(Boolean);
      return tokens.length < own.length && tokens.every((t, i) => own[i] === t);
    });
    if (prefixed.length === 1) ids.add(prefixed[0].id);
  });

  return ids;
};

/** Which pages this pass covers, before the campaign filter. */
const passScope = (job, inputs) => {
  const all = () => true;
  const none = () => false;

  if (job.reason === "blog") {
    return { home: false, flat: false, section: none, author: none, story: all };
  }

  if (job.reason === "story") {
    const published = Array.isArray(job.stories) ? job.stories : [];
    const ids = new Set(published.map((s) => s.storyId));
    const sections = new Set(published.map((s) => lower(s.section)));
    const authorIds = new Set(
      inputs.stories
        .filter((s) => ids.has(s?.storyId))
        .flatMap((s) => [...bylineAuthorIds(s, inputs.authors)])
    );
    return {
      home: true,
      flat: false,
      section: (name) => sections.has(lower(name)),
      author: (author) => authorIds.has(author.id),
      story: all, // was: (story) => ids.has(...) || sections.has(...)
    };
}

  return {
    home: job.reason === "campaign" || !!job.includeHome,
    flat: true,
    section: all,
    author: all,
    story: all,
  };
};

const skipUnaffected = (job, key, count = 1) => {
  job.total = Math.max((job.total ?? 0) - count, 0);
  console.log(`[republishAll] skip ${key} (campaign not on this page)`);
};

// A page with no saved layout has nothing to publish: take it out of the total so done reaches total.
const skipNeverBuilt = (job, key) => {
  job.total = Math.max((job.total ?? 0) - 1, 0);
  console.log(`[republishAll] skip ${key} (never built)`);
};

/** Reads a page record and returns its publishable data, or null if unbuilt. */
const loadPage = async (renderer, pageTypeKey) => {
  const { statusCode, body } = await callHandler(getPage, {
    queryStringParameters: { pageType: pageTypeKey },
  });
  if (statusCode !== 200) {
    throw new Error(body?.message || `Failed to load page ${pageTypeKey}`);
  }

  const data = renderer.getPublishableData(body?.data);
  const content = Array.isArray(data?.content) ? data.content : [];
  const zones = data?.zones && typeof data.zones === "object" ? Object.keys(data.zones) : [];
  // getPage returns an empty skeleton for an unbuilt page; publishing it would blank it.
  if (content.length === 0 && zones.length === 0) return null;

  return { pageId: body?.pageId, data };
};

/** Applies Home's chrome, saves the JSON back, and returns the data to render. */
const applyChromeAndPersist = async (renderer, pageTypeKey, page, layout, placements) => {
  const updated = renderer.applyChrome(page.data, layout, placements);

  const { statusCode, body } = await callHandler(autosavePage, {
    method: "PUT",
    body: JSON.stringify({
      pageId: page.pageId,
      pageType: pageTypeKey,
      status: "draft",
      data: { ...updated, publishedSnapshot: updated },
    }),
  });
  if (statusCode !== 200) {
    throw new Error(body?.message || `Failed to save page data for ${pageTypeKey}`);
  }

  return updated;
};

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/**
 * Data to render a page from. A chrome run injects Home's chrome and saves it
 * back; a campaign run renders the stored page as-is and writes nothing.
 */
const preparePageData = async (renderer, job, pageTypeKey, page, placements) => {
  if (job.reason !== "chrome") return page.data;
  return applyChromeAndPersist(renderer, pageTypeKey, page, job.layout, placements);
};

/** Home, rebuilt by the backend. Chrome runs publish it from the editor instead. */
const publishHomePage = async (renderer, job, inputs) => {
  const page = await loadPage(renderer, "Home");
  if (!page) {
    recordFailure(job, "Home", "Home has no saved layout");
    return;
  }
  if (job.reason === "campaign" && !inputs.affects(page.data)) {
    skipUnaffected(job, "Home");
    return;
  }

  const { savePayload } = renderer.renderHomePage(page.data, inputs.ctx);
  await postTo("saveHomeHtml", savePayload);
  job.done += 1;
};

const publishLandingPages = async (renderer, job, inputs, save, deadline) => {
  const outOfTime = () => Date.now() >= deadline;

  // 0. Home — every run but a chrome or blog one, or a chrome pass carrying a queued change.
  if (inputs.scope.home) {
    if (outOfTime()) return false;
    try {
      await publishHomePage(renderer, job, inputs);
    } catch (err) {
      recordFailure(job, "Home", err.message);
    }
  }

  // 1. Flat pages that inherit Home's chrome.
  for (const target of inputs.scope.flat ? renderer.flatPageTargets() : []) {
    if (outOfTime()) return false;
    try {
      const page = await loadPage(renderer, target.pageType);
      if (!page) {
        skipNeverBuilt(job, target.pageType);
        continue;
      }
      if (!inputs.affects(page.data)) {
        skipUnaffected(job, target.pageType);
        continue;
      }
      const updated = await preparePageData(
        renderer,
        job,
        target.pageType,
        page,
        inputs.placements
      );
      const { savePayload } = renderer.renderFlatPage(target.pageType, updated, inputs.ctx);
      await postTo(target.endpoint, savePayload);
      job.done += 1;
      await save(); // keep the progress meter moving
    } catch (err) {
      recordFailure(job, target.pageType, err.message);
    }
  }
  await save();

  // 2. Section landing pages.
  for (const section of inputs.sections.filter(inputs.scope.section)) {
    if (outOfTime()) return false;
    const key = `Section-${section}`;
    try {
      const page = await loadPage(renderer, key);
      if (!page) {
        skipNeverBuilt(job, key);
        continue;
      }
      if (!inputs.affects(page.data)) {
        skipUnaffected(job, key);
        continue;
      }
      const updated = await preparePageData(renderer, job, key, page, inputs.placements);
      const { savePayload } = renderer.renderSectionPage(section, updated, inputs.ctx);
      await postTo("saveSectionHtml", savePayload);
      job.done += 1;
      await save(); // keep the progress meter moving
    } catch (err) {
      recordFailure(job, key, err.message);
    }
  }
  await save();

  // 3. Author pages.
  for (const author of inputs.authors.filter(inputs.scope.author)) {
    if (outOfTime()) return false;
    const key = `Author-${author.id}`;
    try {
      const page = await loadPage(renderer, key);
      if (!page) {
        skipNeverBuilt(job, key);
        continue;
      }
      if (!inputs.affects(page.data)) {
        skipUnaffected(job, key);
        continue;
      }
      const updated = await preparePageData(renderer, job, key, page, inputs.placements);
      const { savePayload } = renderer.renderAuthorPage(author, updated, inputs.ctx);
      await postTo("saveAuthorHtml", savePayload);
      job.done += 1;
      await save(); // keep the progress meter moving
    } catch (err) {
      console.error(`[republishAll] ${key} failed:`, err.stack || err);
      recordFailure(job, key, err.message);
    }
  }
  await save();

  // 4. Blog template. A chrome run persists it, so later ticks re-read it for stories.
  if (outOfTime()) return false;
  try {
    const page = await loadPage(renderer, "Blog");
    if (page) {
      await preparePageData(renderer, job, "Blog", page, inputs.placements);
      if (Array.isArray(job.storyIds) && !inputs.affects(page.data, { storyPage: true })) {
        skipUnaffected(job, `${job.storyIds.length} story page(s)`, job.storyIds.length);
        job.storyIds = [];
      }
    } else {
      recordFailure(job, "Blog", "Blog template has no saved layout; stories were skipped");
    }
  } catch (err) {
    recordFailure(job, "Blog", err.message);
  }

  return true;
};

/** deleteStory marks a deactivated story with status "inactive". */
const isDeactivated = async (storyId) => {
  const [item] = await db
    .select({ status: stories.status })
    .from(stories)
    .where(eq(stories.storyId, storyId))
    .limit(1);
  return item?.status === "inactive";
};

const publishStories = async (renderer, job, inputs, save, deadline) => {
  const blogPage = await loadPage(renderer, "Blog");
  if (!blogPage) {
    // Recorded as a failure during the landing phase; nothing to render from.
    job.cursor = job.storyIds.length;
    await save();
    return;
  }

  const storyById = new Map(
    inputs.stories.filter((s) => s?.storyId).map((s) => [s.storyId, s])
  );
  const published = new Map((job.stories || []).map((s) => [s.storyId, s]));

  while (job.cursor < job.storyIds.length && Date.now() < deadline) {
    const batch = job.storyIds.slice(job.cursor, job.cursor + STORY_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (storyId) => {
        const stored = storyById.get(storyId);
        const override = published.get(storyId);
        if (!stored) {
          if (override && !(await isDeactivated(storyId))) {
            throw new Error("Story is not marked as published");
          }
          // Unpublished or deleted since the job started: nothing to rebuild.
          return;
        }
        // The slug and section the editor published under, which the URL was built from.
        const story = override
          ? {
              ...stored,
              slug: override.slug,
              Section: override.section,
              ...(override.category ? { Category: [override.category] } : {}),
            }
          : stored;
        const { savePayload } = renderer.renderStoryPage(story, blogPage.data, inputs.ctx);
        await postTo("saveHtml", savePayload);
      })
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        recordFailure(job, `story:${batch[index]}`, result.reason?.message || result.reason);
      }
    });

    job.cursor += batch.length;
    job.done += batch.length;
    await save();
  }
};

/** Starts the queued follow-up pass. The finished pass is already in completedPasses. */
const beginAnotherPass = (job) => {
  const reasons = job.queuedReasons || [];
  if (job.queuedLayout) {
    job.reason = "chrome";
    job.layout = job.queuedLayout;
  } else if (reasons.length === 1) {
    job.reason = reasons[0];
  } else if (reasons.length > 1) {
    // Different kinds of change queued together: an untargeted campaign pass covers them all.
    job.reason = "campaign";
  }
  job.includeHome =
    job.reason === "chrome" && (reasons.includes("campaign") || reasons.includes("story"));
  job.includeSitemaps = reasons.includes("blog");
  job.targets =
    job.reason === "campaign" && reasons.length === 1 && !job.queuedAllPages && job.queuedTargets?.length
      ? job.queuedTargets
      : null;
  job.stories = job.queuedStories || [];
  job.queuedTargets = [];
  job.queuedAllPages = false;
  job.queuedStories = [];
  job.pass = (job.pass ?? 1) + 1;
  job.passRequesters = job.queuedRequesters || [];
  job.queuedRequesters = [];
  job.queuedReasons = [];
  job.queuedLayout = null;
  job.failed = [];
  job.failedCount = 0;
  job.error = null;
  job.rerunRequested = false;
  job.status = "running";
  job.phase = "landing";
  job.cursor = 0;
  job.done = 0;
  job.storyIds = null;
  job.finishedAt = null;
  job.progressMarker = null;
  job.stalledTicks = 0;
};

const processTick = async (job, save, deadline) => {
  const renderer = await loadRenderer(job);
  const inputs = await loadInputs(renderer);
  inputs.affects = pageFilter(renderer, job, inputs.campaigns);
  inputs.scope = passScope(job, inputs);

  // Only a chrome run carries a layout, and only a chrome run applies one.
  if (job.reason === "chrome" && !renderer.isUsableChromeLayout(job.layout)) {
    throw new Error("Job carries an unusable Home chrome layout");
  }

  if (job.phase === "landing") {
    const storyIds = new Set(
      inputs.stories.filter((s) => s?.storyId && inputs.scope.story(s)).map((s) => s.storyId)
    );
    // Published stories that are missing are reported by the stories phase.
    // Deactivated stories only trigger the pass; they have no page to rebuild.
    (job.stories || []).filter((s) => !s.deactivated).forEach((s) => storyIds.add(s.storyId));
    job.storyIds = [...storyIds];
    job.total = (inputs.scope.flat ? renderer.flatPageTargets().length : 0) +
      inputs.sections.filter(inputs.scope.section).length +
      inputs.authors.filter(inputs.scope.author).length +
      job.storyIds.length +
      (inputs.scope.home ? 1 : 0) +
      (job.includeSitemaps ? 1 : 0);
    await save();

    const finished = await publishLandingPages(renderer, job, inputs, save, deadline);
    if (!finished) return; // resume this phase on the next tick

    job.phase = "stories";
    job.cursor = 0;
    await save();
  }

  if (job.phase === "stories") {
    if (!Array.isArray(job.storyIds)) job.storyIds = [];
    await publishStories(renderer, job, inputs, save, deadline);
    if (job.cursor < job.storyIds.length) return; // more next tick
  }

  if (job.includeSitemaps) {
    for (const [name, handler] of [["sitemap.xml", saveSiteMap], ["news-sitemap.xml", saveNewsSiteMap]]) {
      try {
        const { statusCode, body } = await callHandler(handler, { method: "POST" });
        if (statusCode < 200 || statusCode >= 300) throw new Error(body?.message || `HTTP ${statusCode}`);
      } catch (err) {
        recordFailure(job, name, err.message);
      }
    }
    job.done += 1;
  }

  job.phase = "done";
  job.status = job.failedCount > 0 ? "completed_with_errors" : "completed";
  job.finishedAt = new Date().toISOString();
  recordCompletedPass(job);
  // Drop the working state; the status route reads this record on every poll.
  job.leaseUntil = null;
  job.storyIds = null;
  await save();

  console.log(
    `[republishAll] job ${job.jobId} ${job.status}: ${job.done} page(s), ${job.failedCount} failure(s)`
  );
};

/**
 * One tick's worth of republishing. Safe to call on every invocation.
 * `dedicated` marks an invocation that exists only to run this worker.
 */
export const runRepublishAllWorker = async (context, { dedicated = false } = {}) => {
  try {
    const budgetMs = context?.getRemainingTimeInMillis?.() ?? DEFAULT_BUDGET_MS;
    const deadline = Date.now() + budgetMs - SAFETY_MS;

    let { job, etag } = await readJob();
    if (!job || !isActiveJob(job)) return;

    if (budgetMs < MIN_TICK_MS) {
      // On a dedicated invocation this is as much time as the job will ever
      // get, so it is a dead end rather than something to retry.
      if (!dedicated) {
        console.log("[republishAll] skipping tick: not enough time left in this invocation");
        return;
      }
      job.status = "failed";
      job.error = "The publishing function's timeout is too short to publish anything.";
      job.finishedAt = new Date().toISOString();
      recordCompletedPass(job);
      job.leaseUntil = null;
      job.updatedAt = job.finishedAt;
      try {
        await writeJob(job, etag);
      } catch (err) {
        if (!(err instanceof JobConflictError)) throw err;
      }
      console.error(`[republishAll] job ${job.jobId} failed: function timeout too short`);
      return;
    }

    if (job.leaseUntil && Date.parse(job.leaseUntil) > Date.now()) {
      console.log(`[republishAll] job ${job.jobId} is leased by another run; skipping`);
      return;
    }

    // No progress since the last tick means this tick cannot make any either.
    // `done` is part of it because the landing phase leaves `cursor` at 0.
    const marker = `${job.phase}:${job.cursor}:${job.done}`;
    job.stalledTicks = job.progressMarker === marker ? (job.stalledTicks || 0) + 1 : 0;
    job.progressMarker = marker;

    if (job.stalledTicks >= MAX_STALLED_TICKS) {
      job.status = "failed";
      job.error =
        "Publishing made no progress across several runs; the Lambda timeout is likely too short for one batch.";
      job.finishedAt = new Date().toISOString();
      recordCompletedPass(job);
      job.leaseUntil = null;
      job.updatedAt = new Date().toISOString();
      try {
        await writeJob(job, etag);
      } catch (err) {
        if (!(err instanceof JobConflictError)) throw err;
      }
      console.error(`[republishAll] job ${job.jobId} failed: stalled`);
      return;
    }

    job.status = "running";
    job.startedAt = job.startedAt || new Date().toISOString();
    job.leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
    job.updatedAt = new Date().toISOString();

    try {
      etag = await writeJob(job, etag);
    } catch (err) {
      if (err instanceof JobConflictError) {
        console.log("[republishAll] another run claimed the job first; skipping");
        return;
      }
      throw err;
    }

    const save = async () => {
      const now = Date.now();
      job.updatedAt = new Date(now).toISOString();
      // Renew while work is in progress; the tail below clears it.
      if (job.phase !== "done") job.leaseUntil = new Date(now + LEASE_MS).toISOString();
      try {
        etag = await writeJob(job, etag);
      } catch (err) {
        if (!(err instanceof JobConflictError)) throw err;
        // A publish request queued a follow-up meanwhile: keep it and retry.
        const latest = await readJob();
        if (latest.job?.jobId !== job.jobId) throw err;
        if (latest.job.rerunRequested) {
          job.rerunRequested = true;
          job.queuedRequesters = latest.job.queuedRequesters || [];
          job.queuedReasons = latest.job.queuedReasons || [];
          job.queuedLayout = latest.job.queuedLayout ?? null;
          job.queuedTargets = latest.job.queuedTargets || [];
          job.queuedAllPages = !!latest.job.queuedAllPages;
          job.queuedStories = latest.job.queuedStories || [];
        }
        etag = await writeJob(job, latest.etag);
      }
    };

    try {
      await processTick(job, save, deadline);

      // A change refused a job of its own while this ran flagged this one instead.
      // processTick re-reads its inputs, so the repeat pass publishes current data.
      // Only once the current pass is finished; otherwise it would be thrown away.
      while (job.phase === "done" && job.rerunRequested && job.status !== "failed") {
        beginAnotherPass(job);
        await save();

        if (Date.now() >= deadline) {
          // Out of time: the tail below hands the repeat pass to the next tick.
          console.log(`[republishAll] job ${job.jobId} repeat pass deferred to the next tick`);
          break;
        }

        console.log(`[republishAll] job ${job.jobId} repeating with fresh data`);
        await processTick(job, save, deadline);
      }
    } catch (err) {
      console.error(`[republishAll] job ${job.jobId} failed:`, err);
      job.status = "failed";
      job.error = String(err?.message || err).slice(0, 500);
      job.finishedAt = new Date().toISOString();
      recordCompletedPass(job);
      job.leaseUntil = null;
      try {
        await save();
      } catch (saveErr) {
        console.error("[republishAll] could not record failure:", saveErr);
      }
      return;
    }

    if (job.phase !== "done") {
      // Release the lease so the next tick can pick the job straight up.
      job.leaseUntil = null;
      try {
        await save();
      } catch (err) {
        if (!(err instanceof JobConflictError)) throw err;
      }

      console.log(
        `[republishAll] job ${job.jobId} out of time at ${job.phase}:${job.cursor}; ` +
          `${job.done} of ${job.total ?? "?"} done`
      );
    }
  } catch (err) {
    // Never propagate: this may share its invocation with other work.
    console.error("[republishAll] worker error:", err);
  }
};
