// Shared inputs for publishing pages to static HTML.
//
// The Home publish flow in PuckOverrides.tsx and the backend republish-all
// worker must feed the renderers identically shaped data, or the same page
// comes out different depending on who published it. Both read the story map
// and the flat-page target list from here.
//
// Editor-free and React-free on purpose: this module is part of the
// published-page renderer bundle that runs in Node (src/publish/rendererEntry.ts).

import { renderAboutPageFromPuckJSON } from '../helpers/renderAboutPageFromPuckJSON';
import { renderSupportUsPageFromPuckJSON } from '../helpers/renderSupportUsPageFromPuckJSON';
import { renderAuthorsListPageFromPuckJSON } from '../helpers/renderAuthorsListPageFromPuckJSON';
import { renderContactUsPageFromPuckJSON } from '../helpers/renderContactUsPageFromPuckJSON';
import { renderErrorPageFromPuckJSON } from '../helpers/renderErrorPageFromPuckJSON';
import { renderMediaCouncilPageFromPuckJSON } from '../helpers/renderMediaCouncilPageFromPuckJSON';
import { renderPrivacyPolicyPageFromPuckJSON } from '../helpers/renderPrivacyPolicyPageFromPuckJSON';

export type PublishRenderContext = {
  storiesById: Record<string, any>;
  sections: string[];
  campaigns: any[];
};

export type FlatPageTarget = {
  /** Backend page record key, also the `pageType` passed to the renderer. */
  pageType: string;
  /** `/pagestudio/<endpoint>` route that stores this page's HTML. */
  endpoint: string;
  activeSection?: string;
  render: (json: any) => string;
};

// Single-record page types that inherit Home's shared chrome (navbar,
// adjacent leaderboard placements, and footer). Section/Author/Blog pages are
// parameterized per item and handled separately.
export const FLAT_PAGE_TARGETS: FlatPageTarget[] = [
  { pageType: 'About', endpoint: 'saveAboutHtml', activeSection: 'ABOUT', render: renderAboutPageFromPuckJSON },
  { pageType: 'SupportUs', endpoint: 'saveSupportUsHtml', activeSection: 'SUPPORT-US', render: renderSupportUsPageFromPuckJSON },
  { pageType: 'PrivacyPolicy', endpoint: 'savePrivacyPolicyHtml', render: renderPrivacyPolicyPageFromPuckJSON },
  { pageType: 'MediaCouncil', endpoint: 'saveMediaCouncilHtml', render: renderMediaCouncilPageFromPuckJSON },
  { pageType: 'ContactUs', endpoint: 'saveContactUsHtml', render: renderContactUsPageFromPuckJSON },
  { pageType: 'AuthorsList', endpoint: 'saveAuthorsHtml', activeSection: 'AUTHORS-LIST', render: renderAuthorsListPageFromPuckJSON },
  { pageType: 'Error', endpoint: 'saveErrorHtml', render: renderErrorPageFromPuckJSON },
];

type TaxonomyStory = {
  Category?: string | string[];
  category?: string;
  Section?: string | string[];
  section?: string;
};

const firstNonEmpty = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    const found = value.find(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    );
    return found ? found.trim() : undefined;
  }
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return undefined;
};

export const getStoryTaxonomyCategory = (story: TaxonomyStory): string =>
  firstNonEmpty(story.Category) ||
  firstNonEmpty(story.Section) ||
  story.category ||
  story.section ||
  'General';

/**
 * Story map handed to every page renderer, so cards, grids and recommendation
 * blocks can resolve a story id to its headline, image and published URL.
 *
 * Built from `/story/fetchReadyToPublish` rows. Mirrors the mapping the Home
 * publish flow has always used — the field names are what the renderers read,
 * so they are not free to change here.
 */
export const buildStoriesById = (stories: any[]): Record<string, any> => {
  const storiesById: Record<string, any> = {};

  (Array.isArray(stories) ? stories : []).forEach((story: any) => {
    if (!story?.storyId) return;

    storiesById[story.storyId] = {
      id: story.storyId,
      title: story.title,
      headline: story.title,
      summary: story.storySummary || story.description?.blocks?.[0]?.data?.text || '',
      category: story.section || 'General',
      taxonomyCategory: getStoryTaxonomyCategory(story),
      section: story.section,
      author: story.authorName || 'Unknown Author',
      image: story.image || '',
      imageUrl: story.image || '',
      publishUrl: story.redirectUrl || '', // This is the key field!
      slug: story.slug || '',
      updatedAt: story.updatedAt,
      createdAt: story.createdAt,
      // Keep the full date fallback chain used by card/sort renderers (see renderBottomCard/List).
      proposedFilingDate: story.proposedFilingDate || story.publishDate || '',
      publishDate: story.proposedFilingDate || story.publishDate || undefined,
      publishedAt: story.publishedAt,
      authorId: story.authorId || '',
      byLine: story.byline || [],
      socialImage: story.socialImage || '',
      socialHeadline: story.socialHeadline || '',
      description: story.description || null,
      fullDescription: story.fullDescription || '',
    };
  });

  return storiesById;
};

/** Author page S3 path segment. Must match what the editor sends. */
export const authorSlugFor = (authorName: string): string =>
  authorName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
