import { PUBLISHED_PAGE_STYLES } from "../generated/publishedPageStyles";
import { ComponentRegistry } from './registry/ComponentRegistry';
import { getClientAdScript } from './renderers/clientAdScript';
import type { RenderContext } from './core/renderTypes';
import { renderDynamicAd } from './renderers/renderDynamicAd';
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
};

type ErrorPageJson = {
  pageType?: string;
  data?: PuckData;
  storiesById?: Record<string, Story>;
  sections?: string[];
  campaigns?: any[];
};


/* --------------------------------------------------
 * ERROR PAGE RENDERER
 * Converts Error Puck JSON into full static HTML
 * -------------------------------------------------- */
export function renderErrorPageFromPuckJSON(
  pageJson: ErrorPageJson | null | undefined
): string {
  if (!pageJson) return "<!-- invalid error page -->";

  const { data, storiesById, sections, campaigns } = pageJson;
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
      activeSection: 'ERROR',
      campaigns: campaigns ?? [],
      extraRenderers: ComponentRegistry,
      pageType: 'Error',
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
   * ERROR PAGE SEO
   * -------------------------------------------------- */
  /* --------------------------------------------------
   * ERROR PAGE SEO
   * -------------------------------------------------- */
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const twitterHandle = (import.meta as any).env?.VITE_TWITTER_HANDLE || "@shreyanshtri26";
  const ogTitle = `Page Not Found — ${siteName}`;
  const ogDescription = "The page you're looking for doesn't exist or has been moved.";
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || "https://openpress.com";
  const ogImage = `${baseUrl}/openpress-logo-full-nobg-trim.png`;

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
  <meta name="theme-color" content="#ffffff" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(siteName)}" />

  <title>${escapeHtml(ogTitle)}</title>

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  
  <!-- Meta -->
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta name="robots" content="noindex, nofollow" />

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
  </style>
</head>

<body>
  <div id="root">
    ${contentHTML}
  </div>

  <script>
      (function() {
        // Safe stringification for campaigns
        const campaigns = ${JSON.stringify(campaigns || []).replace(/</g, '\\u003c')};
        ${getClientAdScript('sidebar-rectangle')}
      })();
    </script>
</body>
</html>
  `;
}
