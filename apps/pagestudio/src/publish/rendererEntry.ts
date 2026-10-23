// Public API of the published-page renderer bundle.
//
// `npm run build` builds this entry a second time, as a single self-contained
// ESM file at `dist/publish-renderer.js`, with this environment's VITE_* values
// baked in exactly as they are baked into the app itself. The Page Studio
// deploy uploads it alongside the app, and the backend republish-all worker
// imports it at runtime from the Page Studio origin.
//
// Everything the worker needs to turn stored Puck JSON into the same HTML the
// editor would produce is exposed here, so the worker itself contains no
// rendering or data-shaping logic — only fetching, saving and bookkeeping.
// Adding a rendered page type is therefore a change in this app, not in the
// backend.
//
// Keep this module free of browser-only work at import time: it is imported in
// Node, where `window` and `document` do not exist.

import { renderAuthorPageFromPuckJSON } from '../helpers/renderAuthorPageFromPuckJSON';
import { renderHomePageFromPuckJSON } from '../helpers/renderHomePageFromPuckJSON';
import { renderPageFromPuckJSON as renderBlogPageFromPuckJSON } from '../helpers/blog/renderBlogPage';
import { getAuthors, setAuthors, type Author } from '../components/PuckEditor/authorData';
import { extractApiAuthors, transformApiAuthor } from '../components/PuckEditor/apiService';
import { buildStoryOverride } from '../components/PuckEditor/storyOverride';
import {
  applyHomeChromeLayout,
  isUsableChromeLayout,
  type ChromePlacement,
  type HomeChromeLayout,
} from './homeChrome';
import {
  FLAT_PAGE_TARGETS,
  authorSlugFor,
  buildStoriesById,
  type PublishRenderContext,
} from './publishContext';
import { getPublishableData } from './publishedSnapshot';

/**
 * Bumped only on a breaking change to this module's exports. The worker refuses
 * a bundle whose version it does not recognise, so a backend that is older than
 * the deployed Page Studio fails loudly instead of rendering half a page.
 */
export const RENDERER_API_VERSION = 2;

export type RenderedPage = { html: string; savePayload: Record<string, unknown> };

/** Flat pages in publish order, with the endpoint that stores each one. */
export const flatPageTargets = (): { pageType: string; endpoint: string }[] =>
  FLAT_PAGE_TARGETS.map(({ pageType, endpoint }) => ({ pageType, endpoint }));

/**
 * Seeds the module-level author store the author renderers read
 * (`findAuthorById`, `getAuthors`) from a raw `/getAuthors` response, and
 * returns the authors that have a usable name. In the editor the store is
 * filled by the app on load; in Node nothing fills it, so author cards would
 * render blank without this.
 */
export const seedAuthors = (rawAuthorsResponse: unknown): Author[] => {
  const authors = extractApiAuthors(rawAuthorsResponse)
    .map(transformApiAuthor)
    .filter((author): author is Author => author !== null);

  setAuthors(authors);
  return authors;
};

export { buildStoriesById, getPublishableData, isUsableChromeLayout, authorSlugFor };

/** Copies Home's navbar/footer/leaderboard chrome onto a page's stored data. */
export const applyChrome = <T extends { root?: any; content?: unknown }>(
  pageData: T,
  layout: HomeChromeLayout,
  placements: ChromePlacement[]
): T => applyHomeChromeLayout(pageData, layout, placements);

/**
 * The Home page itself.
 *
 * A chrome republish does not need this: Home is published by the editor that
 * triggered it, and is already live before the job is even queued. A campaign
 * republish has no editor behind it — it can be set off by a campaign expiring
 * on a timer — so the backend has to rebuild Home too.
 */
export const renderHomePage = (
  pageData: any,
  ctx: PublishRenderContext
): RenderedPage => {
  const html = renderHomePageFromPuckJSON({
    pageType: 'Home',
    data: pageData,
    storiesById: ctx.storiesById,
    sections: ctx.sections,
    activeSection: 'HOME',
    campaigns: ctx.campaigns,
  });

  return { html, savePayload: { htmlContent: html } };
};

/** About, PrivacyPolicy, MediaCouncil, ContactUs, AuthorsList, Error. */
export const renderFlatPage = (
  pageType: string,
  pageData: any,
  ctx: PublishRenderContext
): RenderedPage => {
  const target = FLAT_PAGE_TARGETS.find((entry) => entry.pageType === pageType);
  if (!target) throw new Error(`Unknown flat page type: ${pageType}`);

  const html = target.render({
    pageType: target.pageType,
    data: pageData,
    storiesById: ctx.storiesById,
    sections: ctx.sections,
    activeSection: target.activeSection,
    campaigns: ctx.campaigns,
  });

  return { html, savePayload: { htmlContent: html } };
};

/** Section landing page, stored under the `Section-<name>` page record. */
export const renderSectionPage = (
  sectionName: string,
  pageData: any,
  ctx: PublishRenderContext
): RenderedPage => {
  const html = renderHomePageFromPuckJSON({
    pageType: `Section-${sectionName}`,
    data: pageData,
    storiesById: ctx.storiesById,
    sections: ctx.sections,
    activeSection: sectionName,
    campaigns: ctx.campaigns,
  });

  return { html, savePayload: { htmlContent: html, sectionValue: sectionName } };
};

/** Author page, stored under the `Author-<id>` page record. */
export const renderAuthorPage = (
  author: { id: string; name: string },
  pageData: any,
  ctx: PublishRenderContext
): RenderedPage => {
  const html = renderAuthorPageFromPuckJSON({
    pageType: 'Author',
    data: pageData,
    storiesById: ctx.storiesById,
    sections: ctx.sections,
    authorName: author.name,
    authorId: author.id,
    campaigns: ctx.campaigns,
  });

  return {
    html,
    savePayload: {
      htmlContent: html,
      authorName: author.name,
      authorSlug: authorSlugFor(author.name),
      userId: author.id,
    },
  };
};

/** One published story, rendered through the (chrome-updated) Blog template. */
export const renderStoryPage = (
  story: any,
  blogTemplateData: any,
  ctx: PublishRenderContext
): RenderedPage => {
  const currentStory = buildStoryOverride(
    story,
    story.slug,
    Array.isArray(story.Category) ? story.Category[0] : story.Category,
    story.Section || story.section
  );

  const html = renderBlogPageFromPuckJSON(
    { data: blogTemplateData, storiesById: ctx.storiesById },
    {
      sections: ctx.sections,
      currentStory,
      // Read at render time, so seedAuthors() has already filled the store.
      authors: getAuthors(),
      campaigns: ctx.campaigns,
    }
  );

  return {
    html,
    savePayload: {
      htmlContent: html,
      slug: story.slug || 'story',
      section: story?.Section || story?.section || 'General',
      socialImage: currentStory?.socialImage || '',
    },
  };
};
