// Shared state for the site-wide republish job: one JSON object in the website
// bucket. Concurrency is handled with S3 conditional writes.

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { createS3Client } from '../../lib/storage.mjs';

const s3Client = createS3Client({ region: process.env.AWS_OpenPress_REGION });

const BUCKET_NAME = process.env.S3_WEBSITE_BUCKET_NAME;
export const JOB_KEY = "_jobs/republish-all.json";

/** Statuses that mean "this job still has work to do". */
const ACTIVE_STATUSES = new Set(["pending", "running"]);

/** Untouched for this long means a dead worker; the job stops blocking new ones. */
export const STALE_MS = 30 * 60 * 1000;

/** At most this many failure details are kept; `failedCount` stays exact. */
export const MAX_FAILED_DETAILS = 100;

export class JobConflictError extends Error {
  constructor(message = "Job record changed concurrently") {
    super(message);
    this.name = "JobConflictError";
  }
}

const isConflict = (err) =>
  err?.name === "PreconditionFailed" ||
  err?.name === "ConditionalRequestConflict" ||
  err?.Code === "PreconditionFailed" ||
  err?.$metadata?.httpStatusCode === 412 ||
  err?.$metadata?.httpStatusCode === 409;

const isMissing = (err) =>
  err?.name === "NoSuchKey" ||
  err?.Code === "NoSuchKey" ||
  err?.$metadata?.httpStatusCode === 404;

/** Reads the job record. Returns `{ job: null, etag: null }` when there is none. */
export const readJob = async () => {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: JOB_KEY })
    );
    const body = await res.Body.transformToString();
    return { job: JSON.parse(body), etag: res.ETag };
  } catch (err) {
    if (isMissing(err)) return { job: null, etag: null };
    throw err;
  }
};

/** Writes the job record. Pass the read ETag, or null to create. Throws on conflict. */
export const writeJob = async (job, etag) => {
  const condition = etag ? { IfMatch: etag } : { IfNoneMatch: "*" };

  try {
    const res = await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: JOB_KEY,
        Body: JSON.stringify(job),
        ContentType: "application/json; charset=utf-8",
        CacheControl: "no-store, no-cache, must-revalidate, max-age=0",
        ...condition,
      })
    );
    return res.ETag;
  } catch (err) {
    if (isConflict(err)) throw new JobConflictError();
    throw err;
  }
};

export const isStaleJob = (job, now = Date.now()) => {
  if (!job?.updatedAt) return false;
  const updatedAt = Date.parse(job.updatedAt);
  if (Number.isNaN(updatedAt)) return false;
  return now - updatedAt > STALE_MS;
};

/** Pending or running, and still alive. */
export const isActiveJob = (job, now = Date.now()) =>
  !!job && ACTIVE_STATUSES.has(job.status) && !isStaleJob(job, now);

// `chrome` injects Home's chrome and rewrites each page's JSON; `campaign`
// re-renders pages as stored (plus Home) to pick up new campaign data; `story`
// publishes stories and the pages listing them; `blog` rebuilds every story
// from the Blog template.
export const JOB_REASONS = new Set(["chrome", "campaign", "story", "blog"]);

const text = (value) => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
};

/** A story to publish, as sent by the editor; null when unusable. */
export const parseStory = (story) => {
  const parsed = {
    storyId: text(story?.storyId),
    slug: text(story?.slug),
    section: text(story?.section),
    category: text(story?.category),
    ...(story?.deactivated === true ? { deactivated: true } : {}),
  };
  return parsed.storyId && parsed.slug && parsed.section ? parsed : null;
};

/** Newest entry per story wins. */
export const mergeStories = (a, b) => {
  const byId = new Map();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((s) => byId.set(s.storyId, s));
  return [...byId.values()];
};

const MAX_TARGETS = 50;

const strings = (list) =>
  (Array.isArray(list) ? list : []).filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim());

/** Where a campaign can appear, from a stored campaign or a client snapshot of one. */
export const campaignRef = (campaign) => {
  const jobs = Array.isArray(campaign?.jobs) ? campaign.jobs : [];
  const spotlight = (job) =>
    [job?.spotlightMobileImages, job?.spotlight_mobile_images, job?.creatives?.spotlightMobileImages]
      .some((imgs) => Array.isArray(imgs) && imgs.some(Boolean));

  return {
    campaignId: String(campaign?.campaignId || campaign?.id || ""),
    placements: [...new Set([...strings(campaign?.placements), ...strings(jobs.map((j) => j?.placement)), ...strings([campaign?.type])])],
    formats: [...new Set([
      ...strings(jobs.map((j) => j?.adFormat || j?.ad_format)),
      ...(jobs.some(spotlight) ? ["spotlight"] : []),
    ])],
  };
};

/** Campaign snapshots from a request; null means every page. */
export const parseTargets = (list) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const refs = list.slice(0, MAX_TARGETS).map(campaignRef).filter((ref) => ref.campaignId);
  return refs.length ? refs : null;
};

export const mergeTargets = (a, b) => [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].slice(-MAX_TARGETS * 2);

/** At most this many finished passes are kept for notifications. */
const MAX_COMPLETED_PASSES = 10;
const MAX_PASS_FAILED_DETAILS = 20;

const sameRequester = (a, b) =>
  !!a && !!b && (a.userId && b.userId ? a.userId === b.userId : !!a.email && a.email === b.email);

