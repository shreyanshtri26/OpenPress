/* eslint-disable @typescript-eslint/no-explicit-any */

import { PUBLISHED_PAGE_STYLES } from "../../generated/publishedPageStyles";
import {
  renderMastheadNavbar,
  renderBlogGrid,
  renderBlogHeading,
  renderBlogPostCard,
  renderBlogRecomCard,
  renderBlogShowcaseCard,
  renderPopularBlogCard,
  renderBlogMoreStoriesCard,
  // PuckBlock,
  // BlogStory,
  // StoryMap,
  // RenderContext
} from "./renderFunctions";
import { renderSectionGrid } from '../renderers/renderSectionGrid';
import { renderSectionBottomGrid } from '../renderers/renderSectionBottomGrid';
import { resolveActivePopupCampaign, buildPopupAdHtml } from '../renderers/renderPopupAd';
import { getClientAdScript } from '../renderers/clientAdScript';
import { renderFooter } from "../renderers/renderFooter";
import { renderBorder } from "../renderers/renderBorder";
import { renderInStoryAd } from "../renderers/renderInStoryAd";
import { renderLeaderboardAd } from "../renderers/renderLeaderboardAd";
import { renderSidebarAd } from "../renderers/renderSidebarAd";
import { renderAdCard } from "../renderers/renderAdCard";
import { renderStoryCard } from "../renderers/renderStoryCard";
import { renderShowcaseCard } from "../renderers/renderShowcaseCard";
import { renderHoverCard } from "../renderers/renderHoverCard";
import { renderMultimediaCard } from "../renderers/renderMultimediaCard";
import { renderMainCard } from "../renderers/renderMainCard";
import { renderRecommendCard } from "../renderers/renderRecommendCard";
import { renderMostPopularCard } from "../renderers/renderMostPopularCard";
import { renderStorySubCard } from "../renderers/renderStorySubCard";
import { renderFeaturedCard } from "../renderers/renderFeaturedCard";
import { renderSidebarStoryCard } from "../renderers/renderSidebarStoryCard";
import { renderErrorCard } from "../renderers/renderErrorCard";
import { renderDynamicAd } from "../renderers/renderDynamicAd";
import { renderAboutUs } from '../renderers/renderAboutUs';
import { renderContactUs } from '../renderers/renderContactUs';
import { renderPrivacyPolicy } from '../renderers/renderPrivacyPolicy';
import { renderMediaCouncil } from '../renderers/renderMediaCouncil';
import { analyticsTags } from '../analyticsTags';

/* ==================================================
 * TYPE DEFINITIONS
 * ================================================== */

export type PuckBlock = {
  type: string;
  props?: Record<string, unknown>;
};

export interface BlogStory {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  fullDescription?: string;
  storySummary?: string;
  author?: string;
  authorName?: string;
  authorId?: string;
  category?: string;
  section?: string;
  slug?: string;
  image?: string;
  imageUrl?: string;
  socialImage?: string;
  socialHeadline?: string;
  imageAlt?: string;
  publishUrl?: string;
  canonicalUrl?: string;
  publishedAt?: string;
  readTime?: string;
  description?: any;
  Category?: string[]; // legacy support
  keywords?: [];
  updatedAt?: string;
  createdAt?: string;
}

export type StoryMap = Record<string, BlogStory>;

export interface RenderContext {
  zones: Record<string, PuckBlock[]>;
  storiesById: StoryMap;
  currentStory?: BlogStory | null;
  sections?: string[];
  allAuthors?: any[];
  campaigns?: any[];
  authorId?: string;
  authorName?: string;
  extraRenderers?: Record<string, (props: any, ctx: any) => string>;
  // Claims the single "desktop Spotlight sidebar ad" slot for this page render.
  // Returns true the first time it's called, false on every subsequent call —
  // used so multiple grid components (BlogGrid/SectionGrid, or several
  // SectionGrid instances) sharing the same currentStory don't each render
  // their own copy of the fallback card.
  claimSpotlightSidebarAd?: () => boolean;
}


interface PuckPageJson {
  data?: {
    content?: PuckBlock[];
    zones?: Record<string, PuckBlock[]>;
  };
  storiesById?: StoryMap;
  pageType?: string;
}

interface RenderOptions {
  sections?: string[];
  currentStory?: BlogStory | null;
  authors?: any[];
  campaigns?: any[];
  canonicalUrl?: string;
  publishUrl?: string;
}

