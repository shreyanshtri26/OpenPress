import { PUBLISHED_PAGE_STYLES } from "../generated/publishedPageStyles";
import { findAuthorById } from '../components/PuckEditor/authorData';
import { publicCampaignsJson } from './core/campaignStatus';
import { ComponentRegistry } from './registry/ComponentRegistry';
import { getClientAdScript } from './renderers/clientAdScript';
import type { RenderContext } from './core/renderTypes';
import { renderDynamicAd } from './renderers/renderDynamicAd';
import { popupAdHtmlFor } from './renderers/renderPopupAd';
import { analyticsTags } from './analyticsTags';

type PuckBlock = {
  type: string;
  props?: Record<string, any>;
};

type PuckData = {
  content?: PuckBlock[];
  zones?: Record<string, PuckBlock[]>;
};

type AuthorPageJson = {
  pageType?: string;
  data?: PuckData;
  storiesById?: Record<string, any>;
  sections?: string[];
  activeSection?: string;
  authorName?: string;
  authorId?: string;
  campaigns?: any[];
};

/* --------------------------------------------------
 * MASTER AUTHOR PAGE RENDERER
 * Converts Single Author Puck JSON into full static HTML
 * -------------------------------------------------- */
export function renderAuthorPageFromPuckJSON(
  pageJson: AuthorPageJson | null | undefined
): string {
  if (!pageJson) return "<!-- invalid author page -->";

  const { data, storiesById, sections, activeSection, authorId, campaigns } = pageJson;
  const content: PuckBlock[] = data?.content ?? [];
  const zones: Record<string, PuckBlock[]> = data?.zones ?? {};

  /* --------------------------------------------------
   * Render any component via registry
   * -------------------------------------------------- */
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
      activeSection: activeSection ?? 'HOME',
      authorId: authorId,
      authorName: pageJson?.authorName,
      campaigns: campaigns ?? [],
      extraRenderers: ComponentRegistry,
      pageType: pageJson?.pageType || 'Author',
    };

    return renderer(props, ctx);
  }

  /* --------------------------------------------------
   * Render top-level content
   * -------------------------------------------------- */
  const contentHTML: string = content.map(renderComponent).join("\n");

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
   * AUTHOR PAGE SEO
   * -------------------------------------------------- */
  const authorName = pageJson.authorName || "Author";
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const twitterHandle = (import.meta as any).env?.VITE_TWITTER_HANDLE || "@shreyanshtri26";
  const ogTitle = `${authorName} — ${siteName}`;
  const ogDescription = `Read all stories by ${authorName} on ${siteName}.`;
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || "https://openpress.com";

  // Slugify author name for canonical URL
  const slugify = (val: string) => val.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const authorSlug = slugify(authorName);
  const canonicalUrl = `${baseUrl}/authors/${authorSlug}`.replace(/([^:]\/)\/+/g, "$1");

  // Resolve author image for social sharing (especially mobile previews)  let authorImage = "/openpress-logo-full-nobg-trim.png";
  let authorImage = "/openpress-logo-full-nobg-trim.png";
  if (data?.content) {
    const profileBlock = data.content.find(b => b.type === "AuthorProfile");
    if (profileBlock?.props?.image) {
      authorImage = profileBlock.props.image;
    } else if (profileBlock?.props?.imageUrl) {
      authorImage = profileBlock.props.imageUrl;
    }
  }


  if ((!authorImage || authorImage === "/openpress-logo-full-nobg-trim.png") && authorId) {
    const matchedAuthor = findAuthorById(authorId);
    if (matchedAuthor?.image) {
      authorImage = matchedAuthor.image;
    }
  }

  const toAbsoluteUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const ogImage = toAbsoluteUrl(authorImage);

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
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="profile" />

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

    .bg-graph-paper {
      background-color: #ffffff;
      background-image:
        linear-gradient(#e8e9ee 0.75px, transparent 0.75px),
        linear-gradient(90deg, #e8e9ee 0.75px, transparent 0.75px);
      background-size: 10px 10px;
    }
  </style>
</head>

<body>
  <div id="root">
    ${contentHTML}
  </div>

  <script>
      (function() {
        // Safe stringification for campaigns
        const campaigns = ${publicCampaignsJson(campaigns || [])};
        ${getClientAdScript('sidebar-rectangle')}
      })();
    </script>
${popupAdHtmlFor(campaigns, data)}
</body>
</html>
  `;
}
