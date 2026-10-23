import type { PageStudioData, PageType } from './builderConfig';
import { getPublishableData, getInitialDataForPage } from './builderConfig';
import { getPlacements, initializePlacements } from './campaignData';
import { getToken } from '../../utils/auth';
import { renderHomePageFromPuckJSON } from '../../helpers/renderHomePageFromPuckJSON';
import { renderAuthorPageFromPuckJSON } from '../../helpers/renderAuthorPageFromPuckJSON';
import { renderPageFromPuckJSON as renderBlogPageFromPuckJSON } from '../../helpers/blog/renderBlogPage';
import { buildStoryOverride } from './storyOverride';
import { getAuthors } from './authorData';
// The chrome logic itself lives in src/publish/homeChrome.ts, free of editor
// and network imports, because the backend republish-all worker runs the same
// functions in Node out of the published-page renderer bundle. It takes the
// placements registry as an argument; this module supplies the editor's.
import {
  applyHomeChromeLayout,
  extractHomeChromeLayout,
  getHomeChromeSignature,
  hashSignature,
  layoutsEqual,
  needsPlacementsRegistry,
  type HomeChromeLayout,
} from '../../publish/homeChrome';
import { FLAT_PAGE_TARGETS } from '../../publish/publishContext';

// v2: the signature format changed (canonicalized, key-order independent), so
// the key is bumped rather than compared against v1 values — a stale-format
// mismatch would otherwise force one bogus site-wide republish per browser.
const HOME_CHROME_SIGNATURE_KEY = 'pagestudio:home-shared-chrome-signature:v2';
const HOME_CHROME_SIGNATURE_PAGE_TYPE = 'HomeChromeSignatureV2';
// The chrome as last propagated to the other pages' stored data. Separate from
// the published signature above: this one tracks editor-data sync, that one
// tracks published HTML.
const HOME_CHROME_SYNCED_KEY = 'pagestudio:home-shared-chrome-synced:v1';

const readSyncedSignature = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(HOME_CHROME_SYNCED_KEY);
  } catch {
    return null;
  }
};

const writeSyncedSignature = (signature: string | null): void => {
  if (typeof window === 'undefined' || signature === null) return;
  try {
    window.localStorage.setItem(HOME_CHROME_SYNCED_KEY, signature);
  } catch {
    // Ignore storage errors; the sync itself already succeeded.
  }
};

const PAGE_TYPES_TO_SYNC: PageType[] = [
  ...(FLAT_PAGE_TARGETS.map((t) => t.pageType as PageType)),
  'Blog' as PageType,
];

// `getPlacements()` reads a module-level registry that a hard refresh empties
// and `initializePlacements()` refills asynchronously. Until it is populated,
// every dynamic `Ad_*` block looks like "not a leaderboard", which silently
// changes the extracted chrome layout and its signature. Callers that compare
// or propagate layouts must therefore wait for it, and bail out entirely if it
// never arrives, rather than acting on a layout they cannot resolve.
const ensurePlacementsResolvable = async (
  data: PageStudioData
): Promise<boolean> => {
  if (!needsPlacementsRegistry(data)) return true;

  if (getPlacements().length === 0) {
    try {
      await initializePlacements();
    } catch {
      /* fall through to the emptiness check below */
    }
  }
  return getPlacements().length > 0;
};

const fetchPageRecord = async (
  pageType: PageType
): Promise<{ pageId?: string; data: PageStudioData | null } | null> => {
  const token = getToken();
  if (!token) return null;
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/pagestudio/page?pageType=${encodeURIComponent(pageType)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data =
      json?.data && typeof json.data === 'object' && Object.keys(json.data).length > 0
        ? (json.data as PageStudioData)
        : null;
    return { pageId: json?.pageId, data };
  } catch {
    return null;
  }
};