export const addRequester = (list, requester) => {
  const current = Array.isArray(list) ? list : [];
  if (!requester || current.some((r) => sameRequester(r, requester))) return current;
  return [...current, requester];
};

/** Keeps a finished pass so its requesters are notified even after a follow-up starts. */
export const recordCompletedPass = (job) => {
  const entry = {
    pass: job.pass ?? 1,
    reason: job.reason || "chrome",
    status: job.status,
    total: job.total ?? null,
    done: job.done ?? 0,
    failedCount: job.failedCount ?? 0,
    failed: (job.failed || []).slice(0, MAX_PASS_FAILED_DETAILS),
    error: job.error || null,
    finishedAt: job.finishedAt || new Date().toISOString(),
    requesters: job.passRequesters || [],
  };
  job.completedPasses = [...(job.completedPasses || []), entry].slice(-MAX_COMPLETED_PASSES);
};

export const createJob = ({ requestedBy, requestedByUserId, layout, rendererOrigin, reason, targets = null, stories = [] }) => {
  const now = new Date().toISOString();
  return {
    jobId: randomUUID(),
    status: "pending",
    reason: JOB_REASONS.has(reason) ? reason : "chrome",
    pass: 1,
    passRequesters: addRequester([], { userId: requestedByUserId || null, email: requestedBy || null }),
    // Follow-up pass requested while this one runs; newest chrome layout wins.
    rerunRequested: false,
    queuedRequesters: [],
    queuedReasons: [],
    queuedLayout: null,
    /** Campaigns a campaign pass is limited to; null means every page. */
    targets: reason === "campaign" ? targets : null,
    queuedTargets: [],
    queuedAllPages: false,
    /** Stories published by editors; their slug and section win over the stored story. */
    stories,
    queuedStories: [],
    includeHome: false,
    includeSitemaps: reason === "blog",
    completedPasses: [],
    // 'landing' -> 'stories' -> 'done'.
    phase: "landing",
    cursor: 0,
    total: null,
    done: 0,
    failedCount: 0,
    failed: [],
    /** Home's chrome, resolved in the browser where the placements registry lives. */
    layout,
    /** Origin the worker loads the published-page renderer bundle from. */
    rendererOrigin: rendererOrigin || null,
    /** Captured on the first tick so a later tick's cursor still lines up. */
    storyIds: null,
    requestedBy: requestedBy || null,
    requestedByUserId: requestedByUserId || null,
    error: null,
    /** Held by the tick currently working the job, to stop ticks overlapping. */
    leaseUntil: null,
    /** Guards against a tick that can never make progress (see the worker). */
    progressMarker: null,
    stalledTicks: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
};

/** The job as the editor may see it. A stale active job is reported as failed. */
export const publicJob = (job, user) => {
  if (!job) return null;

  const stale = isStaleJob(job) && ACTIVE_STATUSES.has(job.status);
  const requestedByUserId = job.requestedByUserId || null;
  const requestedBy = job.requestedBy || null;
  const me = { userId: user?.userId || user?.id || null, email: user?.email || null };
  const includesMe = (list) => Array.isArray(list) && list.some((r) => sameRequester(r, me));

  const inCurrentPass = Array.isArray(job.passRequesters)
    ? includesMe(job.passRequesters)
    : requestedByUserId
      ? requestedByUserId === me.userId
      : !!requestedBy && requestedBy === me.email;
  const queuedByMe = !!job.rerunRequested && includesMe(job.queuedRequesters);

  const myCompletedPasses = (job.completedPasses || [])
    .filter((entry) => includesMe(entry.requesters))
    .map(({ requesters, ...entry }) => entry);
  if (stale && inCurrentPass) {
    myCompletedPasses.push({
      pass: job.pass ?? 1,
      reason: job.reason || "chrome",
      status: "failed",
      total: job.total ?? null,
      done: job.done ?? 0,
      failedCount: job.failedCount ?? 0,
      failed: (job.failed || []).slice(0, MAX_PASS_FAILED_DETAILS),
      error: job.error || "Publishing stopped responding and was abandoned.",
      finishedAt: job.updatedAt,
    });
  }

  return {
    jobId: job.jobId,
    status: stale ? "failed" : job.status,
    // Lets a blocked editor say which kind of run is holding the lock.
    reason: job.reason || "chrome",
    isMine: inCurrentPass || queuedByMe,
    inCurrentPass,
    queuedByMe,
    pass: job.pass ?? 1,
    myCompletedPasses,
    isActive: isActiveJob(job),
    phase: job.phase,
    total: job.total ?? null,
    done: job.done ?? 0,
    failedCount: job.failedCount ?? 0,
    failed: Array.isArray(job.failed) ? job.failed : [],
    failedTruncated: (job.failedCount ?? 0) > (job.failed?.length ?? 0),
    error: stale
      ? job.error || "Publishing stopped responding and was abandoned."
      : job.error || null,
    requestedBy,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt || null,
  };
};

/** Records a per-page failure without letting the record grow without bound. */
export const recordFailure = (job, page, reason) => {
  job.failedCount = (job.failedCount ?? 0) + 1;
  if (!Array.isArray(job.failed)) job.failed = [];
  if (job.failed.length < MAX_FAILED_DETAILS) {
    job.failed.push({ page, reason: String(reason || "Unknown error").slice(0, 300) });
  }
};