type RendererFn = (props: Record<string, any>, ctx: RenderContext) => string;

/* ==================================================
 * COMPONENT REGISTRY
 * ================================================== */

const ComponentRegistry: Record<string, RendererFn> = {

  /* ------------------------------------------------
   * 1️⃣  NAVIGATION / HEADER
   * ------------------------------------------------*/
  AtlanticNavbar: (props: Record<string, any>, ctx: RenderContext): string => {
    // Extract the active section from current story if available
    const rawSection = ctx.currentStory?.section || 'HOME';
    const activeSection = rawSection.toString().trim().toUpperCase();
    console.log("active section in component registry of renderblogpage >>>", activeSection);

    return renderMastheadNavbar({
      ...props,
      sections: ctx.sections ?? [],
      activeSection: activeSection,
      storiesById: ctx.storiesById ?? {},
      showSignIn: props.showSignIn ?? false,
      showSupportUs: props.showSupportUs ?? false,
      showBecomeMember: props.showBecomeMember ?? true,
      showFacebook: props.showFacebook ?? true,
      showLinkedIn: props.showLinkedIn ?? true,
    });
  },

  /* ------------------------------------------------
   * 2️⃣  GRID WRAPPER WITH ZONES
   * ------------------------------------------------*/
  BlogGrid: (props: Record<string, any>, ctx: RenderContext): string =>
    renderBlogGrid(props, ctx.zones, ctx.storiesById, ctx),

  /* ------------------------------------------------
   * 3️⃣  STORY CARDS
   * ------------------------------------------------*/
  BlogPostCard: (props: Record<string, any>, ctx: RenderContext): string => {
    let sourceStory: BlogStory | null = ctx.currentStory || null;

    if (!sourceStory || Object.keys(sourceStory).length === 0) {
      // Fallback: Load from localStorage (preview mode)
      sourceStory = typeof localStorage !== 'undefined'
        ? JSON.parse(localStorage.getItem("currentStory") || "{}") || {}
        : {} as BlogStory;
    }

    // BlogPostCard has no default `storyId` prop, so it is frequently "" /
    // undefined at publish time. Falling back to the resolved story's own id
    // (or a stable sentinel) guarantees the map key used below always matches
    // the key the sub-renderers look up by — otherwise
    // `storyId ? storiesById[storyId] : null` short-circuits to null before
    // ever consulting the map, even though the map has the real story.
    const resolvedStoryId =
      props.storyId || sourceStory?.id || (sourceStory as any)?.storyId || "__current_story__";

    const customStoriesMap: StoryMap = {
      [resolvedStoryId]: sourceStory as BlogStory,
    };

    return renderBlogPostCard(
      { ...props, storyId: resolvedStoryId },
      ctx.zones,
      customStoriesMap,
      ctx
    );
  },

  BlogRecomCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderBlogRecomCard(props, ctx.storiesById),

  BlogPostCardPreview: (props: Record<string, any>, ctx: RenderContext): string =>
    renderBlogPostCard(props, ctx.zones, ctx.storiesById), // optional alias

  BlogMoreStoriesCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderBlogMoreStoriesCard(props as any, ctx.storiesById),

  /* ------------------------------------------------
   * 4️⃣  HEADINGS
   * ------------------------------------------------*/
  BlogHeading: (props: Record<string, any>): string =>
    renderBlogHeading(props),

  HeadingBlock: (props: Record<string, any>): string =>
    renderBlogHeading(props), // alias if needed

  /* ------------------------------------------------
   * 5️⃣  POPULAR LISTS
   * ------------------------------------------------*/
  PopularBlogCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderPopularBlogCard(props, ctx.storiesById),

  /* ------------------------------------------------
   * 6️⃣  SHOWCASE / FEATURED
   * ------------------------------------------------*/
  BlogShowcaseCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderBlogShowcaseCard(props, ctx.storiesById),

  /* ------------------------------------------------
   * 7️⃣  SECTION COMPONENTS
   * ------------------------------------------------*/
  SectionGrid: (props: Record<string, any>, ctx: RenderContext): string =>
    renderSectionGrid({
      id: props.id,
      className: props.className,
    }, ctx),

  SectionBottomCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderSectionBottomGrid({
      id: props.id,
      className: props.className,
    }, ctx),

  Footer: (props: Record<string, any>): string =>
    renderFooter(props),

  Border: (props: Record<string, any>): string =>
    renderBorder({
      id: props.id,
      height: props.height,
      color: props.color,
    }),

  InStoryAd: (props: Record<string, any>, ctx: RenderContext): string =>
    renderInStoryAd(props, ctx),

  LeaderboardAd: (props: Record<string, any>, ctx: RenderContext): string =>
    renderLeaderboardAd(props, ctx),

  SidebarAd: (props: Record<string, any>, ctx: RenderContext): string =>
    renderSidebarAd(props, ctx),

  AdCard: (props: Record<string, any>): string =>
    renderAdCard({ product: props.product }),

  StoryCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderStoryCard(props, ctx),

  ShowcaseCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderShowcaseCard(props, ctx),

  HoverCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderHoverCard(props, ctx),

  MultimediaCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMultimediaCard(props, ctx),

  MainCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMainCard(props, ctx),

  RecommendCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderRecommendCard(props, ctx),

  MostPopularTable: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMostPopularCard(props, ctx),

  StorySubCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderStorySubCard(props, ctx),

  FeaturedCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderFeaturedCard(props, ctx),

  SidebarStoryCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderSidebarStoryCard({
      id: props.id,
      storyId: props.storyId,
      isFirst: props.isFirst,
      isLast: props.isLast,
    }, ctx),

  ErrorCard: (props: Record<string, any>): string =>
    renderErrorCard(props),

  /* ------------------------------------------------
   * 8️⃣  STANDALONE PAGE COMPONENTS
   * These aren't filtered out of the Blog page's palette
   * (only excludedCommonComponents is), so they must be
   * registered here or they silently vanish on publish.
   * ------------------------------------------------*/
  AboutUs: (props: Record<string, any>, ctx: RenderContext): string =>
    renderAboutUs(props, ctx),

  ContactUs: (props: Record<string, any>, ctx: RenderContext): string =>
    renderContactUs(props, ctx),

  PrivacyPolicy: (props: Record<string, any>, ctx: RenderContext): string =>
    renderPrivacyPolicy(props, ctx),

  MediaCouncil: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMediaCouncil(props, ctx),

};