const saveAutosave = async (
  pageType: PageType,
  pageId: string | undefined,
  data: PageStudioData & { publishedSnapshot?: PageStudioData }
): Promise<void> => {
  const token = getToken();
  if (!token) return;
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/pagestudio/autosave`;
  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pageId, data, status: 'draft', pageType }),
    });
  } catch (e) {
    console.warn(`Failed to sync navbar leaderboard to ${pageType}:`, e);
  }
};

// Backend stores parameterized pages under pageType strings like
// `Section-<sectionName>` and `Author-<authorId>`. We need to fetch by that
// exact key and write back to the same key.
const fetchPageRecordByKey = async (
  pageTypeKey: string
): Promise<{ pageId?: string; data: PageStudioData | null } | null> => {
  const token = getToken();
  if (!token) return null;
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/pagestudio/page?pageType=${encodeURIComponent(pageTypeKey)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data =
      json?.data && typeof json.data === 'object' && Object.keys(json.data).length > 0
        ? (json.data as PageStudioData)
        : null;
    return { pageId: json?.pageId, data };
  } catch {
    return null;
  }
};

const saveAutosaveByKey = async (
  pageTypeKey: string,
  pageId: string | undefined,
  data: PageStudioData & { publishedSnapshot?: PageStudioData }
): Promise<void> => {
  const token = getToken();
  if (!token) return;
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/pagestudio/autosave`;
  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pageId, data, status: 'draft', pageType: pageTypeKey }),
    });
  } catch (e) {
    console.warn(`Failed to sync navbar leaderboard to ${pageTypeKey}:`, e);
  }
};


/**
 * On Home publish, propagate Home's shared chrome (navbar, footer, and any
 * leaderboard placement card immediately above/below the navbar) to every
 * saved target page.
 */
export const syncNavbarLeaderboardFromHome = async (
  homeData: PageStudioData
): Promise<void> => {
  if (!homeData) return;
  // Never propagate a layout derived from an unresolved placements registry —
  // it would read as "no leaderboard next to the navbar" and strip a real one
  // from every other page.
  if (!(await ensurePlacementsResolvable(homeData))) return;
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return;

  // Reading all ten target pages back just to discover they are already in
  // sync costs ten round trips, and this runs on every Home autosave — which
  // Puck fires once on mount, so merely opening or refreshing Home paid for
  // it. If the chrome is identical to what was last propagated, the targets
  // cannot have drifted from it, so there is nothing to look at.
  const signature = getHomeChromeSignature(homeData, placements);
  if (signature !== null && signature === readSyncedSignature()) return;

  await Promise.all(
    PAGE_TYPES_TO_SYNC.map(async (pageType) => {
      const record = await fetchPageRecord(pageType);
      const pageData =
        record?.data && Array.isArray(record.data.content) && record.data.content.length > 0
          ? record.data
          : getInitialDataForPage(pageType);
      const currentLayout = extractHomeChromeLayout(pageData, placements);
      if (currentLayout && layoutsEqual(currentLayout, layout)) return; // already in sync
      const updated = applyHomeChromeLayout(pageData, layout, placements);
      await saveAutosave(pageType, record?.pageId, updated);
    })
  );

  writeSyncedSignature(signature);
};

/**
 * Compare Home's shared chrome layout with the last published snapshot.
 * Returns true when the navbar/footer or the leaderboard placement next to
 * the navbar changed.
 */
/**
 * Returns true if Home's shared chrome layout differs from the last published
 * snapshot stored locally. We intentionally avoid comparing against the saved
 * Home record because autosave updates that record before Publish runs.
 *
 * `extraKeys` lets callers also include parameterized page keys like
 * `Section-<name>`, `Author-<id>`, or `Blog` in the comparison.
 */
