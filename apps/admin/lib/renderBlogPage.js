import { getClientAdScript } from "./helpers/clientAdScript";
import { PUBLISHED_PAGE_STYLES } from "../src/generated/publishedPageStyles";
import { renderCampaignAd } from "./helpers/renderAds";
import {
  buildPopupAdHtml,
  renderAccountCard,
  renderAtlanticNavbar,
  renderBlogBodyCard,
  renderBlogGrid,
  renderBlogHeading,
  renderBlogImageCard,
  renderBlogMainTitle,
  renderBlogPostCard,
  renderBlogRecomCard,
  renderBlogShowcaseCard,
  renderBlogSubHeading,
  renderBlogTitle,
  renderBorder,
  renderFooter,
  renderLoginForm,
  renderPopularBlogCard,
  renderSectionBottomGrid,
  renderSectionGrid,
  renderShareCard,
  resolveActivePopupCampaign
} from "./helpers/renderFunctions";
import { analyticsTags } from '../src/helpers/analyticsTags';

/**
 * @typedef {Object} RenderContext
 * @property {Record<string, any[]>} zones
 * @property {Record<string, any>} storiesById
 * @property {string[]} sections
 * @property {any[]} [allAuthors]
 */

//  * FINAL COMPONENT REGISTRY — FULL & READY TO USE
const ComponentRegistry = {

  /* ------------------------------------------------
   * 1️⃣  NAVIGATION / HEADER
   * ------------------------------------------------*/
  AtlanticNavbar: (props, ctx) => {

    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};

    return renderAtlanticNavbar({
      id: props.id,
      sections: ctx.sections ?? [],
      activeSection: overrideStory?.section ?? 'HOME',
      showSignIn: props.showSignIn ?? false,
      showSupportUs: resolveToggle(props, ['showSupportUs', 'supportUsVisible', 'showSupportButton', 'showSubscribeButton'], ['hideSupportUs', 'supportUsHidden', 'hideSupportButton', 'hideSubscribeButton'], false),
      showBecomeMember: props.showBecomeMember ?? true,
      showFacebookIcon: resolveToggle(props, ['showFacebookIcon', 'showFacebook', 'facebookVisible'], ['hideFacebookIcon', 'hideFacebook', 'facebookHidden'], true),
      showLinkedInIcon: resolveToggle(props, ['showLinkedInIcon', 'showLinkedinIcon', 'showLinkedIn', 'showLinkedin', 'linkedInVisible', 'linkedinVisible'], ['hideLinkedInIcon', 'hideLinkedinIcon', 'hideLinkedIn', 'hideLinkedin', 'linkedInHidden', 'linkedinHidden'], true),
      storiesById: ctx.storiesById ?? {},
      showBanner: props.showBanner ?? false,
      bannerText: props.bannerText,
      bannerBgColor: props.bannerBgColor,
      bannerTextColor: props.bannerTextColor,
      supportUsText: props.supportUsText,
      supportUsBgColor: props.supportUsBgColor,
      supportUsTextColor: props.supportUsTextColor,
      signInText: props.signInText,
      signInBgColor: props.signInBgColor,
      signInTextColor: props.signInTextColor,
      becomeMemberText: props.becomeMemberText,
      becomeMemberBgColor: props.becomeMemberBgColor,
      becomeMemberTextColor: props.becomeMemberTextColor,
      themeColor: props.themeColor,
    })
  },

  /* ------------------------------------------------
   * 2️⃣  GRID WRAPPER WITH ZONES
   * ------------------------------------------------*/
  BlogGrid: (props, ctx) =>
    renderBlogGrid(props, ctx.zones, ctx.storiesById, ctx),

  /* ------------------------------------------------
   * 3️⃣  STORY CARDS
   * ------------------------------------------------*/
  BlogPostCard: (props, ctx) => {
    // Load the REAL story from ctx (set by PublishDrawer/republishAll) or localStorage fallback
    let overrideStory = (ctx && ctx.currentStory && Object.keys(ctx.currentStory).length > 0)
      ? ctx.currentStory : null;
    if (!overrideStory) {
      try {
        if (typeof localStorage !== 'undefined') {
          const item = localStorage.getItem('currentStory');
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) overrideStory = parsed;
          }
        }
      } catch (e) { }
    }

    if (overrideStory) {
      // Use the story's OWN id as the map key so the lookup inside renderBlogPostCard always hits
      const storyId = overrideStory.id || overrideStory.storyId || props.storyId || 'current-story';
      const customStoriesMap = { [storyId]: overrideStory };
      return renderBlogPostCard({ ...props, storyId }, ctx.zones, customStoriesMap, ctx);
    }

    // No override — fall through to whatever storiesById the template had
    return renderBlogPostCard(props, ctx.zones, ctx.storiesById || {}, ctx);
  },
  BlogRecomCard: (props, ctx) =>
    renderBlogRecomCard(props, ctx.storiesById),

  BlogPostCardPreview: (props, ctx) =>
    renderBlogPostCard(props, ctx.zones, ctx.storiesById), // optional alias

  BlogMoreStoriesCard: () => '',

  BlogMainTitle: (props, ctx) => {
    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};
    const storyId = props.storyId || overrideStory.id;
    const storiesMap = {
      ...(ctx.storiesById || {}),
      ...(storyId ? { [storyId]: overrideStory } : {})
    };
    return renderBlogMainTitle({ ...props, storyId }, storiesMap);
  },

  BlogSubHeading: (props, ctx) => {
    const story = ctx.currentStory || {};
    const displayTime = story.publishedAt || story.publishDate || story.createdAt || props.time || "18 minutes ago";
    const displaySection = story.section || story.category || props.category || "CATEGORY";
    let formattedTime = displayTime;
    if (displayTime && displayTime !== "18 minutes ago" && !isNaN(Date.parse(displayTime))) {
      try {
        formattedTime = new Date(displayTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        // ignore
      }
    }
    return renderBlogSubHeading({ id: props.id, time: formattedTime, category: displaySection }, props.id || "subheading");
  },

  BlogImageCard: (props, ctx) => {
    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};
    const storyId = props.storyId || overrideStory.id;
    const storiesMap = {
      ...(ctx.storiesById || {}),
      ...(storyId ? { [storyId]: overrideStory } : {})
    };
    return renderBlogImageCard({ ...props, storyId }, storiesMap);
  },

  BlogTitle: (props, ctx) => {
    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};
    const storyId = props.storyId || overrideStory.id;
    const storiesMap = {
      ...(ctx.storiesById || {}),
      ...(storyId ? { [storyId]: overrideStory } : {})
    };
    return renderBlogTitle({ ...props, storyId }, storiesMap, ctx.allAuthors || []);
  },

  BlogBodyCard: (props, ctx) => {
    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};
    const storyId = props.storyId || overrideStory.id;
    const storiesMap = {
      ...(ctx.storiesById || {}),
      ...(storyId ? { [storyId]: overrideStory } : {})
    };
    const bodyText = overrideStory?.fullDescription || overrideStory?.description?.blocks?.[0]?.data?.text || props.bodyText || "";
    // renderBlogBodyCard returns a plain HTML string — the desktop Spotlight fallback is
    // rendered separately by renderBlogGrid in the "blog-grid-right-5" sidebar zone
    // (matching PopularBlogCard's placement), not appended here.
    return renderBlogBodyCard({ ...props, storyId, bodyText }, storiesMap, ctx.campaigns || [], ctx.moreStoriesInjections || [], ctx.storiesById);
  },

  ShareCard: (props, ctx) => {
    const overrideStory = ctx.currentStory || JSON.parse(localStorage.getItem("currentStory") || "{}") || {};
    const displayTitle = overrideStory.headline || props.title || "Check this out!";
    const baseUrl = import.meta.env.VITE_CANONICAL_URL || "https://openpress.com";
    const toUrlSegment = (value) =>
      (value || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const rawSection = overrideStory.section || overrideStory.category || "news";
    const sectionSlug = toUrlSegment(rawSection);
    const rawSlug = overrideStory.slug || overrideStory.title || overrideStory.headline || "story";
    const storySlug = toUrlSegment(rawSlug);
    const fallbackUrl = `${baseUrl}/${sectionSlug}/${storySlug}.html`.replace(/^\/+/, '/');
    const displayUrl = overrideStory.publishUrl || overrideStory.publishedUrl || props.url || fallbackUrl;
    return renderShareCard({ title: displayTitle, url: displayUrl }, props.id || "share-card");
  },

  /* ------------------------------------------------
   * 4️⃣  HEADINGS
   * ------------------------------------------------*/
  BlogHeading: (props) =>
    renderBlogHeading(props),

  HeadingBlock: (props) =>
    renderBlogHeading(props), // alias if needed

  /* ------------------------------------------------
   * 5️⃣  POPULAR LISTS
   * ------------------------------------------------*/
  PopularBlogCard: (props, ctx) =>
    renderPopularBlogCard(props, ctx.storiesById),

  /* ------------------------------------------------
   * 6️⃣  SHOWCASE / FEATURED
   * ------------------------------------------------*/
  BlogShowcaseCard: (props, ctx) =>
    renderBlogShowcaseCard(props, ctx.storiesById),

  /* ------------------------------------------------
   * 7️⃣  SECTION COMPONENTS
   * ------------------------------------------------*/
  SectionGrid: (props, ctx) =>
    renderSectionGrid(props, ctx.zones, ctx.storiesById, ctx),

  SectionBottomCard: (props, ctx) =>
    renderSectionBottomGrid(props, ctx.zones, ctx.storiesById, ctx),

  Footer: (props) =>
    renderFooter(props),

  Border: (props) =>
    renderBorder({
      id: props.id,
      height: props.height,
      color: props.color,
    }),

  LeaderboardAd: (props, ctx) =>
    renderCampaignAd({ ...props, placementName: 'leaderboard', desktopDimensions: props.desktopDimensions || '728*90', mobileDimensions: props.mobileDimensions || '320*50' }, ctx),

  InStoryAd: (props, ctx) =>
    renderCampaignAd({ ...props, placementName: 'in_story', desktopDimensions: '300*250', mobileDimensions: '300*250' }, ctx),

  SidebarAd: (props, ctx) =>
    renderCampaignAd({ ...props, placementName: 'sidebar', desktopDimensions: '350*200', mobileDimensions: '350*200' }, ctx),

  LoginForm: (props, ctx) =>
    renderLoginForm(props, ctx),

  AccountCard: (props, ctx) =>
    renderAccountCard(props, ctx),
};

function toOptionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'show', 'visible'].includes(normalized)) return true;
    if (['false', '0', 'no', 'hide', 'hidden'].includes(normalized)) return false;
  }
  return undefined;
}

function resolveToggle(props, showKeys = [], hideKeys = [], defaultValue = true) {
  for (const key of showKeys) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const parsed = toOptionalBoolean(props[key]);
      if (typeof parsed === 'boolean') return parsed;
    }
  }

  for (const key of hideKeys) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const parsed = toOptionalBoolean(props[key]);
      if (typeof parsed === 'boolean') return !parsed;
    }
  }

  return defaultValue;
}




/***************************************************
 * MASTER PAGE RENDERER — converts full Puck JSON
 * into final static HTML.
 * @param {object} pageJson - The Puck JSON data
 * @param {object} [options] - Optional configuration
 * @param {string[]} [options.sections] - Navigation sections for the navbar
 ***************************************************/
export function renderPageFromPuckJSON(pageJson, options = {}) {
  if (!pageJson) return "<!-- invalid page -->";

  const { data, storiesById } = pageJson;
  const { content = [], zones = {} } = data || {};
  const sections = options.sections ?? [];
  const allAuthors = options.authors ?? [];
  console.log("all authors in render function >>>", allAuthors);
  const baseUrl = import.meta.env.VITE_CANONICAL_URL || "https://openpress.com";
  const backendApi = import.meta.env.VITE_BACKEND_API || '';

  const toUrlSegment = (value) =>
    (value || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const currentStory = options.currentStory || {};
  const rawSection = currentStory.section || currentStory.category || "news";
  const sectionSlug = toUrlSegment(rawSection);
  const rawSlug = currentStory.slug || currentStory.title || currentStory.headline || "story";
  const storySlug = toUrlSegment(rawSlug);

  const canonicalOverride = (options.canonicalUrl || currentStory.canonicalUrl || "").trim();

  let canonicalUrl = canonicalOverride || options.publishUrl || currentStory.publishUrl ||
    `${baseUrl}/${sectionSlug}/${storySlug}.html`.replace(/^\/+/, '/');

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

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    try {
      const origin = new URL(canonicalUrl).origin;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch (e) {
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  };

  const ogTitle = options.ogTitle || currentStory.title || currentStory.headline || pageJson.pageType || "Page";
  const ogImage = toAbsoluteUrl(options.ogImage || currentStory.socialImage || currentStory.imageUrl || currentStory.image || "");
  const finalOgDescription = options.ogDescription || currentStory.storySummary || currentStory.summary || "";

  const publishedTime = currentStory.publishedAt || currentStory.publishDate || currentStory.createdAt || new Date().toISOString();
  const modifiedTime = currentStory.updatedAt || publishedTime;
  const authorName = currentStory.authorName || currentStory.author || "OpenPress";
  const keywords = options.keywords ?? currentStory.keywords ?? [];

  /***************************************************
   * Render drop zone content
   ***************************************************/
  function renderZone(zoneName) {
    const zoneItems = zones[zoneName] || [];
    return zoneItems
      .map((block) => renderComponent(block))
      .join("");
  }

  const renderedBlockIds = new Set();
  const moreStoriesInjections = [];
  // Multiple top-level components on this page can each independently resolve to
  // the same active Spotlight campaign (e.g. both BlogGrid and SectionGrid, or
  // more than one SectionGrid instance) — a fresh `ctx` is built per top-level
  // component below, so `ctx.currentStory` alone can't tell them apart. This
  // page-scoped flag ensures the desktop sidebar fallback card is only ever
  // injected once, by whichever component renders first.
  let spotlightSidebarAdClaimed = false;
  const claimSpotlightSidebarAd = () => {
    if (spotlightSidebarAdClaimed) return false;
    spotlightSidebarAdClaimed = true;
    return true;
  };

  const allBlocks = [
    ...content,
    ...Object.values(zones).flat(),
  ];

  for (const block of allBlocks) {
    if (block?.type === 'BlogMoreStoriesCard' && block.props) {
      const insertAfterParagraph = Number(block.props.insertAfterParagraph) || 0;
      const stories = Array.isArray(block.props.stories) ? block.props.stories : [];
      const headingColor = block.props.headingColor;
      if (insertAfterParagraph > 0) {
        moreStoriesInjections.push({ insertAfterParagraph, stories, headingColor });
      }
    }
  }

  /***************************************************
   * Render ANY component using registry
   ***************************************************/
  function renderComponent(block) {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;
    const blockId = props.id || block.id;

    // Check if this block has already been rendered (e.g. as a fallback for an ad)
    if (blockId && renderedBlockIds.has(blockId)) {
      console.log(`Skipping duplicate block with ID: ${blockId}`);
      return "";
    }

    console.log("type >>>>", type);
    let renderer = ComponentRegistry[type];

    // Fallback for dynamically generated Ad components from Page Studio
    if (!renderer && type.startsWith('Ad_')) {
      const placementName = type.replace('Ad_', '').replace(/_/g, '-');
      renderer = (p, c) => renderCampaignAd({
        ...p,
        placementName: placementName,
      }, c);
    }

    if (!renderer) {
      console.warn("⚠️ Unknown component:", type);
      return `<!-- unknown component: ${type} -->`;
    }

    // Create RenderContext for the renderer
    const ctx = {
      zones,
      storiesById: storiesById ?? {},
      sections: sections ?? [],
      authorName, // Using the correctly initialized authorName
      allAuthors,
      campaigns: options.campaigns || [],
      currentStory: currentStory,
      extraRenderers: ComponentRegistry,
      moreStoriesInjections,
      renderedBlockIds: renderedBlockIds, // Pass the set to allow components to mark their fallbacks
      claimSpotlightSidebarAd,
    };

    const result = renderer(props, ctx);

    // Mark this block as rendered
    if (blockId) {
      renderedBlockIds.add(blockId);
    }

    return result;
  }

  /***************************************************
   * Render all content blocks (top-level)
   ***************************************************/
  const contentHTML = content
    .map((block) => renderComponent(block))
    .join("\n");

  // console.log("contentHtml >>>", contentHTML);

  /***************************************************
   * Popup Ad — page-wide overlay, injected once here (not as a Puck block,
   * since it floats above the whole page rather than living in a zone).
   ***************************************************/
  const { job: popupJob, campaign: popupCampaign } = resolveActivePopupCampaign(options.campaigns || []);
  const popupAdHtml = popupJob ? buildPopupAdHtml(popupJob, popupCampaign) : '';

  /***************************************************
* Safely escape HTML to prevent breaking markup
***************************************************/
  function escapeHtml(str) {
    if (str == null) return "";

    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }


  /***************************************************
   * Wrap content in exported layout
   ***************************************************/
  return `
<!DOCTYPE html>
<html lang="en">
<head>
${analyticsTags()}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="theme-color" content="#ffffff" />

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph Meta Tags for Social Sharing -->
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(finalOgDescription)}" />
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
  ${ogImage ? `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />` : ""}
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="fb:app_id" content="966242223397117" />
  <meta property="og:type" content="article" />

  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(finalOgDescription)}" />
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}

  <!-- General Meta -->
  <meta name="description" content="${escapeHtml(finalOgDescription)}" />
  ${keywords.length > 0 ? `<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />` : ""}

  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": ogTitle,
    "description": finalOgDescription,
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
        "url": `${baseUrl}/openpress-logo-full-nobg-trim.png`,
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
    .font-share { font-family: 'Share Tech Mono', monospace !important; }
    .font-lato { font-family: 'Lato', sans-serif !important; }
    .font-merriweather { font-family: 'Merriweather', serif !important; }
    .font-libre { font-family: 'Libre Franklin', sans-serif !important; }

    /* Fix recommendation card styling when inside a thumbnail grid on mobile */
    @media (max-width: 639px) {
      .thumbnail-grid-mobile-2x2 .recommend-card-content {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
      }
      .thumbnail-grid-mobile-2x2 .recommend-card-content .font-libre {
        font-size: 1.25rem !important;
        line-height: 1.15 !important;
      }
    }

    /* Mobile view responsive image width fix for inline figures & article content.
       The div[style*=max-width] selector additionally catches the no-ads/no-more-
       stories fallback body path (renderBlogBodyCard's plain-text/fullDescription
       branch), which reuses PublishDrawer.jsx's un-classed image markup. */
    @media (max-width: 768px) {
      figure.article-inline-figure,
      figure.story-image-figure,
      figure.story-image-wrap-figure,
      .story-image-block,
      .story-image-wrap-block,
      .image-wrap-tune,
      .inline-image-wrap,
      .story-wrapped-paragraph > div,
      .blog-body-content div[style*="max-width"] {
        max-width: 100% !important;
        width: 100% !important;
        float: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      figure.article-inline-figure img,
      figure.story-image-figure img,
      figure.story-image-wrap-figure img,
      .story-image-block img,
      .story-image-wrap-block img,
      .image-wrap-tune img,
      .inline-image-wrap img,
      .story-wrapped-paragraph img,
      .blog-body-content div[style*="max-width"] img {
        max-width: 100% !important;
        width: 100% !important;
        height: auto !important;
        display: block !important;
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
      // Inject campaigns data for client-side ad tracking
      const campaigns = ${JSON.stringify(options.campaigns || []).replace(/</g, '\\u003c')};

      ${getClientAdScript('sidebar')}
    })();
  </script>
</body>
  <script>window.__openPress_API__ = '${backendApi}';</script>
</html>
  `;
}
