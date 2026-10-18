
import { renderAuthorProfile, renderAuthorCard, renderAuthorsGrid, renderAuthorsGridManual } from "./helpers/renderAuthorFunctions";
import { renderAtlanticNavbar, renderFooter, renderBorder, renderSectionGrid, renderSectionBottomGrid, renderBlogGrid, renderPopularBlogCard, renderBlogShowcaseCard } from "./helpers/renderFunctions";
import { renderCampaignAd } from "./helpers/renderAds";
import { getClientAdScript } from "./helpers/clientAdScript";
import { PUBLISHED_PAGE_STYLES } from "../src/generated/publishedPageStyles";
import { analyticsTags } from '../src/helpers/analyticsTags';


const AuthorComponentRegistry = {
  AtlanticNavbar: (props, ctx) => {
    return renderAtlanticNavbar({
      ...props,
      id: props.id,
      sections: ctx.sections ?? [],
      activeSection: 'HOME',
    });
  },
  AuthorProfile: (props) => renderAuthorProfile(props),
  AuthorCard: (props) => renderAuthorCard(props),
  AuthorsGrid: (props, ctx) => renderAuthorsGrid(props, ctx.authors),
  AuthorsGridManual: (props, ctx) => renderAuthorsGridManual(props, (zoneName) => {
    const zoneItems = ctx.zones[zoneName] || [];
    return zoneItems.map((block) => {
      const renderer = AuthorComponentRegistry[block.type];
      return renderer ? renderer(block.props, ctx) : "";
    }).join("");
  }),
  SectionGrid: (props, ctx) => renderSectionGrid(props, ctx.zones, ctx.storiesById, ctx),
  SectionBottomCard: (props, ctx) => renderSectionBottomGrid(props, ctx.zones, ctx.storiesById, ctx),
  BlogGrid: (props, ctx) => renderBlogGrid(props, ctx.zones, ctx.storiesById, ctx),
  PopularBlogCard: (props, ctx) => renderMostPopularCard(props, ctx.storiesById),
  BlogShowcaseCard: (props, ctx) => renderBlogShowcaseCard(props, ctx.storiesById),
  Footer: (props) => renderFooter(props),
  Border: (props) => renderBorder({
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
};


export function renderAuthorPageFromPuckJSON(pageJson, options = {}) {
  if (!pageJson) return "<!-- invalid author page -->";

  const { data, storiesById, authorId } = pageJson;
  const { content = [], zones = {} } = data || {};
  const sections = options.sections ?? [];
  const authorName = options.authorName || pageJson.authorName || "Author";
  const baseUrl = import.meta.env.VITE_CANONICAL_URL || (typeof window !== "undefined" ? window.location.origin : "https://openpress.com");

  function renderComponent(block) {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;
    let renderer = AuthorComponentRegistry[type];

    // Handle dynamic ad placements
    if (!renderer && type.startsWith('Ad_')) {
      const placementName = type.replace('Ad_', '').replace(/_/g, '-');
      renderer = (p, c) => renderCampaignAd({
        ...p,
        placementName: placementName,
      }, c);
    }

    if (!renderer) {
      console.warn("⚠️ Unknown author component:", type);
      return `<!-- unknown component: ${type} -->`;
    }

    const ctx = {
      zones,
      storiesById: storiesById ?? {},
      sections: sections ?? [],
      authorId: authorId,
      authorName: authorName,
      authors: options.authors ?? [],
      extraRenderers: AuthorComponentRegistry,
    };


    return renderer(props, ctx);
  }

  const contentHTML = content.map(renderComponent).join("\n");

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const brandName = "OpenPress";
  const ogTitle = `${authorName} — ${brandName}`;
  const ogDescription = `Read all stories by ${authorName} on ${brandName}.`;

  const slugify = (val) => val.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const authorSlug = slugify(authorName);
  const canonicalUrl = `${baseUrl}/authors/${authorSlug}`;

  let authorImage = "/openpress-logo-full-nobg-trim.png";
  if (content) {
    const profileBlock = content.find(b => b.type === "AuthorProfile");
    if (profileBlock?.props?.image) {
      authorImage = profileBlock.props.image;
    }
  }

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const ogImage = toAbsoluteUrl(authorImage);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  ${analyticsTags()}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(brandName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:type" content="profile" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&family=Libre+Franklin:wght@400;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    html, body { margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; background: #fff; }

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
      const campaigns = ${JSON.stringify(options.campaigns || []).replace(/</g, '\\u003c')};

      ${getClientAdScript('sidebar-rectangle')}
    })();
  </script>
</body>
</html>
    `;
}

export function renderAuthorsListPageFromPuckJSON(pageJson, options = {}) {
  if (!pageJson) return "<!-- invalid authors list page -->";

  const { data, storiesById } = pageJson;
  const { content = [], zones = {} } = data || {};
  const sections = options.sections ?? [];
  const allAuthors = options.authors ?? [];
  const baseUrl = import.meta.env.VITE_CANONICAL_URL || (typeof window !== "undefined" ? window.location.origin : "https://openpress.com");

  function renderComponent(block) {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;
    let renderer = AuthorComponentRegistry[type];

    // Handle dynamic ad placements
    if (!renderer && type.startsWith('Ad_')) {
      const placementName = type.replace('Ad_', '').replace(/_/g, '-');
      renderer = (p, c) => renderCampaignAd({
        ...p,
        placementName: placementName,
      }, c);
    }

    if (!renderer) {
      console.warn("⚠️ Unknown author list component:", type);
      return `<!-- unknown component: ${type} -->`;
    }

    const ctx = {
      zones,
      storiesById: storiesById ?? {},
      sections: sections ?? [],
      authors: allAuthors,
      extraRenderers: AuthorComponentRegistry,
    };

    return renderer(props, ctx);
  }

  const contentHTML = content.map(renderComponent).join("\n");

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const brandName = "OpenPress";
  const ogTitle = `Authors — ${brandName}`;
  const ogDescription = `Meet the talented authors and journalists contributor to ${brandName}.`;
  const canonicalUrl = `${baseUrl}/authors`;
  const ogImage = `${baseUrl}/openpress-logo-full-nobg-trim.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  ${analyticsTags()}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(brandName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:type" content="website" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&family=Libre+Franklin:wght@400;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    html, body { margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; background: #fff; }

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
      const campaigns = ${JSON.stringify(options.campaigns || []).replace(/</g, '\\u003c')};

      ${getClientAdScript('sidebar-rectangle')}
    })();
  </script>
    })();
  </script>
</body>
</html>
    `;
}

