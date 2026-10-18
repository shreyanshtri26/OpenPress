import {
  fetchStories,
  fetchTaxonomies,
  fetchMoreStoryCardTaxonomyOptions,
  fetchThumbnailGridTaxonomyOptions,
} from './apiService'

// EditorJS block types
type ParagraphBlock = {
  type: "paragraph";
  data: {
    text?: string;
  };
};

type ImageBlock = {
  type: "image";
  data: {
    url?: string;
    file?: {
      url: string;
    };
    caption?: string;
  };
  // Tune data (e.g. imageWrapTune) is saved by EditorJS as a sibling of `data`.
  tunes?: { imageWrapTune?: { wrapAlign?: 'left' | 'right' | null; width?: number; align?: 'left' | 'center' | 'right' } };
};

type WrappedImageParagraphBlock = {
  type: "wrappedImageParagraph";
  data: {
    text?: string;
    imageUrl?: string;
    wrapAlign?: 'left' | 'right';
    caption?: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  };
};

type CaptionBlock = {
  type: "caption";
  data: {
    text?: string;
  };
};

type YouTubeBlock = {
  type: "youtube";
  data: {
    url?: string;
    source?: string;
    embed?: string;
    caption?: string;
  };
};

type InstagramBlock = {
  type: "instagram";
  data: {
    url?: string;
    source?: string;
    embed?: string;
    caption?: string;
  };
};

type TwitterBlock = {
  type: "twitter";
  data: {
    url?: string;
    html?: string;
    caption?: string;
  };
};

type FacebookBlock = {
  type: "facebook";
  data: {
    url?: string;
    embed?: string;
    source?: string;
    caption?: string;
  };
};

type EmbedBlock = {
  type: "embed";
  data: {
    service: string;
    source: string;
    embed?: string;
    caption?: string;
    width?: number;
    height?: number;
  };
};

type HeaderBlock = {
  type: "header";
  data: {
    text: string;
    level: number;
  };
};

type ListBlock = {
  type: "list";
  data: {
    style: "ordered" | "unordered";
    items: string[];
  };
};

type EditorJsBlock = ParagraphBlock | ImageBlock | WrappedImageParagraphBlock | CaptionBlock | YouTubeBlock | InstagramBlock | TwitterBlock | FacebookBlock | EmbedBlock | HeaderBlock | ListBlock;

// Define Story type HERE (not imported from apiService)
export type Story = {
  id: string
  headline: string
  summary: string
  fullDescription?: string  // Full body text for blog posts
  description?: { blocks?: EditorJsBlock[] }  // EditorJS format with blocks
  category: string
  taxonomyCategory?: string
  taxonomyCategories?: string[]
  section?: string
  author: string            // Usually the name
  authorName?: string       // Explicit name
  authorId?: string         // Explicit ID
  readTime: string
  imageUrl: string
  imageAuthor: string
  imageAlt: string
  kicker?: string
  updatedAt?: string
  createdAt?: string
  storySummary?: string   // ✅ REQUIRED
  publishUrl?: string
  canonicalUrl?: string
  redirectUrl?: string   // URL for navigation
  publishDate?: string
  publishedAt?: string
  proposedFilingDate?: string
  byLine?: string[]
  altText?: string
  caption?: string;
  socialImage?: string;
  socialHeadline?: string;
};