/* ==================================================
 * MASTER PAGE RENDERER
 * Converts full Puck JSON into final static HTML.
 * ================================================== */

export function renderPageFromPuckJSON(
  pageJson: PuckPageJson | null | undefined,
  options: RenderOptions = {}
): string {
  if (!pageJson) return "<!-- invalid page -->";

  const { data, storiesById } = pageJson;
  const { content = [], zones = {} } = data || {};
  const sections = options.sections ?? [];
  const currentStory = options.currentStory ?? null;
  console.log("current story in render page from puck json function >>>", currentStory);
  // Helper to strip HTML tags
  const stripHtml = (html: string | undefined | null): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '');
  };
  const rawDescription = currentStory?.storySummary || currentStory?.description?.blocks?.[0]?.data?.text || "";
  const ogDescription = stripHtml(rawDescription);
  const keywords = currentStory?.keywords ?? [];
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || "https://openpress.com";
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const twitterHandle = (import.meta as any).env?.VITE_TWITTER_HANDLE || "@shreyanshtri26";

  const toUrlSegment = (value: string): string =>
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const rawSection = currentStory?.section || currentStory?.category || "news";
  const sectionSlug = toUrlSegment(rawSection);
  const rawSlug = currentStory?.slug || currentStory?.title || currentStory?.headline || "story";
  const storySlug = toUrlSegment(rawSlug);
  const canonicalOverride = (options?.canonicalUrl || currentStory?.canonicalUrl || "").trim();

  let canonicalUrl =
    canonicalOverride ||
    currentStory?.publishUrl ||
    `${baseUrl}/${sectionSlug}/${storySlug}.html`.replace(/([^:]\/)\/+/g, "$1");

  try {
    if (canonicalOverride && canonicalUrl.startsWith('http')) {
      // Keep editorially provided canonical URL as-is, including external domains.
      canonicalUrl = new URL(canonicalUrl).href;
    } else if (canonicalUrl.startsWith('http')) {
      const urlObj = new URL(canonicalUrl);
      const baseObj = new URL(baseUrl);
      urlObj.protocol = baseObj.protocol;
      urlObj.host = baseObj.host;
      canonicalUrl = urlObj.href;
    } else {
      canonicalUrl = `${baseUrl}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}`;
    }
  } catch (e) {
    // Ignore URL parsing errors
  }

  const canonicalOrigin = (() => {
    try {
      return new URL(canonicalUrl).origin;
    } catch {
      return baseUrl;
    }
  })();

  const toAbsoluteUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const origin = canonicalOrigin || baseUrl;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  /* ==================================================
   * Safely escape HTML to prevent breaking markup
   * ================================================== */
  function escapeHtml(str: string | undefined | null): string {
    if (str == null) return "";

    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ==================================================
   * Render drop zone content
   * ================================================== */
  // function renderZone(zoneName: string): string {
  //     const zoneItems = zones[zoneName] || [];
  //     return zoneItems
  //         .map((block: PuckBlock) => renderComponent(block))
  //         .join("");
  // }

  /* ==================================================
   * Render ANY component using registry
   * ================================================== */
  // Multiple top-level components on this page (e.g. BlogGrid AND one or more
  // SectionGrid instances) can each independently resolve the same active
  // Spotlight campaign, since a fresh `ctx` is built per top-level component
  // below and they all share the same `currentStory`. This page-scoped flag
  // ensures the desktop sidebar fallback card is only ever injected once, by
  // whichever component renders first.
  let spotlightSidebarAdClaimed = false;
  const claimSpotlightSidebarAd = (): boolean => {
    if (spotlightSidebarAdClaimed) return false;
    spotlightSidebarAdClaimed = true;
    return true;
  };

  function renderComponent(block: PuckBlock | null | undefined): string {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;

    let renderer = ComponentRegistry[type];

    // Handle dynamic ad placements
    if (!renderer && type.startsWith('Ad_')) {
      renderer = renderDynamicAd as any;
    }

    if (!renderer) {
      console.warn("⚠️ Unknown component:", type);
      return `<!-- unknown component: ${type} -->`;
    }

    // Create RenderContext for the renderer
    const ctx: RenderContext = {
      zones,
      storiesById: storiesById ?? {},
      sections: sections ?? [],
      currentStory: currentStory, // Pass currentStory for batch publishing
      allAuthors: options.authors ?? [],
      campaigns: options.campaigns || (pageJson as any)?.campaigns || [],
      // Mirrors OpenPress/lib/renderBlogPage.js so the bottom grid filters the same way on both pipelines.
      authorName: currentStory?.authorName || currentStory?.author || 'OpenPress',
      authorId: currentStory?.authorId,
      extraRenderers: ComponentRegistry as any,
      claimSpotlightSidebarAd,
    };

    return renderer(props as Record<string, any>, ctx);
  }

  /* ==================================================
   * Render all content blocks (top-level)
   ================================================== */
  const contentHTML = content
    .map((block: PuckBlock) => renderComponent(block))
    .join("\n");

  console.log("contentHtml >>>", contentHTML);

  /* ==================================================
   * Popup Ad — page-wide overlay, injected once here (not as a Puck block,
   * since it floats above the whole page rather than living in a zone).
   * ================================================== */
  const { job: popupJob, campaign: popupCampaign } = resolveActivePopupCampaign(
    options.campaigns || (pageJson as any)?.campaigns || []
  );
  const popupAdHtml = popupJob ? buildPopupAdHtml(popupJob, popupCampaign) : '';

  /**
   * Safely stringify JSON for inclusion in a <script> tag.
   * Escapes < characters to prevent </script> from terminating the tag early.
   */
  function safeJsonStringify(data: any): string {
    return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  }

  /* ==================================================
   * Extract OG data from the story being displayed
   * ================================================== */
  // let ogDescription = "";

  // Helper function to recursively find BlogPostCard
  // function findBlogPostCard(blocks: PuckBlock[] | null | undefined): PuckBlock | null {
  //     if (!blocks) return null;

  //     for (const block of blocks) {
  //         if (block.type === "BlogPostCard" && block.props && (block.props as Record<string, any>).storyId) {
  //             return block;
  //         }
  //         // Check nested content
  //         const blockProps = block.props as Record<string, any> | undefined;
  //         if (blockProps && blockProps.content && Array.isArray(blockProps.content)) {
  //             const found = findBlogPostCard(blockProps.content);
  //             if (found) return found;
  //         }
  //     }
  //     return null;
  // }

  // // Look for BlogPostCard in content blocks
  // let blogPostCardBlock = findBlogPostCard(content);

  // // If not found in content, search in zones
  // if (!blogPostCardBlock && zones) {
  //     const allZoneBlocks = Object.values(zones).flat() as PuckBlock[];
  //     blogPostCardBlock = findBlogPostCard(allZoneBlocks);
  // }

  // // Extract story from BlogPostCard or use first story
  // let displayedStory: BlogStory | null = null;

  // if (blogPostCardBlock && blogPostCardBlock.props) {
  //     const blockProps = blogPostCardBlock.props as Record<string, any>;
  //     if (blockProps.storyId) {
  //         const storyId = blockProps.storyId as string;
  //         if (storiesById && storiesById[storyId]) {
  //             displayedStory = storiesById[storyId];
  //         }
  //     }
  // }

  // // If we found the displayed story, use it; otherwise fall back to first story
  // if (displayedStory) {
  //     ogDescription = displayedStory.summary || displayedStory.fullDescription?.substring(0, 160) || "";
  // } else if (storiesById && Object.keys(storiesById).length > 0) {
  //     // Fallback: use first story if no BlogPostCard found
  //     const firstStory = Object.values(storiesById)[0];
  //     if (firstStory) {
  //         ogDescription = firstStory.summary || firstStory.fullDescription?.substring(0, 160) || "";
  //     }
  // }

  /* ==================================================
   * Determine the final title to use (same logic as browser tab)
   * ================================================== */
  const storyTitle = currentStory?.socialHeadline || currentStory?.title || currentStory?.headline || "";
  const ogTitle =
    (typeof window !== "undefined" && window.__PUCK_FINAL_TITLE__) ||
    storyTitle ||
    pageJson.pageType ||
    "Page";
  const rawOgImage =
    currentStory?.socialImage ||
    currentStory?.imageUrl ||
    currentStory?.image ||
    (typeof window !== "undefined" ? window.__PUCK_FINAL_IMAGE__ : "") ||
    "/openpress-logo-full-nobg-trim.png";
  const ogImage = toAbsoluteUrl(rawOgImage);


  const publishedTime = currentStory?.publishedAt || currentStory?.updatedAt || currentStory?.createdAt;
  const modifiedTime = currentStory?.updatedAt || publishedTime;
  const authorName = currentStory?.authorName || currentStory?.author || siteName;
  /* ==================================================
   * Wrap content in exported layout
   * ================================================== */
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    if (window.location.hostname.match(/^(uat|dev)\./)) {
      document.write('<meta name="robots" content="noindex, nofollow" />');
    } else {
      document.write('<meta name="robots" content="index, follow" />');
    }
  </script>
    ${analyticsTags()}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(siteName)}" />