export const hasHomeNavbarLeaderboardChanged = async (
  homeData: PageStudioData,
  _extraKeys: string[] = []
): Promise<boolean> => {
  // A layout read before the placements registry loads is not comparable —
  // treat it as unchanged rather than cascading a republish across the site.
  if (!(await ensurePlacementsResolvable(homeData))) {
    console.warn(
      '[navbar-leaderboard sync] placements registry unavailable; skipping bulk republish'
    );
    return false;
  }

  const signature = getHomeChromeSignature(homeData, getPlacements());
  if (signature === null) return false;

  // 1. Try to fetch the last published signature from the server. Only a short
  //    digest is stored, not the raw signature: it shares a `title` field with
  //    ordinary page records, which is no place for multi-kilobyte JSON.
  try {
    const record = await fetchPageRecordByKey(HOME_CHROME_SIGNATURE_PAGE_TYPE);
    if (record?.data?.root?.props?.title) {
      return record.data.root.props.title !== hashSignature(signature);
    }
  } catch (e) {
    console.warn('Failed to fetch HomeChromeSignature from server, falling back to localStorage:', e);
  }

  // 2. Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const previous = window.localStorage.getItem(HOME_CHROME_SIGNATURE_KEY);
      // No signature stored anywhere: this is the first publish under this
      // scheme (new browser, cleared storage, fresh deploy). Seed the
      // signature and treat the chrome as unchanged — publishing Home must
      // not rebuild every section, author and story page just because the
      // editor has nothing to compare against.
      if (!previous) return false;
      return previous !== signature;
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * Home's shared chrome, resolved against the placements registry, in the shape
 * the backend republish-all worker copies onto every other page. Returns null
 * when the registry cannot be resolved, which must abort the republish rather
 * than propagate a layout that is missing a real leaderboard.
 */
export const getHomeChromeLayoutForPublish = async (
  homeData: PageStudioData
): Promise<HomeChromeLayout | null> => {
  if (!homeData) return null;
  if (!(await ensurePlacementsResolvable(homeData))) {
    console.warn(
      '[navbar-leaderboard sync] placements registry unavailable; not sending a chrome layout'
    );
    return null;
  }
  return extractHomeChromeLayout(homeData, getPlacements());
};

/** Home's chrome as last saved on the server, for publishing the whole site from a page other than Home. */
export const getSavedHomeChromeLayout = async (): Promise<HomeChromeLayout | null> => {
  const record = await fetchPageRecord('Home');
  return record?.data ? getHomeChromeLayoutForPublish(record.data) : null;
};

export const markHomeNavbarLeaderboardPublished = async (
  homeData: PageStudioData
): Promise<void> => {
  if (!(await ensurePlacementsResolvable(homeData))) return;
  const signature = getHomeChromeSignature(homeData, getPlacements());
  if (!signature) return;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HOME_CHROME_SIGNATURE_KEY, signature);
    } catch {
      // Ignore storage errors; publish flow should continue.
    }
  }

  try {
    const record = await fetchPageRecordByKey(HOME_CHROME_SIGNATURE_PAGE_TYPE);
    const pageId = record?.pageId;
    const data: PageStudioData = {
      root: { props: { title: hashSignature(signature) } },
      content: [],
    };
    await saveAutosaveByKey(HOME_CHROME_SIGNATURE_PAGE_TYPE, pageId, data);
  } catch (e) {
    console.warn('Failed to save HomeChromeSignature to server:', e);
  }
};

export type BulkPublishContext = {
  storiesById: Record<string, any>;
  sections: string[];
  campaigns: any[];
};

