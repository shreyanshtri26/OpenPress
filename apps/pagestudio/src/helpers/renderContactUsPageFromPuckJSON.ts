import { PUBLISHED_PAGE_STYLES } from "../generated/publishedPageStyles";
import { ComponentRegistry } from './registry/ComponentRegistry';
import type { RenderContext } from './core/renderTypes';
import { popupAdHtmlFor } from './renderers/renderPopupAd';
import { renderDynamicAd } from './renderers/renderDynamicAd';

type PuckBlock = {
  type: string;
  props?: Record<string, any>;
};

type PuckData = {
  content?: PuckBlock[];
  zones?: Record<string, PuckBlock[]>;
};

type PageJson = {
  pageType?: string;
  data?: PuckData;
  storiesById?: Record<string, any>;
  sections?: string[];
  activeSection?: string;
  campaigns?: any[];
};

/* --------------------------------------------------
 * MASTER CONTACT US PAGE RENDERER
 * Converts Contact Us Puck JSON into full static HTML
 * -------------------------------------------------- */
export function renderContactUsPageFromPuckJSON(
  pageJson: PageJson | null | undefined
): string {
  if (!pageJson) return "<!-- invalid contact us page -->";

  const { data, storiesById, sections, activeSection, campaigns } = pageJson;
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
      activeSection: activeSection ?? 'CONTACT',
      campaigns: campaigns ?? [],
      extraRenderers: ComponentRegistry,
      pageType: 'ContactUs',
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
   * CONTACT US PAGE SEO
   * -------------------------------------------------- */
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const ogTitle = `Contact Us — ${siteName}`;
  const ogDescription = `Get in touch with ${siteName}. We'd love to hear from you.`;
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || "https://openpress.com";
  const canonicalUrl = `${baseUrl}/contact-us`.replace(/([^:]\/)\/+/g, "$1");
  const ogImage = `${baseUrl}/openpress-logo-full-nobg-trim.png`;

  /* --------------------------------------------------
   * Final HTML document
   * -------------------------------------------------- */
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    if (window.location.hostname.match(/^(uat|dev)\./)) {
      document.write('<meta name="robots" content="noindex, nofollow" />');
    } else {
      document.write('<meta name="robots" content="index, follow" />');
    }
  </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark" />
    <title>${escapeHtml(ogTitle)}</title>
    
    <!-- Meta Tags -->
    <meta name="description" content="${escapeHtml(ogDescription)}">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:image" content="${ogImage}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${canonicalUrl}">
    <meta property="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta property="twitter:description" content="${escapeHtml(ogDescription)}">
    <meta property="twitter:image" content="${ogImage}">

    <!-- Icons and manifest (the files the site actually serves) -->
    <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-title" content="${siteName}" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1d1d1f" media="(prefers-color-scheme: dark)" />

    <!-- Performance: Preconnect -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Share+Tech+Mono&family=Lato:wght@300;400;700&family=Libre+Franklin:wght@400;700&family=Space+Mono&family=Cormorant+Garamond&family=JetBrains+Mono&display=swap" rel="stylesheet">

    <!-- Tailwind (compiled, inlined to avoid FOUC) -->
    <style>${PUBLISHED_PAGE_STYLES}</style>

    <style>
      html, body { margin: 0; padding: 0; }
      .font-merriweather { font-family: 'Merriweather', serif !important; }
      .font-sans { font-family: 'Public Sans', sans-serif !important; }
      .font-share { font-family: 'Share Tech Mono', monospace !important; }
      .font-lato { font-family: 'Lato', sans-serif !important; }
      .font-libre { font-family: 'Libre Franklin', sans-serif !important; }
    </style>
</head>
<body>
    <div id="root">
        ${contentHTML}
    </div>
${popupAdHtmlFor(campaigns, data)}
</body>
</html>`;
}
