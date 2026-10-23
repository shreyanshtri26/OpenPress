// Client for the backend's site-wide republish job.
//
// When Home's shared chrome (navbar, footer, adjacent leaderboard) changes,
// every other page has to be rebuilt. That used to run in this tab, one fetch
// per page, for as long as it took. Now the editor makes a single request and
// the backend republishes on its own schedule, so the admin can close the tab.
//
// This module owns the three interactions the editor needs: start a job, read
// its state, and remember that its failures were already shown.

import { getToken } from '../../utils/auth';
import type { HomeChromeLayout } from '../../publish/homeChrome';

export type RepublishFailure = { page: string; reason: string };

export type RepublishJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

/** What a pass is publishing: Home's chrome, a campaign change, a story, or the Blog template. */
export type RepublishReason = 'chrome' | 'campaign' | 'story' | 'blog';

export type RepublishPassResult = {
  pass: number;
  reason?: RepublishReason;
  status: RepublishJobStatus;
  total: number | null;
  done: number;
  failedCount: number;
  failed: RepublishFailure[];
  error?: string | null;
  finishedAt?: string;
};

export type RepublishJob = {
  jobId: string;
  status: RepublishJobStatus;
  reason?: RepublishReason;
  /** Signed-in admin requested the current pass or a queued follow-up. */
  isMine: boolean;
  inCurrentPass?: boolean;
  /** This admin's change waits for the current pass to finish. */
  queuedByMe?: boolean;
  pass?: number;
  /** Finished passes this admin requested, for completion toasts. */
  myCompletedPasses?: RepublishPassResult[];
  /** Still pending or running, and not stale. Polling stops when false. */
  isActive: boolean;
  phase?: string;
  total: number | null;
  done: number;
  failedCount: number;
  failed: RepublishFailure[];
  failedTruncated?: boolean;
  error?: string | null;
  requestedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string | null;
};

export type StartRepublishResult =
  | { outcome: 'started'; job: RepublishJob | null }
  | { outcome: 'queued'; job: RepublishJob | null }
  | { outcome: 'error'; message?: string };

const SEEN_KEY_PREFIX = 'pagestudio:republish-all-seen:';

const endpoint = (path: string): string =>
  `${import.meta.env.VITE_BACKEND_API}/pagestudio/republishAll${path}`;

/** Home's new chrome, or the Blog template every story page is rebuilt from. */
export type RepublishRequest =
  | { layout: HomeChromeLayout }
  | { reason: 'blog'; blogData: unknown };

/**
 * Asks the backend to republish the pages a change affects.
 * The backend publishes inside this request and keeps going after we stop
 * listening, so the response is only waited on long enough to catch an early
 * rejection. Progress comes from the status endpoint.
 */
export const startRepublishAll = async (
  request: RepublishRequest
): Promise<StartRepublishResult> => {
  const token = getToken();
  if (!token) return { outcome: 'error', message: 'Not signed in' };

  // A 409 without a queued follow-up means the running job finished meanwhile; try once more.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await postRepublishAll(token, request);
    if (result === 'retry') continue;
    if (result.outcome === 'error') return result;

    const job = await fetchRepublishJob();
    return job?.queuedByMe ? { outcome: 'queued', job } : { outcome: 'started', job };
  }
  return { outcome: 'error', message: 'A site-wide publish just finished. Publish again.' };
};

const postRepublishAll = async (
  token: string,
  change: RepublishRequest
): Promise<{ outcome: 'sent' } | { outcome: 'error'; message?: string } | 'retry'> => {
  // Wait long enough for a rejection to answer, then stop waiting without cancelling:
  // the request stays open while the backend publishes.
  let giveUpListening: number | undefined;
  const stopWaiting = new Promise<'waiting'>((resolve) => {
    giveUpListening = window.setTimeout(() => resolve('waiting'), 1500);
  });

  const request = fetch(endpoint(''), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...change,
      // The backend loads the published-page renderer bundle from this
      // origin, and only accepts it if it is an allowed https origin. On
      // localhost it is neither, so it is left out and the backend falls
      // back to its own allow-list (i.e. the deployed Page Studio site).
      rendererOrigin:
        window.location.protocol === 'https:' ? window.location.origin : undefined,
    }),
  });

  try {
    const res = await Promise.race([request, stopWaiting]);
    if (res === 'waiting') {
      request.catch(() => {});
      return { outcome: 'sent' };
    }

    const body = await res.json().catch(() => null);

    if (res.ok && body?.jobId) return { outcome: 'sent' };
    if (res.status === 409) return body?.followUpQueued ? { outcome: 'sent' } : 'retry';
    return { outcome: 'error', message: body?.message };
  } catch (e) {
    console.error('[republish-all] failed to start:', e);
    return { outcome: 'error' };
  } finally {
    window.clearTimeout(giveUpListening);
  }
};

// Last job read, kept across editor remounts so the publish lock shows at once.
let lastKnownJob: RepublishJob | null = null;
let statusRead = false;

/** True once the job status has been read in this tab. */
export const hasReadRepublishStatus = (): boolean => statusRead;

export const getLastKnownRepublishJob = (): RepublishJob | null => lastKnownJob;

/** Current job, or null when there is none. `known` is false when it could not be read. */
export const checkRepublishJob = async (): Promise<{ known: boolean; job: RepublishJob | null }> => {
  const token = getToken();
  if (!token) return { known: false, job: null };

  try {
    const res = await fetch(endpoint('/status'), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return { known: false, job: null };
    const body = await res.json();
    lastKnownJob = (body?.job as RepublishJob) ?? null;
    statusRead = true;
    return { known: true, job: lastKnownJob };
  } catch (e) {
    console.warn('[republish-all] failed to read status:', e);
    return { known: false, job: null };
  }
};

/** Current job, or null when the backend has never run one. */
export const fetchRepublishJob = async (): Promise<RepublishJob | null> =>
  (await checkRepublishJob()).job;

export const hasSeenRepublishToast = (key: string): boolean => {
  try {
    return window.localStorage.getItem(`${SEEN_KEY_PREFIX}${key}`) === '1';
  } catch {
    // Storage blocked: showing a toast twice beats never showing it.
    return false;
  }
};

export const markRepublishToastSeen = (key: string): void => {
  try {
    window.localStorage.setItem(`${SEEN_KEY_PREFIX}${key}`, '1');
  } catch {
    // Ignore storage errors.
  }
};
