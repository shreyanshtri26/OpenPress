// builderConfig.tsx
import { type Config, type Data, type ExtractConfigParams } from '@measured/puck';
import { getPublishableData as getPublishableDataImpl } from '../../publish/publishedSnapshot';
import { cardBlocks } from './CardBlocksConfig';
import { buildLibraryCategories } from './libraryGroups';
import { commonBlocks } from './CommonBlocksConfig';
import videoAuthorBlocks from './videoAuthorBuilder/videoAuthorConfig';
import videoBlocks from './videoBuilder/videoConfig';


const videoAuthorComponentKeys = [
  'VideoAuthorGrid',
  'PopularBlogCard',
  'BlogRecomCard',
  'BlogShowcaseCard',
  'BlogHeading',
];

// list of keys that belong to the author builder
const authorComponentKeys = [
  'AuthorProfile',
  'SectionBottomCard',
  'SectionGrid',
  'Border',
  'Heading',
];

// list of keys that belong to the authors list builder
const authorsListComponentKeys = [
  'AuthorsGrid',
  'AuthorsGridManual',
  'AuthorCard',
  'SectionGrid',
  'SectionBottomCard',
  'Border',
  'Heading',
];



// list of keys that belong to the video builder
const videoComponentKeys = [
  'VideoGrid',
  'PopularBlogCard',
  'BlogRecomCard',
  'BlogShowcaseCard',
  'BlogHeading',
  // Add other video component keys here as they are created
]

// list of keys that belong to the section builder
const sectionComponentKeys = [
  // Section-specific components
  'SectionGrid',
  'SectionBottomCard',

  // Blog components
  'PopularBlogCard',
  'BlogRecomCard',
  'BlogShowcaseCard',
  'BlogPostCard',

  // Home page card components (now available in section pages)
  'ShowcaseCard',
  'HoverCard',
  'StoryCard',
  'MultimediaCard',
  'MainCard',
  'RecommendCard',
  'MostPopularTable',
  'StorySubCard',
  'FeaturedCard',
  'SidebarStoryCard',
  'Border',
  'ErrorCard',
  'AdCard',
]

// list of keys that belong to the blog builder
const blogComponentKeys = [
  'PopularBlogCard',
  'BlogRecomCard',
  'BlogShowcaseCard',
  'BlogHeading',
  'BlogGrid',
  'BlogPostCard',
  'BlogMoreStoriesCard',
  'SectionGrid',
  'SectionBottomCard',
  'Border',
]

// List of common components to exclude from the blog sidebar
const excludedCommonComponents = [
  'AdvertisementGrid',
  'ThumbnailGrid',
  'HeroGrid',
  'PopularGrid',
  'MultimediaGrid',
  'AllStoriesGrid',
  'Heading'
]

function pick<T extends Record<string, any>>(obj: T, keys: string[]) {
  const out: Record<string, any> = {}
  for (const k of keys) {
    if (k in obj) out[k] = obj[k]
  }
  return out as Partial<T>
}

function omit<T extends Record<string, any>>(obj: T, keys: string[]) {
  const out: Record<string, any> = {}
  for (const k of Object.keys(obj)) {
    if (!keys.includes(k)) out[k] = obj[k]
  }
  return out as Partial<T>
}

// Build the component maps
const blogOnlyBlocks = {
  ...pick(cardBlocks, blogComponentKeys),
}

const videoAuthorOnlyBlocks = {
  ...videoAuthorBlocks,
  ...pick(cardBlocks, videoAuthorComponentKeys),
};

const videoOnlyBlocks = {
  ...videoBlocks,
  ...pick(cardBlocks, videoComponentKeys),
}

const sectionOnlyBlocks = {
  ...pick(cardBlocks, sectionComponentKeys),
}

const authorOnlyBlocks = {
  ...pick(cardBlocks, authorComponentKeys),
}

const authorsListOnlyBlocks = {
  ...pick(cardBlocks, authorsListComponentKeys),
}


// Define components to exclude from different pages
const blogSpecificComponents = [
  'BlogTitle',
  'BlogBodyCard',
  'BlogSubHeading',
  'BlogMainTitle',
  'PopularBlogCard',
  'BlogRecomCard',
  'BlogShowcaseCard',
  'BlogHeading',
  'BlogGrid',
  'BlogImageCard',
  'BlogPostCard',
  'ShareCard',
  'BlogMoreStoriesCard',
];

const videoSpecificComponents = [
  'VideoGrid',
  'VideoCard',
  'VideoCardHorizontal',
];


// Create card blocks for different pages by excluding irrelevant components
const homeCardBlocks = {
  ...omit(cardBlocks, [...blogComponentKeys, ...blogSpecificComponents, ...videoComponentKeys, ...videoSpecificComponents, ...videoAuthorComponentKeys, ...authorComponentKeys, ...authorsListComponentKeys]),
  ...pick(cardBlocks, ['Border']), // Explicitly include Border in home page
}