const postSaveHtml = async (
  endpoint: string,
  body: Record<string, any>
): Promise<boolean> => {
  const token = getToken();
  if (!token) return false;
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/pagestudio/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`Bulk publish ${endpoint} returned HTTP ${res.status}`);
      return false;
    }
    const json = await res.json().catch(() => null);
    if (json?.success === false) {
      console.warn(`Bulk publish ${endpoint} was rejected by backend:`, json);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Bulk publish ${endpoint} failed:`, e);
    return false;
  }
};

export const extractReadyToPublishStories = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.stories)) return payload.data.stories;
  if (Array.isArray(payload?.stories)) return payload.stories;
  return [];
};

const fetchReadyToPublishStories = async (): Promise<any[]> => {
  const token = getToken();
  if (!token) return [];
  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/story/fetchReadyToPublish`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return extractReadyToPublishStories(json);
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// In-browser bulk publish helpers.
//
// Home publish no longer calls these: when Home's shared chrome changes it
// POSTs /pagestudio/republishAll instead, and the backend worker republishes
// every page from the same renderers (see src/publish/rendererEntry.ts), so
// the admin does not have to keep the tab open. They are kept here, unused,
// as the in-browser equivalent of that job.
// ---------------------------------------------------------------------------

/**
 * For every target page: pull its saved Puck JSON, inject Home's shared
 * chrome, persist the updated JSON via autosave, render the page to static
 * HTML and push it through the page's existing saveXxxHtml endpoint.
 * Intended to run only when Home's shared chrome has actually changed.
 */
export const publishAllNavbarPagesHtml = async (
  homeData: PageStudioData,
  ctx: BulkPublishContext
): Promise<void> => {
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return;


  await Promise.all(
    FLAT_PAGE_TARGETS.map(async (target) => {
      const record = await fetchPageRecord(target.pageType as PageType);
      const publishableData = getPublishableData(record?.data);
      if (!record || !publishableData) {
        return;
      }

      const updated = applyHomeChromeLayout(publishableData, layout, placements);
      // Persist as this page's own new published snapshot too — otherwise a
      // later unrelated republish trigger (e.g. a campaign toggle) would
      // keep reading the pre-navbar-sync snapshot forever.
      await saveAutosave(target.pageType as PageType, record.pageId, { ...updated, publishedSnapshot: updated });

      let htmlContent: string;
      try {
        htmlContent = target.render({
          pageType: target.pageType,
          data: updated,
          storiesById: ctx.storiesById,
          sections: ctx.sections,
          activeSection: target.activeSection,
          campaigns: ctx.campaigns,
        });
      } catch (e) {
        console.warn(`Failed to render ${target.pageType} during bulk publish:`, e);
        return;
      }

      await postSaveHtml(target.endpoint, { htmlContent });
    })
  );
};

// --------------------------------------------------------------------------
// Parameterized pages (Section / Author / Blog) — each has its own backend
// record per section name / author id, or in the case of Blog a single
// template applied per published story.
// --------------------------------------------------------------------------


/**
 * For every section: fetch its saved `Section-<name>` Puck JSON, inject
 * Home's shared chrome, persist via autosave, and publish HTML through
 * `/pagestudio/saveSectionHtml`.
 */
export const publishAllSectionPagesHtml = async (
  homeData: PageStudioData,
  sectionsList: string[],
  ctx: BulkPublishContext
): Promise<void> => {
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return;
  if (!sectionsList || sectionsList.length === 0) return;


  await Promise.all(
    sectionsList.map(async (sectionName) => {
      const key = `Section-${sectionName}`;
      const record = await fetchPageRecordByKey(key);
      const publishableData = getPublishableData(record?.data);
      if (!record || !publishableData) {
        return;
      }

      const updated = applyHomeChromeLayout(publishableData, layout, placements);
      // Persist as this page's own new published snapshot too — otherwise a
      // later unrelated republish trigger (e.g. a campaign toggle) would
      // keep reading the pre-navbar-sync snapshot forever.
      await saveAutosaveByKey(key, record.pageId, { ...updated, publishedSnapshot: updated });

      let htmlContent: string;
      try {
        htmlContent = renderHomePageFromPuckJSON({
          pageType: key,
          data: updated,
          storiesById: ctx.storiesById,
          sections: ctx.sections,
          activeSection: sectionName,
          campaigns: ctx.campaigns,
        });
      } catch (e) {
        console.warn(`Failed to render ${key} during bulk publish:`, e);
        return;
      }

      await postSaveHtml('saveSectionHtml', {
        htmlContent,
        sectionValue: sectionName,
      });
    })
  );
};

/**
 * For every author: fetch its saved `Author-<id>` Puck JSON, inject Home's
 * shared chrome, persist via autosave, and publish HTML through
 * `/pagestudio/saveAuthorHtml`.
 */
export const publishAllAuthorPagesHtml = async (
  homeData: PageStudioData,
  ctx: BulkPublishContext
): Promise<void> => {
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return;
  const authors = getAuthors();
  if (!authors.length) return;


  await Promise.all(
    authors.map(async (author) => {
      const key = `Author-${author.id}`;
      const record = await fetchPageRecordByKey(key);
      const publishableData = getPublishableData(record?.data);
      if (!record || !publishableData) {
        return;
      }

      const updated = applyHomeChromeLayout(publishableData, layout, placements);
      // Persist as this page's own new published snapshot too — otherwise a
      // later unrelated republish trigger (e.g. a campaign toggle) would
      // keep reading the pre-navbar-sync snapshot forever.
      await saveAutosaveByKey(key, record.pageId, { ...updated, publishedSnapshot: updated });

      let htmlContent: string;
      try {
        htmlContent = renderAuthorPageFromPuckJSON({
          pageType: 'Author',
          data: updated,
          storiesById: ctx.storiesById,
          sections: ctx.sections,
          authorName: author.name,
          authorId: author.id,
          campaigns: ctx.campaigns,
        });
      } catch (e) {
        console.warn(`Failed to render ${key} during bulk publish:`, e);
        return;
      }

      const authorSlug = author.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      await postSaveHtml('saveAuthorHtml', {
        htmlContent,
        authorName: author.name,
        authorSlug,
        userId: author.id,
      });
    })
  );
};

/**
 * Blog uses a single `Blog` Puck JSON template applied per published story.
 * On a shared chrome change we fetch the template, inject the new layout,
 * autosave, then re-render & push HTML for every published story through
 * `/pagestudio/saveHtml`. Stories are processed in small batches to avoid
 * hammering the backend.
 */
export const publishAllBlogStoriesHtml = async (
  homeData: PageStudioData,
  allStories: any[],
  ctx: BulkPublishContext,
  batchSize: number = 25
): Promise<void> => {
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout) return;

  const record = await fetchPageRecordByKey('Blog');
  const publishableData = getPublishableData(record?.data);
  if (!record || !publishableData) {
    return;
  }

  const updated = applyHomeChromeLayout(publishableData, layout, placements);
  // Persist as this page's own new published snapshot too — otherwise a
  // later unrelated republish trigger (e.g. a campaign toggle) would keep
  // reading the pre-navbar-sync snapshot forever.
  await saveAutosaveByKey('Blog', record.pageId, { ...updated, publishedSnapshot: updated });

  let storiesToPublish = Array.isArray(allStories) ? allStories : [];
  if (storiesToPublish.length === 0) {
    storiesToPublish = await fetchReadyToPublishStories();
  }
  if (storiesToPublish.length === 0) return;


  const authors = getAuthors();

  for (let i = 0; i < storiesToPublish.length; i += batchSize) {
    const batch = storiesToPublish.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (story: any) => {
        try {
          const currentStory = buildStoryOverride(
            story,
            story.slug,
            Array.isArray(story.Category) ? story.Category[0] : story.Category,
            story.Section || story.section
          );

          const htmlCode = renderBlogPageFromPuckJSON(
            { data: updated as any, storiesById: ctx.storiesById },
            {
              sections: ctx.sections,
              currentStory,
              authors,
              campaigns: ctx.campaigns,
            }
          );

          const resolvedSlug = story.slug || 'story';
          const resolvedSection = story?.Section || story?.section || 'General';

          await postSaveHtml('saveHtml', {
            htmlContent: htmlCode,
            slug: resolvedSlug,
            section: resolvedSection,
            socialImage: currentStory?.socialImage || '',
          });
        } catch (e) {
          console.warn(`Blog bulk publish failed for story ${story?.storyId}:`, e);
        }
      })
    );
    // Small pause between batches to be kind to the backend.
    if (i + batchSize < storiesToPublish.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

};

