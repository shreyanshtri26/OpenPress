import { PUBLISHED_PAGE_STYLES } from "../generated/publishedPageStyles";
import { ComponentRegistry } from './registry/ComponentRegistry';
import { wrapRootBlock, rootProps } from './core/wrapRootBlock';
import { publicCampaignsJson } from './core/campaignStatus';
import { getClientAdScript } from './renderers/clientAdScript';
import type { RenderContext } from './core/renderTypes';
import { renderDynamicAd } from './renderers/renderDynamicAd';
import { renderSpotlightAd } from './renderers/renderSpotlightAd';
import { popupAdHtmlFor } from './renderers/renderPopupAd';
import { replaceUnpublishedStories } from './renderers/automaticGridZones';
import { analyticsTags } from './analyticsTags';

type PuckBlock = {
  type: string;
  props?: Record<string, any>;
};

type PuckData = {
  content?: PuckBlock[];
  zones?: Record<string, PuckBlock[]>;
};

type Story = {
  title?: string;
  summary?: string;
  image?: string;
  updatedAt?: string;
  [key: string]: any;
};

type HomePageJson = {
  pageType?: string;
  data?: PuckData;
  storiesById?: Record<string, Story>;
  sections?: string[];
  activeSection?: string;
  campaigns?: any[];
};



/* --------------------------------------------------
 * MASTER HOME PAGE RENDERER
 * Converts Home Puck JSON into full static HTML
 * -------------------------------------------------- */
export function renderHomePageFromPuckJSON(
  pageJson: HomePageJson | null | undefined
): string {
  if (!pageJson) return "<!-- invalid home page -->";

  const { storiesById, sections, activeSection, campaigns } = pageJson;
  // A card pinned to a deactivated story shows the latest unused story instead of a placeholder.
  const data = replaceUnpublishedStories(pageJson.data, storiesById);
  const content: PuckBlock[] = data?.content ?? [];
  const zones: Record<string, PuckBlock[]> = data?.zones ?? {};

  // Pre-count ThumbnailGrid blocks so each renderer knows its position
  const thumbnailGridTotal = content.filter(b => b.type === 'ThumbnailGrid').length;
  let thumbnailGridIndex = 0;

  /* --------------------------------------------------
   * Render zone content
   * -------------------------------------------------- */
  // function renderZone(zoneName: string): string {
  //     const zoneItems = zones[zoneName] ?? [];
  //     return zoneItems.map(renderComponent).join("");
  // }

  /* --------------------------------------------------
   * Render any component via registry
   * -------------------------------------------------- */
  function renderComponent(block: PuckBlock | null | undefined): string {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;
    let renderer = ComponentRegistry[type];

    // Handle dynamic ad placements
    if (!renderer && type.startsWith('Ad_')) {
      // Spotlight Ad blocks use the scroll-experience renderer, not the static image renderer
      if (type.toLowerCase().includes('spotlight')) {
        renderer = (p: any, ctx: RenderContext) => renderSpotlightAd({
          id: p.id,
          adId: p.adId,
          linkUrl: p.linkUrl,
          altText: p.altText,
          fallbackStoryId: p.fallbackStoryId,
          fallbackAllowed: p.fallbackAllowed,
          _autoFallbackStoryId: p._autoFallbackStoryId,
          _autoFallbackTitle: p._autoFallbackTitle,
          _autoFallbackLabel: p._autoFallbackLabel,
          _autoFallbackImageUrl: p._autoFallbackImageUrl,
          _autoFallbackPublishUrl: p._autoFallbackPublishUrl,
        }, ctx);
      } else {
        renderer = renderDynamicAd as any;
      }
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
      activeSection: activeSection ?? 'HOME',
      campaigns: campaigns ?? [],
      extraRenderers: ComponentRegistry,
      pageType: pageJson?.pageType || 'Home',
    };

    // Inject grid-position props into ThumbnailGrid blocks for mobile layout
    let finalProps = props;
    if (type === 'ThumbnailGrid') {
      finalProps = { ...props, thumbnailGridIndex: thumbnailGridIndex++, thumbnailGridTotal };
    }

    return wrapRootBlock(type, renderer(rootProps(type, finalProps), ctx));
  }

  /* --------------------------------------------------
   * Render top-level content
   * -------------------------------------------------- */
  const contentHTML: string = content.map(renderComponent).join("\n");

  /* --------------------------------------------------
   * Popup Ad — page-wide overlay, injected once here (not as a Puck block,
   * since it floats above the whole page rather than living in a zone).
   * -------------------------------------------------- */
  const popupAdHtml = popupAdHtmlFor(campaigns ?? [], data);

  /* --------------------------------------------------
   * HTML escape (meta only)
   * -------------------------------------------------- */
  function escapeHtml(str: string | null | undefined): string {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* --------------------------------------------------
   * HOME SEO STRATEGY
   * -------------------------------------------------- */
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const twitterHandle = (import.meta as any).env?.VITE_TWITTER_HANDLE || "@shreyanshtri26";
  const ogTitle = `${siteName} | Free, independent news for everyone`;
  const ogDescription =
    `${siteName} is a free, open publishing platform for independent journalism, covering news, politics, culture and more. Every article is free to read.`;
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || "https://openpress.com";
  const ogImage = `${baseUrl}/openpress-logo-full-nobg-trim.png`;
  const canonicalUrl = `${baseUrl}/`.replace(/([^:]\/)\/+/g, "$1");

  /* --------------------------------------------------
   * Final HTML document
   * -------------------------------------------------- */
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1d1d1f" media="(prefers-color-scheme: dark)" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(siteName)}" />

  <title>${escapeHtml(ogTitle)}</title>

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Meta -->
  <meta name="description" content="${escapeHtml(ogDescription)}" />

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&family=Libre+Franklin:wght@400;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />

  <style>
    html, body { margin: 0; padding: 0; }

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
  </style>
</head>

  <body>
    <div id="root">
      ${contentHTML}
    </div>

    ${popupAdHtml}

    <script>
      (function() {
        // Safe stringification for campaigns
        const campaigns = ${publicCampaignsJson(campaigns || [])};
        ${getClientAdScript('sidebar')}
      })();
    </script>
  </body>
</html>
  `;
}