// Render EditorJS blocks to HTML (same as renderFunctions.ts)
function escapeHtml(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEditorJsBlocks(blocks: EditorJsBlock[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      const data: any = block.data || {};

      if (block.type === "paragraph") {
        return `<p>${data.text || ""}</p>`;
      } else if (block.type === "image") {
        const url = data?.file?.url || data?.url || "";
        const rawCaption = data?.caption || data?.file?.caption || data?.text || data?.title || "";
        const caption = (rawCaption && !rawCaption.startsWith("Image contains:")) ? rawCaption : "";
        // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
        // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
        const imageTune = (block as any).tunes?.imageWrapTune || data?.tunes?.imageWrapTune || {};
        const wrapAlign = imageTune.wrapAlign || null;
        const captionHtml = caption ? `<figcaption class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${escapeHtml(caption)}</figcaption>` : "";

        if (wrapAlign) {
          const floatStyle = wrapAlign === 'left'
            ? 'float:left; margin: 0 1.5rem 1rem 0; max-width: 45%;'
            : 'float:right; margin: 0 0 1rem 1.5rem; max-width: 45%;';
          return `<figure style="${floatStyle}; margin: 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="width:100%;display:block;" loading="lazy"/>${captionHtml}</figure>`;
        }

        const align = imageTune.align || 'center';
        const width = imageTune.width || 100;
        const marginLeft = align === 'left' ? '0' : 'auto';
        const marginRight = align === 'right' ? '0' : 'auto';
        return `<figure class="mb-4" style="margin-bottom: 1rem; max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="display: block; width:100%; height: auto; object-fit: contain;" loading="lazy" />${captionHtml}</figure>`;
      } else if (block.type === "wrappedImageParagraph") {
        const url = data.imageUrl || "";
        const wrapAlign = data.wrapAlign || "left";
        const caption = data.caption || "";
        const text = data.text || "";
        const width = data.width || 40;
        const floatStyle = wrapAlign === 'left'
          ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
          : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
        return `<div style="overflow:hidden;"><div style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${escapeHtml(caption)}</p>` : ''}</div><p>${text}</p></div>`;
      } else if (block.type === "caption") {
        return `<p class="openPress-story-caption font-lato" style="margin: 0 0 1rem 0; color: #716d6d; font-family: 'Lato', sans-serif; font-size: 16px; font-weight: 500; line-height: 1.35; text-align: left;">${data.text || ""}</p>`;
      } else if (block.type === "youtube" || block.type === "instagram" || block.type === "embed") {
        const embedUrl = data.embed || data.source || data.url;
        if (embedUrl) {
          let captionMaxWidth = '800px';
          if (data.service === 'instagram' || block.type === 'instagram') {
            captionMaxWidth = '550px';
          }
          const trimmedCaption = (data.caption || "").trim();
          const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: ${captionMaxWidth}; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          let style = 'width: 100%; border: none; margin: 0 auto; display: block;';
          let height = data.height || 400;
          let width = data.width || '100%';

          if (data.service === 'instagram' || block.type === 'instagram') {
            style += ' max-width: 550px; height: 700px;';
            height = 700;
          } else if (data.service === 'soundcloud') {
            style += ' height: 300px;';
            height = 300;
          } else if (block.type === 'youtube' || data.service === 'youtube') {
            style += ' aspect-ratio: 16/9; max-width: 800px;';
          }

          return `<div class="embed-wrapper mb-4" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === "facebook") {
        const embedUrl = data.url || data.embed || data.source;
        if (embedUrl) {
          const trimmedCaption = (data.caption || "").trim();
          const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          const encodedUrl = encodeURIComponent(embedUrl);
          const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
          return `<div class="embed-wrapper mb-4" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === "twitter") {
        const tweetHtml = (data.html || '').replace(/\n/g, '');
        const trimmedCaption = (data.caption || "").trim();
        const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
        // Wrap in contenteditable="false" to prevent the editor from interfering with Twitter's iframe injection
        return `<div class="twitter-embed-wrapper mb-4 w-full flex flex-col items-center" contenteditable="false">${tweetHtml}${tweetCaption}</div>`;
      } else if (block.type === "header") {
        const level = data.level || 2;
        return `<h${level} class="openPress-story-header" style="margin: 1.5rem 0 1rem 0; font-weight: 700; line-height: 1.2;">${data.text || ""}</h${level}>`;
      } else if (block.type === "list") {
        const tag = data.style === "ordered" ? "ol" : "ul";
        const listStyle = data.style === "ordered" ? "list-style-type: decimal;" : "list-style-type: disc;";
        const items = (data.items || [])
          .map((item: string) => `<li style="margin-bottom: 0.5rem;">${item}</li>`)
          .join("");
        return `<${tag} style="margin: 0 0 1rem 1.5rem; ${listStyle}">${items}</${tag}>`;
      }
      return "";
    })
    .join("");
}

// This will store API stories
let cachedStories: Story[] = []

// Stories are the one page-scoped fetch here — cache by (pageType, section)
// so revisiting a page/section already loaded this session is instant,
// while a not-yet-seen page/section still fetches fresh. Also dedupes
// concurrent calls for the same key so a fast page-switch-back-and-forth
// can't fire two overlapping requests.
const storiesCache = new Map<string, Story[]>()
const storiesInFlight = new Map<string, Promise<Story[]>>()
// Only a Section page changes the request, so every other page shares one entry.
const storiesCacheKey = (pageType?: string | null, section?: string | null) =>
  pageType === 'Section' && section ? `section::${section}` : 'all'

// Initialize stories from API
export async function initializeStories({
  pageType,
  section,
}: {
  pageType?: string | null;
  section?: string | null;
}): Promise<Story[]> {
  const key = storiesCacheKey(pageType, section)
  const cached = storiesCache.get(key)
  if (cached) {
    cachedStories = cached
    return cachedStories
  }

  const inFlight = storiesInFlight.get(key)
  if (inFlight) return inFlight

  const promise = fetchStories({ pageType, section })
    .then((apiStories) => {
      // Don't cache an empty or mock-fallback result, so the next page retries.
      if (apiStories.length > 0 && apiStories[0].id !== 'mock-1') {
        storiesCache.set(key, apiStories)
      }
      cachedStories = apiStories
      return apiStories
    })
    .finally(() => {
      storiesInFlight.delete(key)
    })
  storiesInFlight.set(key, promise)
  return promise
}

// Get current stories (only from API)
export function getStories(): Story[] {
  return cachedStories
}

let cachedCategories: string[] = []
let cachedMoreStoryCardOptions: { label: string; value: string }[] = []
let cachedMoreStoryCardTaxonomyGroups: { taxonomyName: string; values: string[] }[] = []
let cachedThumbnailGridOptions: { label: string; value: string }[] = []
let cachedThumbnailGridTaxonomyGroups: { taxonomyName: string; values: string[] }[] = []

// Global, session-scoped data (not page-specific, nothing invalidates it
// mid-session) — skip re-fetching once populated, and dedupe concurrent
// calls (each of the 5 grid types' resolveFields calls the taxonomy
// fetchers below, so without this a single editor remount can fire the
// same request many times over).
let taxonomiesInFlight: Promise<string[]> | null = null

export async function initializeTaxonomies(): Promise<string[]> {
  if (cachedCategories.length > 0) return cachedCategories
  if (taxonomiesInFlight) return taxonomiesInFlight

  taxonomiesInFlight = fetchTaxonomies()
    .then((categories) => {
      if (categories.length > 0) {
        cachedCategories = categories
      }
      return cachedCategories
    })
    .finally(() => {
      taxonomiesInFlight = null
    })
  return taxonomiesInFlight
}

export function getCategoryOptions(): { label: string; value: string }[] {
  if (cachedCategories.length === 0) {
    return [{ label: 'All Categories', value: '' }]
  }
  return [
    { label: 'All Categories', value: '' },
    ...cachedCategories.map((c) => ({ label: c, value: c }))
  ]
}

let moreStoryCardOptionsInFlight: Promise<{ label: string; value: string }[]> | null = null

export async function initializeMoreStoryCardTaxonomyOptions(): Promise<{ label: string; value: string }[]> {
  if (cachedMoreStoryCardOptions.length > 0) return cachedMoreStoryCardOptions
  if (moreStoryCardOptionsInFlight) return moreStoryCardOptionsInFlight

  moreStoryCardOptionsInFlight = fetchMoreStoryCardTaxonomyOptions()
    .then((options) => {
      const groupsMap = new Map<string, Set<string>>()
      options.forEach((option) => {
        const taxonomyName = option.taxonomyName?.trim()
        const taxonomyValue = option.taxonomyValue?.trim()
        if (!taxonomyName) return

        if (!groupsMap.has(taxonomyName)) {
          groupsMap.set(taxonomyName, new Set<string>())
        }
        if (taxonomyValue) {
          groupsMap.get(taxonomyName)?.add(taxonomyValue)
        }
      })

      cachedMoreStoryCardTaxonomyGroups = Array.from(groupsMap.entries()).map(([taxonomyName, valuesSet]) => ({
        taxonomyName,
        values: Array.from(valuesSet),
      }))

      cachedMoreStoryCardOptions = [
        { label: 'All Values', value: '' },
        ...options
          .filter((option) => Boolean(option.taxonomyValue?.trim()))
          .map((option) => ({
            label: `${option.taxonomyName}: ${option.taxonomyValue}`,
            value: `${option.taxonomyName}::${option.taxonomyValue}`,
          })),
      ]

      return cachedMoreStoryCardOptions
    })
    .finally(() => {
      moreStoryCardOptionsInFlight = null
    })
  return moreStoryCardOptionsInFlight
}

export function getMoreStoryCardTaxonomyOptions(): { label: string; value: string }[] {
  if (cachedMoreStoryCardOptions.length === 0) {
    return [{ label: 'All Values', value: '' }]
  }

  return cachedMoreStoryCardOptions
}

export function getMoreStoryCardTaxonomyGroups(): { taxonomyName: string; values: string[] }[] {
  return cachedMoreStoryCardTaxonomyGroups
}

// Backs all 5 grid types' automatic-mode taxonomy dropdowns (ThumbnailGrid,
// HeroGrid, PopularGrid, MultimediaGrid, AllStoriesGrid each call this
// twice from their resolveFields), so the cache/dedup here matters a lot —
// without it, one editor remount can fire up to 10 redundant fetches.
let thumbnailGridTaxonomyOptionsInFlight: Promise<{ label: string; value: string }[]> | null = null

export async function initializeThumbnailGridTaxonomyOptions(): Promise<{ label: string; value: string }[]> {
  if (cachedThumbnailGridOptions.length > 0) return cachedThumbnailGridOptions
  if (thumbnailGridTaxonomyOptionsInFlight) return thumbnailGridTaxonomyOptionsInFlight

  thumbnailGridTaxonomyOptionsInFlight = fetchThumbnailGridTaxonomyOptions()
    .then((options) => {
      const groupsMap = new Map<string, Set<string>>()
      options.forEach((option) => {
        const taxonomyName = option.taxonomyName?.trim()
        const taxonomyValue = option.taxonomyValue?.trim()
        if (!taxonomyName) return

        if (!groupsMap.has(taxonomyName)) {
          groupsMap.set(taxonomyName, new Set<string>())
        }
        if (taxonomyValue) {
          groupsMap.get(taxonomyName)?.add(taxonomyValue)
        }
      })

      cachedThumbnailGridTaxonomyGroups = Array.from(groupsMap.entries()).map(([taxonomyName, valuesSet]) => ({
        taxonomyName,
        values: Array.from(valuesSet),
      }))

      cachedThumbnailGridOptions = [
        { label: 'Off', value: '' },
        ...options
          .filter((option) => Boolean(option.taxonomyValue?.trim()))
          .map((option) => ({
            label: `${option.taxonomyName}: ${option.taxonomyValue}`,
            value: `${option.taxonomyName}::${option.taxonomyValue}`,
          })),
      ]

      return cachedThumbnailGridOptions
    })
    .finally(() => {
      thumbnailGridTaxonomyOptionsInFlight = null
    })
  return thumbnailGridTaxonomyOptionsInFlight
}

export function getThumbnailGridTaxonomyOptions(): { label: string; value: string }[] {
  if (cachedThumbnailGridOptions.length === 0) {
    return [{ label: 'Off', value: '' }]
  }

  return cachedThumbnailGridOptions
}

export function getThumbnailGridTaxonomyGroups(): { taxonomyName: string; values: string[] }[] {
  return cachedThumbnailGridTaxonomyGroups
}

// Generate options for dropdown
export function getStoryOptions(): { label: string; value: string }[] {
  const stories = getStories()
  return [
    { label: '--- Select Story ---', value: '' },
    ...stories.map((story) => ({
      label: story.headline,
      value: story.id,
    }))
  ];
}

// Generate options for dropdown with only latest N stories
export function getLatestStoryOptions(limit: number = 5): { label: string; value: string }[] {
  const stories = [...getStories()]
  // Sort by createdAt descending
  stories.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    return dateB - dateA
  })
  return stories.slice(0, limit).map((story) => ({
    label: story.headline,
    value: story.id,
  }))
}

// Find story by ID
export function findStoryById(id: string): Story | undefined {
  const currentStories = getStories()
  return currentStories.find((story) => story.id === id)
}

