// src/utils/storiesCache.ts
// Shared, module-level cache for the Kanban dashboard stories list.
// Kept in sync with writes (create / drag-drop / delete) so the dashboard
// never re-seeds the Kanban with stale data when the user re-enters the view.

/**
 * How long a cached entry is considered fresh, in milliseconds.
 * After this window, `getStoriesCache` treats the entry as expired and
 * forces a refetch on the next read.
 */
export const STORIES_CACHE_DURATION_MS = 30_000;

interface CacheEntry {
  data: any[];
  timestamp: number;
}

/**
 * Module-level Map keyed by `${role}-${userId}-${activeView}` (set by the
 * dashboard). Lives for the lifetime of the JS context, so it survives
 * route changes but is wiped on a hard page reload.
 */
const storiesCache = new Map<string, CacheEntry>();

/**
 * Read a cached stories list by key.
 *
 * - Returns `undefined` if no entry exists.
 * - Returns `undefined` (and removes the entry) if the entry is older than
 *   `STORIES_CACHE_DURATION_MS`, so callers always see fresh-enough data.
 * - Otherwise returns the `{ data, timestamp }` entry as-is.
 *
 * Used by the dashboard's initial-fetch effect to skip the network call
 * when a recent list is already available.
 */
export const getStoriesCache = (key: string): CacheEntry | undefined => {
  const entry = storiesCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp >= STORIES_CACHE_DURATION_MS) {
    storiesCache.delete(key);
    return undefined;
  }
  return entry;
};

/**
 * Write (or overwrite) a cached stories list for `key` and stamp it with
 * the current time. Called by the dashboard right after a successful
 * `fetchStories` response so subsequent mounts within the TTL can skip
 * the network.
 */
export const setStoriesCache = (key: string, data: any[]): void => {
  storiesCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Clear every cached entry.
 *
 * Used when the next read must hit the backend for sure — e.g. after
 * creating a brand-new story, where we can't reliably guess the final
 * server-side shape of the record. Forces the dashboard's next fetch to
 * be authoritative.
 */
export const invalidateStoriesCache = (): void => {
  storiesCache.clear();
};

/**
 * Insert or update a single story across every cached entry.
 *
 * - If a story with the same `storyId` exists in a cache entry, its fields
 *   are merged (shallow) with the new values.
 * - If it doesn't exist, the new story is prepended.
 * - Each updated entry keeps its original `timestamp`, so we don't
 *   accidentally extend its TTL just because we patched one record.
 *
 * Used after a successful drag-drop PUT and after editing an existing
 * story so the cache stays consistent with the optimistic `setStories`
 * update and the Kanban never "snaps back" on re-mount.
 */
export const upsertStoryInCache = (story: any): void => {
  if (!story?.storyId) return;
  storiesCache.forEach((entry, key) => {
    const idx = entry.data.findIndex((s: any) => s.storyId === story.storyId);
    let nextData: any[];
    if (idx >= 0) {
      nextData = entry.data.slice();
      nextData[idx] = { ...nextData[idx], ...story };
    } else {
      nextData = [story, ...entry.data];
    }
    storiesCache.set(key, { data: nextData, timestamp: entry.timestamp });
  });
};

/**
 * Remove a story from every cached entry by `storyId`.
 *
 * Mirrors the `setStories(prev => prev.filter(...))` call in the delete
 * flow so the deleted card can't be resurrected when the dashboard
 * re-seeds `stories` from the cache on the next mount. Skips entries
 * that don't contain the id (preserves their `timestamp`).
 */
export const removeStoryFromCache = (storyId: string): void => {
  if (!storyId) return;
  storiesCache.forEach((entry, key) => {
    const nextData = entry.data.filter((s: any) => s.storyId !== storyId);
    if (nextData.length !== entry.data.length) {
      storiesCache.set(key, { data: nextData, timestamp: entry.timestamp });
    }
  });
};