<title>${escapeHtml(ogTitle)}</title>

<!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph Meta Tags for Social Sharing -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
  ${ogImage ? `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />` : ""}
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="article" />
  
  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
  
  <!-- General Meta -->
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  ${keywords.length > 0 ? `<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />` : ""}
  <script type="application/ld+json">
    ${safeJsonStringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": ogTitle,
    "description": ogDescription,
    "image": ogImage ? [ogImage] : undefined,
    "datePublished": publishedTime,
    "dateModified": modifiedTime,
    "author": {
      "@type": "Person",
      "name": authorName,
    },
    "publisher": {
      "@type": "Organization",
      "name": "OpenPress",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl || ""}/openpress-logo-full-nobg-trim.png`.replace(/^\/+/, '/'),
      },
    },
    "mainEntityOfPage": canonicalUrl,
  })}
  </script>

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>

  <!-- Custom Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Libre+Franklin:wght@400;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    html, body { margin:0; padding:0; }
    body { font-family: Inter, sans-serif; background:#fff; }
    
    /* Custom font families for Tailwind CDN */
    .font-share { font-family: 'Share Tech Mono', monospace !important; font-synthesis: none; }
    .font-lato { font-family: 'Lato', sans-serif !important; }
    .font-merriweather { font-family: 'Merriweather', serif !important; }
    .font-libre { font-family: 'Libre Franklin', sans-serif !important; }
    
    /* Fix recommendation card styling when inside a thumbnail grid on mobile */
    @media (max-width: 639px) {
      .thumbnail-grid .recommend-card-content {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
      }
      .thumbnail-grid .recommend-card-content .font-libre {
        font-size: 1.25rem !important;
        line-height: 1.15 !important;
      }
    }
  </style>
</head>

<body>
  <div id="root">
    ${contentHTML}
  </div>

  ${popupAdHtml}

  <script>
    (function() {
      const campaigns = ${JSON.stringify(options.campaigns || (pageJson as any)?.campaigns || []).replace(/</g, '\\u003c')};
      ${getClientAdScript('sidebar-rectangle')}
    })();
  </script>
</body>
</html>
  `;
}