/**
 * Given a loaded non-Home page's data and the latest in-memory Home data,
 * returns a new copy of the page data with Home's navbar (and footer) injected.
 * Used when switching pages in the editor so the latest Home navbar props
 * (showSignIn, showSupportUs, showFacebook, showLinkedIn, etc.) are always
 * reflected immediately — even before autosave/publish has run.
 */
export const injectHomeNavbarIntoPageData = (
  pageData: PageStudioData,
  homeData: PageStudioData
): PageStudioData => {
  const placements = getPlacements();
  const layout = extractHomeChromeLayout(homeData, placements);
  if (!layout || !layout.navbar) return pageData;
  return applyHomeChromeLayout(pageData, layout, placements);
};

// ---------------------------------------------------------------------------
// PWA static files publisher
// Uploads manifest.json, sw.js, and the two PWA screenshots to S3 so that
// openpress.com always serves the latest PWA metadata.
// ---------------------------------------------------------------------------

/**
 * Fetches the PWA static files from the app's own origin (i.e. the built
 * assets in /public) and pushes them to S3 via the backend.
 *
 * Called once during the Home publish flow.
 */
export const publishPwaFiles = async (): Promise<boolean> => {
  const token = getToken();
  if (!token) return false;

  const base = import.meta.env.VITE_BACKEND_API;
  const origin = window.location.origin;

  try {
    // Fetch all four PWA files in parallel from the app's own public/ folder.
    const [manifestRes, swRes, mobileRes, desktopRes] = await Promise.all([
      fetch(`${origin}/manifest.json`),
      fetch(`${origin}/sw.js`),
      fetch(`${origin}/pwa-screenshot-mobile.png`),
      fetch(`${origin}/pwa-screenshot-desktop.png`),
    ]);

    if (!manifestRes.ok) {
      console.warn('[PWA publish] manifest.json not found at origin, skipping');
      return false;
    }

    const manifestJson = await manifestRes.text();
    const swJs = swRes.ok ? await swRes.text() : null;

    // Convert PNG blobs to base64 strings for JSON transport.
    const toBase64 = async (res: Response): Promise<string | null> => {
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Strip the data-URL prefix — backend expects raw base64.
          const result = (reader.result as string).split(',')[1] ?? null;
          resolve(result);
        };
        reader.readAsDataURL(blob);
      });
    };

    const [screenshotMobileBase64, screenshotDesktopBase64] = await Promise.all([
      toBase64(mobileRes),
      toBase64(desktopRes),
    ]);

    const payload: Record<string, string | null> = { manifestJson };
    if (swJs)                   payload.swJs                   = swJs;
    if (screenshotMobileBase64) payload.screenshotMobileBase64 = screenshotMobileBase64;
    if (screenshotDesktopBase64) payload.screenshotDesktopBase64 = screenshotDesktopBase64;

    const res = await fetch(`${base}/pagestudio/savePwaFiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('[PWA publish] savePwaFiles returned HTTP', res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[PWA publish] publishPwaFiles failed:', e);
    return false;
  }
};