export type PageType = 'Home' | 'Videos' | 'Blog' | 'Section' | 'VideoAuthor' | 'Error' | 'About' | 'Author' | 'AuthorsList' | 'PrivacyPolicy' | 'MediaCouncil' | 'ContactUs' | 'SupportUs';

// Grid blocks whose "Automatic" mode toggle only makes sense on the home page.
const AUTOMATIC_MODE_GRID_KEYS = ['ThumbnailGrid', 'HeroGrid', 'PopularGrid', 'MultimediaGrid', 'AllStoriesGrid'];

// Hides the Automatic/Manual mode field for grid blocks so it can't even be
// switched on outside the home page, pins resolveFields to the manual branch
// regardless of any stored `mode` value, and forces the block's own render
// (used for both the editor canvas and the live iframe preview) to treat the
// grid as manual too — so stale `mode: 'automatic'` data saved before this
// restriction existed can't sneak automatic behavior into a non-home page.
function withoutAutomaticMode(components: Record<string, any>): Record<string, any> {
  const next = { ...components };
  AUTOMATIC_MODE_GRID_KEYS.forEach((key) => {
    const block = next[key];
    if (!block) return;
    const originalResolveFields = block.resolveFields;
    const originalRender = block.render;
    const fieldsWithoutMode = { ...(block.fields ?? {}) };
    delete fieldsWithoutMode.mode;
    next[key] = {
      ...block,
      fields: fieldsWithoutMode,
      resolveFields: originalResolveFields
        ? (data: any, args: any) =>
            originalResolveFields({ ...data, props: { ...data?.props, mode: 'manual' } }, args)
        : block.resolveFields,
      render: originalRender
        ? (props: any) => originalRender({ ...props, mode: 'manual' })
        : block.render,
    };
  });
  return next;
}

// Forces `mode: 'automatic'` back to `'manual'` on any grid block's stored
// props when the data belongs to a non-home page. Needed because sibling
// field logic (e.g. child-card "Automatic mode" notices in
// CardBlocksConfig.tsx) reads the raw stored `mode` value directly via
// Puck's `parent` context, bypassing the field-hiding/render wrapping in
// `withoutAutomaticMode` above — so stale data (copied from Home, or saved
// before this restriction existed) must be corrected at the data level too.
export function sanitizeAutomaticGridMode<T extends { content?: any[]; zones?: Record<string, any[]> }>(
  data: T,
  pageType: PageType
): T {
  if (pageType === 'Home' || !data) return data;

  const fixBlocks = (blocks: any[] | undefined) => {
    if (!Array.isArray(blocks)) return blocks;
    return blocks.map((block) =>
      block && AUTOMATIC_MODE_GRID_KEYS.includes(block.type) && block.props?.mode === 'automatic'
        ? { ...block, props: { ...block.props, mode: 'manual' } }
        : block
    );
  };

  return {
    ...data,
    content: fixBlocks(data.content),
    zones: data.zones
      ? Object.fromEntries(Object.entries(data.zones).map(([key, blocks]) => [key, fixBlocks(blocks)]))
      : data.zones,
  };
}

export const config = {
  components: {
    ...commonBlocks,
    ...homeCardBlocks,
  },
}


export const getConfigForPage = (pageType: PageType) => {
  // Re-build filtered common blocks to pick up any dynamic changes
  const currentFilteredCommonBlocks = Object.fromEntries(
    Object.entries(commonBlocks).filter(([key]) => !excludedCommonComponents.includes(key))
  );

  let components = {};

  switch (pageType) {
    case 'Blog':
      components = { ...currentFilteredCommonBlocks, ...blogOnlyBlocks };
      break;
    case 'Videos':
      components = { ...currentFilteredCommonBlocks, ...videoOnlyBlocks };
      break;
    case 'VideoAuthor':
      components = { ...currentFilteredCommonBlocks, ...videoAuthorOnlyBlocks };
      break;
    case 'Section':
      components = { ...commonBlocks, ...sectionOnlyBlocks };
      break;
    case 'Author':
      components = { ...currentFilteredCommonBlocks, ...authorOnlyBlocks, Heading: commonBlocks.Heading };
      break;
    case 'AuthorsList':
      components = { ...currentFilteredCommonBlocks, ...authorsListOnlyBlocks, Heading: commonBlocks.Heading };
      break;
    case 'Home':
    case 'PrivacyPolicy':
    case 'MediaCouncil':
    case 'ContactUs':
    case 'SupportUs':
    case 'About':
    case 'Error':
    default:
      components = { ...commonBlocks, ...homeCardBlocks };
      break;
  }

  // The Automatic mode toggle for grid blocks only applies to the home page.
  if (pageType !== 'Home') {
    components = withoutAutomaticMode(components);
  }

  // Group the page's blocks into named library sections (see libraryGroups.ts).
  const categories = buildLibraryCategories(Object.keys(components));

  return {
    components,
    categories,
  } as Config<any>;
}

// types and initial data remain the same
type ConfigParams = ExtractConfigParams<typeof config>
export type PageStudioData = Data<ConfigParams['props'], ConfigParams['rootProps']>

// A page's stored `data` optionally carries a `publishedSnapshot`: a full,
// self-contained copy of the data as of the last explicit "Publish" click
// (see PuckEditor.tsx's handlePublish/scheduleAutosave). Live-editing
// autosave never touches this key — it only updates the top-level
// root/content/zones — so anything that republishes a page for a reason
// OTHER than the editing user themselves publishing (campaign pause/play,
// story publish, navbar sync fan-out, etc.) should read through this helper
// instead of the raw `data`, to avoid ever publishing someone's in-progress,
// never-published edit. Falls back to raw `data` for pages that haven't been
// published yet under this scheme, so older records keep working unchanged.
// Implementation lives in src/publish/publishedSnapshot.ts so the published-page
// renderer bundle can use it without importing this file (and with it the whole
// Puck editor config) into Node. Re-exported here for existing callers.
export function getPublishableData(
  data: (PageStudioData & { publishedSnapshot?: PageStudioData }) | null | undefined
): PageStudioData | null | undefined {
  return getPublishableDataImpl(data);
}

export const getInitialDataForPage = (pageType: PageType): PageStudioData => {
  if (pageType === 'ContactUs') {
    return {
      root: { props: { title: 'Contact Us' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'contact-navbar' } },
        { type: 'ContactUs', props: { id: 'contact-us' } },
        { type: 'Footer', props: { id: 'contact-footer' } },
      ],
    };
  }
  if (pageType === 'About') {
    return {
      root: { props: { title: 'About Us' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'about-navbar' } },
        { type: 'AboutUs', props: { id: 'about-us' } },
        { type: 'Footer', props: { id: 'about-footer' } },
      ],
    };
  }
  // Author pages: masthead, the author's profile (taken from the page's author), the footer.
  if (pageType === 'Author') {
    return {
      root: { props: { title: 'Author' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'author-navbar' } },
        { type: 'AuthorProfile', props: { id: 'author-profile' } },
        { type: 'Footer', props: { id: 'author-footer' } },
      ],
    };
  }
  if (pageType === 'SupportUs') {
    return {
      root: { props: { title: 'Support Us' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'support-navbar' } },
        { type: 'SupportUs', props: { id: 'support-us' } },
        { type: 'Footer', props: { id: 'support-footer' } },
      ],
    };
  }
  if (pageType === 'PrivacyPolicy') {
    return {
      root: { props: { title: 'Privacy Policy' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'privacy-navbar' } },
        { type: 'PrivacyPolicy', props: { id: 'privacy-policy' } },
        { type: 'Footer', props: { id: 'privacy-footer' } },
      ],
    };
  }
  if (pageType === 'MediaCouncil') {
    return {
      root: { props: { title: 'Media Council' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'media-council-navbar' } },
        { type: 'MediaCouncil', props: { id: 'media-council' } },
        { type: 'Footer', props: { id: 'media-council-footer' } },
      ],
    };
  }
  if (pageType === 'Error') {
    return {
      root: { props: { title: 'Page not found' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'error-navbar' } },
        { type: 'ErrorCard', props: { id: 'error-card' } },
        { type: 'Footer', props: { id: 'error-footer' } },
      ],
    };
  }
  if (pageType === 'AuthorsList') {
    return {
      root: { props: { title: 'Our Team' } },
      content: [
        { type: 'AtlanticNavbar', props: { id: 'authors-list-navbar' } },
        { type: 'AuthorsGrid', props: { id: 'authors-grid' } },
        { type: 'Footer', props: { id: 'authors-list-footer' } },
      ],
    };
  }
  return initialData;
};

export const initialData: PageStudioData = {
  root: {
    props: { title: 'Page Studio' },
  },
  content: [
    {
      type: 'AtlanticNavbar',
      props: { id: 'atlantic-navbar' },
    },
    {
      type: 'ThumbnailGrid',
      props: { id: 'thumbnail-grid' },
    },
  ],
}

const LEGACY_DEFAULT_TITLE = 'Media landing page';

/** Pages saved before the rename carry the old default title; give them the current one. Other titles are left alone. */
export function renameLegacyTitle<T extends { root?: { props?: Record<string, unknown> } }>(data: T): T {
  if (data?.root?.props?.title !== LEGACY_DEFAULT_TITLE) return data;
  return { ...data, root: { ...data.root, props: { ...data.root.props, title: 'Page Studio' } } };
}
