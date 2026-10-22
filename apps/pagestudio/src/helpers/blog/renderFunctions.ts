import { renderAboutUs } from '../renderers/renderAboutUs';
import { renderAdCard } from '../renderers/renderAdCard';
import { renderMastheadNavbar as sharedRenderMastheadNavbar } from '../renderers/renderMastheadNavbar';
import { renderBorder } from '../renderers/renderBorder';
import { renderContactUs } from '../renderers/renderContactUs';
import { renderErrorCard } from '../renderers/renderErrorCard';
import { renderFeaturedCard } from '../renderers/renderFeaturedCard';
import { renderFooter } from '../renderers/renderFooter';
import { renderInStoryAd } from '../renderers/renderInStoryAd';
import { renderLeaderboardAd } from '../renderers/renderLeaderboardAd';
import { renderMainCard } from '../renderers/renderMainCard';
import { renderMediaCouncil } from '../renderers/renderMediaCouncil';
import { renderMostPopularCard } from '../renderers/renderMostPopularCard';
import { renderMultimediaCard } from '../renderers/renderMultimediaCard';
import { renderPrivacyPolicy } from '../renderers/renderPrivacyPolicy';
import { renderSectionBottomGrid } from '../renderers/renderSectionBottomGrid';
import { renderSectionGrid } from '../renderers/renderSectionGrid';
import { renderShowcaseCard } from '../renderers/renderShowcaseCard';
import { renderSidebarAd } from '../renderers/renderSidebarAd';
import { renderSidebarStoryCard } from '../renderers/renderSidebarStoryCard';
import { renderSpotlightAd } from '../renderers/renderSpotlightAd';
import { renderStoryCard } from '../renderers/renderStoryCard';
import { renderStorySubCard } from '../renderers/renderStorySubCard';
import { buildSpotlightDesktopFallbackHtml, resolveActiveSpotlightCampaign } from '../renderers/spotlightSidebarAd';

// Extend Window interface for custom properties
declare global {
  interface Window {
    __PUCK_FINAL_TITLE__?: string;
    __PUCK_FINAL_IMAGE__?: string;
  }
}

/* ==================================================
 * CORE TYPES (Render Protocol)
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
  image?: string;
  imageUrl?: string;
  socialImage?: string;
  socialHeadline?: string;
  imageAlt?: string;
  publishUrl?: string;
  readTime?: string;
  description?: any;
  Category?: string[]; // legacy support
  caption?: string;
  altText?: string;
  byLine?: string[];
  imageFocalPoint?: { x: number; y: number };
  publishDate?: string;
  publishedAt?: string;
  proposedFilingDate?: string;
  updatedAt?: string;
  createdAt?: string;
}

export type StoryMap = Record<string, BlogStory>;

export interface MoreStoriesInjection {
  insertAfterParagraph: number;
  stories: Array<{ id?: string; headline?: string; title?: string; publishUrl?: string; redirectUrl?: string }>;
  id?: string;
  headingColor?: string;
}

export interface RenderContext {
  zones: Record<string, PuckBlock[]>;
  storiesById: StoryMap;
  currentStory?: BlogStory | null;
  sections?: string[];
  activeSection?: string;
  allAuthors?: any[];
  campaigns?: any[];
  extraRenderers?: Record<string, (props: any, ctx: any) => string>;
  pageType?: string;
  authorId?: string;
  moreStoriesInjections?: MoreStoriesInjection[];
  claimSpotlightSidebarAd?: () => boolean;
}

export type RendererFn<P = any> = (
  props: P,
  ctx: RenderContext
) => string;



const ComponentRegistry: Record<string, RendererFn<any>> = {

  /* ------------------------------------------------
   * 1️⃣  NAVIGATION / HEADER
   * ------------------------------------------------*/
  AtlanticNavbar: (props, ctx) =>
    sharedRenderMastheadNavbar({
      id: props.id,
      sections: ctx.sections ?? [],
      activeSection: ctx.activeSection ?? 'HOME',
      showSignIn: props.showSignIn ?? false,
      showSupportUs: props.showSupportUs ?? false,
      showBecomeMember: props.showBecomeMember ?? true,
      showFacebook: props.showFacebook ?? true,
      showLinkedIn: props.showLinkedIn ?? true,
    }),

  /* ------------------------------------------------
   * 2️⃣  GRID WRAPPER WITH ZONES
   * ------------------------------------------------*/
  BlogGrid: (props, ctx) =>
    renderBlogGrid(props, ctx.zones, ctx.storiesById, ctx),

  /* ------------------------------------------------
   * 3️⃣  STORY CARDS
   * ------------------------------------------------*/
  BlogPostCard: (props, ctx: RenderContext) => {
    const currentStory = ctx.currentStory || null;
    let overrideStory: BlogStory | null = null;
    let sourceStory: BlogStory | null = currentStory;

    if (!sourceStory || Object.keys(sourceStory).length === 0) {
      // Fallback: Load from localStorage (preview mode)
      overrideStory = (
        typeof localStorage !== "undefined"
          ? JSON.parse(localStorage.getItem("currentStory") || "{}")
          : {}
      ) as BlogStory;
      sourceStory = overrideStory;
    }

    // BlogPostCard has no default `storyId` prop, so it is frequently "" /
    // undefined at publish time. Falling back to the resolved story's own id
    // (or a stable sentinel) guarantees the map key used below always matches
    // the key the sub-renderers (renderBlogMainTitle/renderBlogImageCard/
    // renderBlogTitle/renderBlogBodyCard) look up by — otherwise their
    // `storyId ? storiesById[storyId] : null` checks short-circuit to null
    // before ever consulting the map, even though the map has the real story.
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

  BlogRecomCard: (props, ctx) =>
    renderBlogRecomCard(props, ctx.storiesById),

  BlogPostCardPreview: (props, ctx) =>
    renderBlogPostCard(props, ctx.zones, ctx.storiesById), // optional alias

  BlogMoreStoriesCard: (props, ctx) =>
    renderBlogMoreStoriesCard(props, ctx.storiesById),

  /* ------------------------------------------------
   * 4️⃣  HEADINGS
   * ------------------------------------------------*/
  BlogHeading: (props) =>
    renderBlogHeading(props),

  HeadingBlock: (props) =>
    renderBlogHeading(props), // alias if needed

  BlogTitle: (props, ctx) =>
    renderBlogTitle(props, ctx.storiesById, ctx.allAuthors || []),

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
    renderSectionGrid({
      id: props.id,
      className: props.className,
    }, ctx),

  SectionBottomCard: (props, ctx) =>
    renderSectionBottomGrid({
      id: props.id,
      className: props.className,
    }, ctx),

  Footer: (props) =>
    renderFooter(props),

  Border: (props: Record<string, any>): string =>
    renderBorder({
      id: props.id,
      height: props.height,
      color: props.color,
    }),

  MainCard: (props, ctx: RenderContext) => {
    const currentStory = ctx.currentStory || null;
    let sourceStory: BlogStory | null = currentStory;

    if (!sourceStory || Object.keys(sourceStory).length === 0) {
      // Fallback: Load from localStorage (preview mode)
      sourceStory = (
        typeof localStorage !== "undefined"
          ? JSON.parse(localStorage.getItem("currentStory") || "{}")
          : {}
      ) as BlogStory;
    }

    // Same falsy-storyId short-circuit as BlogPostCard: renderMainCard looks
    // up `props.storyId ? ctx.storiesById[props.storyId] : null`, so the map
    // key and the storyId we hand to renderMainCard must match and be truthy.
    const resolvedStoryId =
      props.storyId || sourceStory?.id || (sourceStory as any)?.storyId || "__current_story__";

    // Merge into ctx for the renderer
    const mergedCtx = {
      ...ctx,
      storiesById: { ...ctx.storiesById, [resolvedStoryId]: sourceStory as BlogStory }
    };

    return renderMainCard({ ...props, storyId: resolvedStoryId }, mergedCtx);
  },

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

  MultimediaCard: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMultimediaCard(props, ctx),

  RecommendCard: (props: Record<string, any>, ctx: RenderContext): string => {
    const storyId = props.storyId;
    const storyData = storyId ? ctx.storiesById[storyId] : null;
    return renderRecommendCard(props, storyData);
  },

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

  PrivacyPolicy: (props: Record<string, any>, ctx: RenderContext): string =>
    renderPrivacyPolicy(props, ctx),

  MediaCouncil: (props: Record<string, any>, ctx: RenderContext): string =>
    renderMediaCouncil(props, ctx),

  AboutUs: (props: Record<string, any>, ctx: RenderContext): string =>
    renderAboutUs(props, ctx),

  ContactUs: (props: Record<string, any>, ctx: RenderContext): string =>
    renderContactUs(props, ctx),

};







// The masthead navbar is now imported from renderers/renderMastheadNavbar.ts to ensure consistency.
export const renderMastheadNavbar = sharedRenderMastheadNavbar;

// BLOG Grid HTML
/***************************************************
 * Render ANY component using ComponentRegistry
 * @param {object} block - The component block to render
 * @param {object} ctx - The render context containing zones, storiesById, currentStory, etc.
 ***************************************************/
import { renderDynamicAd } from '../renderers/renderDynamicAd';

export function renderComponent(
  block: PuckBlock | null | undefined,
  ctx: RenderContext
): string {
  console.log("prepared ctx >>>", ctx);
  if (!block || typeof block !== "object") return "";

  const { type, props = {} } = block;

  let renderer = ComponentRegistry[type] as any;

  if (!renderer && type.startsWith('Ad_')) {
    renderer = renderDynamicAd;
  }

  if (!renderer) {
    console.warn("⚠️ Unknown component type:", type);
    return `<!-- Unknown component: ${type} -->`;
  }

  try {
    return renderer(props, ctx);
  } catch (err) {
    console.error(`❌ Error rendering component ${type}:`, err);
    return `<!-- Error rendering ${type} -->`;
  }
}



export function renderBlogGrid(
  props: any,
  zones: Record<string, PuckBlock[]>,
  storiesById: StoryMap,
  ctx?: RenderContext | null
): string {
  console.log("props inside blog grid >>>>", props);
  console.log("zones inside blog grid >>>>", zones);
  console.log("stories inside blog grid >>>", storiesById);
  const id = props.id;

  // Build context if not passed (for backwards compatibility)
  const renderCtx: RenderContext = ctx || {
    zones: zones,
    storiesById: storiesById,
    currentStory: null,
    sections: []
  };

  // Pre-scan ALL zones (not just the zone currently being rendered) for
  // BlogMoreStoriesCard blocks with insertAfterParagraph > 0. The Puck editor's
  // portal-based preview injects the widget into the article body regardless of
  // which zone/column it was dropped in, so the static renderer must do the same —
  // otherwise a widget dropped into a sidebar zone (e.g. blog-grid-right-*) would be
  // silently suppressed and never re-rendered anywhere on the published page.
  const pageMoreStoriesInjections: MoreStoriesInjection[] = Object.values(zones)
    .flat()
    .filter(
      (item) =>
        item?.type === 'BlogMoreStoriesCard' &&
        Number((item.props as any)?.insertAfterParagraph) > 0
    )
    .map((item) => ({
      insertAfterParagraph: Number((item.props as any).insertAfterParagraph),
      stories: (item.props as any)?.stories || [],
      id: (item.props as any)?.id,
      headingColor: (item.props as any)?.headingColor,
    }));

  // Helper to get components inside a zone
  function renderZone(zoneName: string) {
    const zoneKey = `${id}:${zoneName}`;
    const zoneItems = zones[zoneKey] || [];

    if (!zoneItems.length) return "";

    const zoneCtx: RenderContext =
      pageMoreStoriesInjections.length > 0
        ? { ...renderCtx, moreStoriesInjections: pageMoreStoriesInjections }
        : renderCtx;

    console.log("zone Items >>>>", zoneItems);
    return zoneItems
      .map((item) => {
        // Suppress BlogMoreStoriesCard items that are being injected inline
        // (page-wide, so this applies even if the widget lives in a different
        // zone than the article body).
        if (
          item.type === 'BlogMoreStoriesCard' &&
          Number((item.props as any)?.insertAfterParagraph) > 0 &&
          pageMoreStoriesInjections.length > 0
        ) {
          return '';
        }
        return renderComponent(item, zoneCtx);
      })
      .join("");
  }

  // ─── Spotlight Ad — desktop sidebar card (matches PopularBlogCard) ────────
  // On a single-story Blog page, if there's an active Spotlight campaign, render
  // its desktop fallback as a card in the "blog-grid-right-5" zone — the same
  // slot/column where PopularBlogCard is displayed — instead of as a separate
  // rail beside the article body. Mobile is unaffected (cover-stack slider is
  // injected inline into the article body by renderBlogBodyCard).
  // `renderCtx.claimSpotlightSidebarAd()` guards against duplicate rendering
  // when more than one grid component (e.g. BlogGrid AND one or more
  // SectionGrid instances) appears on the same page — only the first to
  // render claims the slot.
  const { job: spotlightSidebarJob, campaign: spotlightSidebarCampaign } = (renderCtx.currentStory && renderCtx.claimSpotlightSidebarAd?.() !== false)
    ? resolveActiveSpotlightCampaign(renderCtx.campaigns || [])
    : { job: null, campaign: null };
  const spotlightSidebarAdHtml = spotlightSidebarJob
    ? buildSpotlightDesktopFallbackHtml(spotlightSidebarJob, spotlightSidebarCampaign)
    : '';

  return `
    <section
      id="${id}"
      class="w-full bg-white pt-4 px-4 pb-6 lg:pt-8 lg:px-16 lg:pb-12 ${props.className || ""}"
    >
      <div class="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row gap-[2%]">

          <!-- LEFT COLUMN -->
          <div class="flex-1 flex flex-col gap-1 lg:gap-2">

            <div class="h-auto w-full min-h-0 lg:min-h-[2.2rem]">
              ${renderZone("blog-grid-left-top-1")}
            </div>
          </div>

           <!-- RIGHT COLUMN -->
         <div class="w-full lg:w-[30%] flex flex-col gap-5 blog-grid-right-col">
            <!-- Spotlight Ad — sticky at the top of the column at a lower top
                 offset/z-index than the sticky section below. As the user
                 scrolls, the right-1..right-5 sticky block (higher z-index,
                 larger top offset) catches up and slides over/covers it. -->
            ${spotlightSidebarAdHtml ? `<div class="relative lg:sticky lg:top-[96px] lg:self-start z-0 w-full lg:max-w-md hidden lg:block" data-ad-block="Spotlight-Sidebar">${spotlightSidebarAdHtml}</div>` : ''}

            <!-- Scrolling sections -->
            <div class="relative z-10 bg-white flex flex-col gap-5">
              <div class="h-auto min-h-0 lg:min-h-[12rem] pt-4">
                ${renderZone("blog-grid-right-1")}
              </div>
              <div class="h-auto min-h-0 lg:min-h-[3rem]">
                ${renderZone("blog-grid-right-2")}
              </div>
              <div class="h-auto min-h-0 lg:min-h-[7rem]">
                ${renderZone("blog-grid-right-3")}
              </div>
              <div class="h-auto min-h-0 -mt-3 bg-white [&_article]:!border-b-0">
                ${renderZone("blog-grid-right-4")}
              </div>
            </div>

            <!-- STICKY SECTION - Works on both mobile and desktop -->
            <div class="lg:sticky lg:top-[96px] lg:self-start pb-8 bg-white z-10">
              <div class="h-auto min-h-0">
                ${renderZone("blog-grid-right-5")}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
      ${ctx?.pageType === 'Home' || (ctx?.activeSection === 'HOME' && !ctx?.currentStory && !ctx?.authorId)
      ? `
      <style>
        @media (max-width: 1023px) {
          #${id} .blog-grid-right-col section[id*="heading"],
          #${id} .blog-grid-right-col section[id*="Heading"] {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          #${id} .blog-grid-right-col section[id*="heading"] > div,
          #${id} .blog-grid-right-col section[id*="Heading"] > div {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      </style>
      `
      : ''
    }
    </section>
  `;
}




//BLOG HEADING
export function renderBlogHeading(props: { id?: string; text?: string; align?: string; level?: string; size?: string }) {
  const {
    id = "",
    text = "Heading",
    align = "left",
    level = "2",
    // size = "m"
  } = props;

  // map Tailwind size classes
  // const sizeClasses = {
  //   xxxl: "text-6xl font-extrabold",
  //   xxl: "text-5xl font-bold",
  //   xl: "text-4xl font-bold",
  //   l: "text-2xl font-semibold",
  //   m: "text-2xl font-semibold",
  //   s: "text-xl font-medium",
  //   xs: "text-lg font-medium",
  // };

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";


  const tag = `h${level}`;

  return `
    <section id="${id}" class="bg-white w-full">
      <div class=" w-full ">
        <${tag} class="${alignClass} font-libre italic font-semibold" style="font-size: 28px; line-height: 2rem;">
          ${text}
        </${tag}>
      </div>
    </section>
  `;
}



//  POPULAR BLOG CARD
//  RENDER A SINGLE ITEM (SingleColumnItem)
function renderPopularBlogItem(item: { number?: string | number; text?: string; storyId?: string }, storyData: BlogStory | null | undefined) {
  const displayText = storyData?.title || item.text || '';
  const convertedText = displayText;
  const publishUrl = storyData?.publishUrl || '';

  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="border border-b border-dotted border-gray-700 flex gap-4 items-start min-h-[80px] p-2 lg:p-3 pt-2 block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${actionAttr}
    >

      <div class="text-[40px] lg:text-[52px] font-bold text-black leading-none font-[Merriweather] flex-shrink-0">
        ${item.number}
      </div>

      <div class="flex-1">
        <p class="text-[15px] lg:text-[17px] font-light mb-2 leading-tight font-libre ">
          ${convertedText}
        </p>
      </div>

    </${Tag}>
  `;
}

// RENDER THE PopulaBlogCard WRAPPER
export function renderPopularBlogCard(
  props: {
    id?: string;
    items?: Array<{ storyId?: string;[key: string]: any }>;
  },
  storiesById: StoryMap
) {
  const { id, items = [] } = props;

  // Just like React version → first 4
  const firstFourItems = items.slice(0, 4);

  return `
    <div id="${id || ""}" class="w-full lg:max-w-md pb-4">
      <div>
        ${firstFourItems
      .map((item, index) => {
        const storyData = item.storyId
          ? storiesById[item.storyId]
          : null;

        return `
              <div>
                ${renderPopularBlogItem(item, storyData)}
                ${index === firstFourItems.length - 1 ? "<div></div>" : ""}
              </div>
            `;
      })
      .join("")}
      </div>
    </div>
  `;
}



// Blog showcase card
function renderShowcaseCardItem(item: { title?: string; category?: string; storyId?: string }, storyData: BlogStory | null | undefined, noBorder: boolean) {
  const displayTitle = storyData?.title || item.title || "Untitled";
  const rawCategory = storyData?.section || item.category;
  const displayCategory = Array.isArray(rawCategory)
    ? rawCategory[0]
    : rawCategory || "Category";
  const publishUrl = storyData?.publishUrl || '';


  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="${!noBorder ? "border-b border-dotted border-black" : ""} p-4 pl-2 last:mb-0 block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${actionAttr}
    >

      <p class="text-[10px] font-share text-black uppercase">
        ${displayCategory}
      </p>

      <h2 class="text-[17px] font-libre text-black leading-[1.25rem] pt-1">
        ${displayTitle}
      </h2>

    </${Tag}>
  `;
}


function renderShowcaseCardLayout(items: Array<{ title?: string; category?: string; storyId?: string }>, storiesById: StoryMap, noBorder: boolean) {
  if (!items || !items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No featured cards added. Please add some cards in the editor.
      </div>
    `;
  }

  return `
    <div class="w-full lg:max-w-md lg:mx-auto">
      ${items
      .map((item) => {
        const storyData = item.storyId ? storiesById[item.storyId] : null;
        return renderShowcaseCardItem(item, storyData, noBorder);
      })
      .join("")}
    </div>
  `;
}


export function renderBlogShowcaseCard(
  props: {
    id?: string;
    items?: Array<{ title?: string; category?: string; storyId?: string }>;
    className?: string;
  },
  storiesById: StoryMap
) {
  const { id, items = [], className = "" } = props;

  return `
    <div id="${id || ""}" class="${className}">
      ${renderShowcaseCardLayout(items, storiesById, true)}
    </div>
  `;
}



// Recommended Card
function renderRecommendCard(props: { storyId?: string; title?: string; description?: string; imageUrl?: string; imageAlt?: string; className?: string }, storyData: BlogStory | null | undefined) {
  console.log("props data in recommend card >>>", props);
  console.log("story data in recommend card >>>", storyData)
  const {
    // storyId,
    title: fallbackTitle = "Recommended Story",
    description: fallbackDesc = "Category",
    imageUrl: fallbackImage = "https://via.placeholder.com/400x250",
    imageAlt: fallbackAlt = "Recommended article",
    className = ""
  } = props;

  const imageUrl = storyData?.image || storyData?.imageUrl || fallbackImage;
  const description = storyData?.section || fallbackDesc;
  console.log("description >>>", description);
  const title = storyData?.title || storyData?.headline || fallbackTitle;
  const imageAlt = storyData?.imageAlt || fallbackAlt;
  const publishUrl = storyData?.publishUrl || '';

  const Tag = publishUrl ? 'a' : 'article'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="relative flex flex-col overflow-hidden block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity ${className}"
      ${actionAttr}
    >

      <!-- Image -->
      <div class="aspect-[16/10] w-full overflow-hidden">
        <img
          src="${imageUrl}"
          alt="${imageAlt}"
          class="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      </div>

      <!-- Content -->
      <div class="flex flex-1 flex-col p-1 lg:p-2 border-b border-dotted border-gray-700">
        <p class="font-share text-[10px] text-black line-clamp-2 uppercase pt-4 pb-0.5">
          ${description}
        </p>

        <p class="font-libre text-[18px] lg:text-[20px] font-extrabold text-black mb-2 leading-[1.40rem]">
          ${title}
        </p>
      </div>

    </${Tag}>
  `;
}

//  BlogRecomCard WRAPPER
export function renderBlogRecomCard(
  props: {
    id?: string;
    storyId?: string;
    className?: string;
  },
  storiesById: StoryMap
) {
  const { id, storyId, className = "" } = props;

  const storyData = storyId ? storiesById[storyId] : null;

  return `
    <div id="${id || ""}" class="${className}">
      ${renderRecommendCard({ storyId, className }, storyData)}
    </div>
  `;
}






// BlogPostCard
function escapeHtml(str: string | undefined | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


//  RENDER: BlogMainTitle
function renderBlogMainTitle({ id, storyId, fallbackTitle }: { id?: string; storyId?: string; fallbackTitle?: string }, storiesById: StoryMap) {
  const story = storyId ? storiesById[storyId] : null;
  const displayTitle = story?.headline || fallbackTitle || "Story Title";

  return `
    <div id="${escapeHtml(id || "")}" class="w-full">
      <h1 class="block text-inherit
           text-3xl lg:text-[2.6rem] leading-tight lg:leading-[1.05]
           font-black font-libre
           ">
        ${escapeHtml(displayTitle)}
      </h1>
    </div>
  `;
}

//  RENDER: BlogSubHeading (category + time + share button)
// Matches the React BlogSubHeading.tsx component styling
function renderBlogSubHeading({ time = "18 minutes ago", category = "CATEGORY" }: { id?: string; time?: string; category?: string }, containerId: string) {
  const safeTime = escapeHtml(time);
  const safeCategory = escapeHtml(category);
  const subId = `${containerId}-subheading`;

  return `
    <div id="${subId}" class="flex items-center justify-between w-full max-w-full lg:max-w-[808px] py-2 lg:py-1 font-share">
      <div class="flex items-center gap-2">
        ${safeCategory ? `<span
          class="text-black font-share border-black border-[0.5px] text-[11px] uppercase cursor-pointer tracking-wide px-1 py-1 w-fit"
          onclick="handleNavClick('${category}')"
        >${safeCategory}</span>` : ""}
        ${safeTime ? `<span class="text-black text-[11px] font-share">${safeTime}</span>` : ""}
      </div>
      <div class="flex-1"></div>
      <div class="flex-shrink-0 font-share relative">
        <button
          data-puck-share
          style="
            display: flex;
            align-items: stretch;
            border: 0.25px solid rgb(62, 62, 62);
            background: #FFFFFF;
            padding: 0;
            cursor: pointer;
            user-select: none;
            height: 24px;
            "
            aria-label="Share"
            title="Share"
        >
          <span style="
            font-size:9px;
            letter-spacing:0.03em;
            color:rgb(59, 59, 59);
            padding:2px 2px;
            display:flex;
            align-items:center;
            justify-content:center;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          ">
            SHARE
          </span>

          <div style="
            width:0.25px;
            background:rgb(62,62,62);
          "></div>
          <div style="padding:2px 6px; display:flex; align-items:center;">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="black"
              style="display:block;"
            >
              <path
                d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"
              ></path>
            </svg>
          </div>
        </button>

        <!-- Share Dropdown Menu -->
        <div
          data-puck-share-menu
          style="
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid rgb(62, 62, 62);
            border-radius: 0px;
            margin-top: 4px;
            z-index: 1000;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "
        >
<button
            data-share-facebook
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">FACEBOOK</h2>
          </button>
          <button
            data-share-twitter
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M234.3,313.1c-10.2,6-21.4,10.4-33.4,12.8c-9.6-10.2-23.3-16.6-38.4-16.6c-29,0-52.6,23.6-52.6,52.6c0,4.1,0.4,8.1,1.4,12 c-43.7-2.2-82.5-23.1-108.4-55c-4.5,7.8-7.1,16.8-7.1,26.5c0,18.2,9.3,34.3,23.4,43.8c-8.6-0.3-16.7-2.7-23.8-6.6v0.6 c0,25.5,18.1,46.8,42.2,51.6c-4.4,1.2-9.1,1.9-13.9,1.9c-3.4,0-6.7-0.3-9.9-0.9c6.7,20.9,26.1,36.1,49.1,36.5 c-18,14.1-40.7,22.5-65.3,22.5c-4.2,0-8.4-0.2-12.6-0.7c23.3,14.9,50.9,23.6,80.6,23.6c96.8,0,149.7-80.2,149.7-149.7 c0-2.3,0-4.6-0.1-6.8c10.3-7.5,19.2-16.7,26.2-27.3c-9.4,4.2-19.6,7-30.2,8.3C222.1,335.7,230.4,325.4,234.3,313.1z"/> </g> </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">TWITTER</h1>
          </button>
          <button
            data-share-linkedin
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              border-bottom: 1px solid black;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
            <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve" width="25px" height="25px">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <g> <path d="M329,145h-432c-22.1,0-40,17.9-40,40v432c0,22.1,17.9,40,40,40h432c22.1,0,40-17.9,40-40V185C369,162.9,351.1,145,329,145z M339,617c0,5.5-4.5,10-10,10h-432c-5.5,0-10-4.5-10-10V185c0-5.5,4.5-10,10-10h432c5.5,0,10,4.5,10,10V617z"/> <rect x="-8.5" y="348.4" width="49.9" height="159.7"/> <path d="M177.7,346.9c-28.6,0-46.5,15.6-49.8,26.6v-25.1H71.8c0.7,13.3,0,159.7,0,159.7h56.1v-86.3c0-4.9-0.2-9.7,1.2-13.1 c3.8-9.6,12.1-19.6,27-19.6c19.5,0,28.3,14.8,28.3,36.4v82.6H241v-88.8C241,369.9,213.2,346.9,177.7,346.9z"/> <path d="M15.4,273c-18.4,0-30.5,11.9-30.5,27.7c0,15.5,11.7,27.7,29.8,27.7h0.4c18.8,0,30.5-12.3,30.4-27.7 C45.1,284.9,33.8,273,15.4,273z"/> </g> </g>
            </svg>
            <h2 class="font-libre italic pl-2 font-semibold">LINKEDIN</h2>
          </button>
          <button
            data-share-whatsapp
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
              border-bottom: 1px solid black;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
          >
          <svg fill="#000000" width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier">
            <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z"/>
            <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z"/>
            </g>
          </svg>
            <h1 class="font-libre italic pl-2 font-semibold">WHATSAPP</h1>
          </button>
          <button
            data-share-share
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 10px 12px;
              border: none;
              background: none;
              cursor: pointer;
              font-size: 13px;
              color: #333;
              font-family: libre;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', 'white')));"
            onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#1C274C')));"
          >
          <svg width="25px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"/>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
              <g id="SVGRepo_iconCarrier"> <path d="M15.7285 3.88396C17.1629 2.44407 19.2609 2.41383 20.4224 3.57981C21.586 4.74798 21.5547 6.85922 20.1194 8.30009L17.6956 10.7333C17.4033 11.0268 17.4042 11.5017 17.6976 11.794C17.9911 12.0863 18.466 12.0854 18.7583 11.7919L21.1821 9.35869C23.0934 7.43998 23.3334 4.37665 21.4851 2.5212C19.6346 0.663551 16.5781 0.905664 14.6658 2.82536L9.81817 7.69182C7.90688 9.61053 7.66692 12.6739 9.51519 14.5293C9.80751 14.8228 10.2824 14.8237 10.5758 14.5314C10.8693 14.2391 10.8702 13.7642 10.5779 13.4707C9.41425 12.3026 9.44559 10.1913 10.8809 8.75042L15.7285 3.88396Z" fill="#1C274C"/> <path d="M14.4851 9.47074C14.1928 9.17728 13.7179 9.17636 13.4244 9.46868C13.131 9.76101 13.1301 10.2359 13.4224 10.5293C14.586 11.6975 14.5547 13.8087 13.1194 15.2496L8.27178 20.1161C6.83745 21.556 4.73937 21.5863 3.57791 20.4203C2.41424 19.2521 2.44559 17.1408 3.88089 15.6999L6.30473 13.2667C6.59706 12.9732 6.59614 12.4984 6.30268 12.206C6.00922 11.9137 5.53434 11.9146 5.24202 12.2081L2.81818 14.6413C0.906876 16.5601 0.666916 19.6234 2.51519 21.4789C4.36567 23.3365 7.42221 23.0944 9.33449 21.1747L14.1821 16.3082C16.0934 14.3895 16.3334 11.3262 14.4851 9.47074Z" fill="#1C274C"/> </g>
            </svg>
            <h1 class="font-libre italic pl-2 font-semibold">COPY</h1>
          </button>
        </div>
      </div>
    </div>
  `;
}

//  RENDER: BlogImageCard
function renderBlogImageCard({ storyId, imageUrl: fallbackImage = "/openpress-share.png", title: fallbackTitle = "" }: { storyId?: string; imageUrl?: string; title?: string }, storiesById: StoryMap) {
  const story = storyId ? storiesById[storyId] : null;
  const displayImage = story?.imageUrl || story?.image || fallbackImage || "https://via.placeholder.com/900x600";
  const displayTitle = story?.caption || fallbackTitle || "";
  const displayAltText = story?.altText || fallbackTitle || "";

  // Get focal point from story data, default to center if not set
  const focalPoint = story?.imageFocalPoint || { x: 50, y: 50 };
  const objectPosition = `${focalPoint.x}% ${focalPoint.y}%`;

  return `
    <div class="w-full mb-3">
      <div class="w-full aspect-video bg-gray-200 overflow-hidden">
        <img
          src="${escapeHtml(displayImage)}"
          alt="${escapeHtml(displayAltText)}"
          class="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          style="object-position: ${escapeHtml(objectPosition)};"
          loading="lazy"
        />
      </div>

      <h2
        class="mt-3 text-[16px] leading-snug font-lato font-medium outline-none"
        style="color:#716d6d;"
      >
        ${displayTitle}
      </h2>


    </div>
  `;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeAuthorName(value?: string) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAuthorMatch(name: string, allAuthors: any[] = []) {
  const normalizedCandidate = normalizeAuthorName(name);
  if (!normalizedCandidate) return undefined;

  const candidates = allAuthors.filter((author) => {
    const canonicalName = author?.name || author?.authorName || author?.fullName || "";
    const normalizedCanonical = normalizeAuthorName(canonicalName);

    if (!normalizedCanonical) {
      return false;
    }

    // Strong exact match first.
    if (normalizedCanonical === normalizedCandidate) {
      return true;
    }

    // Controlled partial match for abbreviated bylines (e.g. "Ravi" vs "Ravi Bajpai").
    const canonicalTokens = normalizedCanonical.split(" ").filter(Boolean);
    const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
    if (!canonicalTokens.length || !candidateTokens.length) {
      return false;
    }

    const candidateIsPrefix =
      candidateTokens.length < canonicalTokens.length &&
      candidateTokens.every((token, index) => canonicalTokens[index] === token);

    return candidateIsPrefix;
  });

  // Avoid ambiguous links: only link when we have a unique resolved author.
  return candidates.length === 1 ? candidates[0] : undefined;
}

function renderAuthorAnchor(displayName: string, authorMatch: any) {
  if (!authorMatch) {
    return escapeHtml(displayName);
  }

  const canonicalAuthorName = authorMatch.name || authorMatch.authorName || authorMatch.fullName || displayName;
  const authorPath = `/authors/${slugify(canonicalAuthorName)}`;
  return `<a href="${authorPath}" class="underline">${escapeHtml(displayName)}</a>`;
}


//  RENDER: BlogTitle (title + author)
function renderBlogTitle(
  { text, author, storyId }: { text?: string; author?: string; storyId?: string },
  storiesById: StoryMap,
  allAuthors: any[] = []
) {
  const story = storyId ? storiesById[storyId] : null;

  // Check byLine array first, then fall back to authorName
  const byLine = story?.byLine;
  let displayAuthorHTML = "";

  if (Array.isArray(byLine) && byLine.length > 0) {
    displayAuthorHTML = byLine
      .map((name) => renderAuthorAnchor(name, resolveAuthorMatch(name, allAuthors)))
      .join(", ");
  } else {
    const finalAuthorName = story?.authorName || author || "AUTHOR NAME";
    displayAuthorHTML = renderAuthorAnchor(finalAuthorName, resolveAuthorMatch(finalAuthorName, allAuthors));
  }

  const displaySummary = story?.storySummary || story?.description?.blocks?.[0]?.data?.text || text || "";
  const normalizedSummary = displaySummary
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ');

  // Format publish date if available
  const publishDate = story?.proposedFilingDate || story?.publishDate || story?.publishedAt || story?.createdAt || null;
  let formattedDate = "";
  if (publishDate) {
    try {
      const dateObj = new Date(publishDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (e) {
      // Ignore date parsing errors
    }
  }

  return `
    <div class="w-full flex mt-4 flex-col gap-3 lg:gap-4">
      <p class="font-libre text-xl lg:text-[24px] font-semibold italic leading-snug text-black">
        ${normalizedSummary}
      </p>

      <div class="flex flex-col gap-1">
        <div class="w-28 border-t-[0.5px] border-black"></div>

        <span class="text-[12px] uppercase tracking-wide font-share text-black pt-2">
          ${displayAuthorHTML}
        </span>
       ${formattedDate ? `<span class="text-[11px] font-share text-black">${escapeHtml(formattedDate)}</span>` : ""}
      </div>
    </div>
  `;
}

//  RENDER: BlogBodyCard — injects in-story ad after every N paragraphs
function renderBlogBodyCard(
  { storyId, bodyText }: { storyId?: string; bodyText?: string },
  storiesById: StoryMap,
  campaigns: any[] = [],
  moreStoriesInjections: MoreStoriesInjection[] = [],
  // Every published story; `storiesById` here may hold only the story being rendered.
  publishedStoriesById?: StoryMap
) {
  const story = storyId ? storiesById[storyId] : null;

  // ─── Resolve active In-story campaign ────────────────────────────────────
  const now = new Date();
  let inStoryJob: any = null;
  let inStoryCampaign: any = null;
  for (const camp of campaigns) {
    if (!camp.jobs) continue;
    for (const job of camp.jobs) {
      const placement = (job.placement || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
      const campaignType = (camp.type || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');
      const placementMatch = placement === 'instory' || placement === 'in-story' || placement === 'instory-ad' || placement === 'in-story-ad';
      const typeMatch = campaignType === 'instory' || campaignType === 'in-story' || campaignType === 'instory-ad' || campaignType === 'in-story-ad';
      if (!placementMatch && !typeMatch) continue;
      const start = job.startTime ? new Date(job.startTime) : null;
      const end = job.endTime ? new Date(job.endTime) : null;
      const campStatus = (camp.status || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
      const isActive =
        (['start_now', 'active', 'running', 'started'].includes(campStatus) || campStatus.includes('start')) &&
        (!start || start <= now) &&
        (!end || end >= now);
      if (isActive) {
        inStoryJob = job;
        inStoryCampaign = camp;
        break;
      }
    }
    if (inStoryJob) break;
  }

  // afterParagraph: every N paragraphs (default 3)
  const rawAfterParagraph = inStoryJob?.afterParagraph ?? inStoryJob?.after_paragraph;
  const afterEvery = (inStoryJob && Number(rawAfterParagraph) > 0)
    ? Number(rawAfterParagraph)
    : null;

  // ─── Resolve active Spotlight campaign ───────────────────────────────────
  // Spotlight Ads reuse the same "position after paragraph N" placement mechanic
  // as In-Story Ads, independent of which placement slot the job is attached to.
  // Unlike In-Story, Spotlight always shows once (never repeats).
  const { job: spotlightJob, campaign: spotlightCampaign } = resolveActiveSpotlightCampaign(campaigns);

  // Spotlight afterParagraph: single fixed position (default 3), never repeats.
  const rawSpotlightAfterParagraph = spotlightJob?.afterParagraph ?? spotlightJob?.after_paragraph;
  const spotlightAfterParagraph = spotlightJob
    ? (Number(rawSpotlightAfterParagraph) > 0 ? Number(rawSpotlightAfterParagraph) : 3)
    : null;

  // ─── Build Spotlight ad HTML snippet ─────────────────────────────────────
  // Desktop fallback is NOT built here — it's rendered by renderBlogGrid in the
  // "blog-grid-right-5" sidebar zone (same placement/width/spacing as
  // PopularBlogCard), not inline inside the article body.
  function buildSpotlightAdHtml(campaign: any) {
    if (!campaign) return '';
    // Reuse the shared Spotlight renderer (cover-stack mobile interscroller) so the
    // format stays identical to the homepage/Puck-zone Spotlight block — only the
    // in-story position (afterParagraph) is story-specific.
    return renderSpotlightAd(
      { id: 'instory-spotlight-ad', adId: 'auto' },
      { zones: {}, storiesById: {}, campaigns: [campaign] }
    );
  }

  // ─── Build in-story ad HTML snippet ──────────────────────────────────────
  function buildInStoryAdHtml(job: any, campaign: any) {
    if (!job) return '';

    const placementVal = job?.placement || 'in-story';
    const normalizedP = placementVal.toLowerCase().replace(/[\s_-]+/g, '-');
    const rawPlacement = job?.placement || 'instory';
    const jobCreatives = job?.creatives || {};

    const campaignCreatives = campaign?.creatives || {};
    const creativeFromCamp =
      campaignCreatives[normalizedP] ||
      campaignCreatives[rawPlacement] ||
      campaignCreatives[placementVal] ||
      Object.values(campaignCreatives)[0] ||
      {};

    const desktopUrl =
      (Array.isArray(jobCreatives.desktop)
        ? (jobCreatives.desktop[0]?.fileUrl || jobCreatives.desktop[0]?.preview || '')
        : (typeof jobCreatives.desktop === 'string' ? jobCreatives.desktop : '')) ||
      job.desktop ||
      (typeof creativeFromCamp === 'string' ? creativeFromCamp : (creativeFromCamp && typeof creativeFromCamp === 'object' ? (creativeFromCamp.desktop || '') : '')) ||
      '';
    const mobileUrl =
      (Array.isArray(jobCreatives.mobile)
        ? (jobCreatives.mobile[0]?.fileUrl || jobCreatives.mobile[0]?.preview || '')
        : (typeof jobCreatives.mobile === 'string' ? jobCreatives.mobile : '')) ||
      job.mobile ||
      (typeof creativeFromCamp === 'string' ? creativeFromCamp : (creativeFromCamp && typeof creativeFromCamp === 'object' ? (creativeFromCamp.mobile || '') : '')) ||
      desktopUrl;
    const linkUrl =
      job.landingPageURL ||
      job.landingPageUrl ||
      job.url ||
      campaign?.landingPageURL ||
      campaign?.landingPageUrl ||
      campaign?.url ||
      campaign?.landing_page_url ||
      '#';
    const altText = 'Advertisement';
    const cleanTag = (tag: string) => {
      if (!tag) return '';
      return tag
        .replace(/\u00A0/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/{{LANDING_PAGE_URL}}/gi, linkUrl);
    };
    const tagDesktop = cleanTag(
      job.thirdPartyTagDesktop ||
      job.third_party_tag_desktop ||
      job.tagDesktop ||
      job.desktop_tag ||
      campaign?.thirdPartyTag ||
      campaign?.third_party_tag ||
      campaign?.thirdPartyTagDesktop ||
      campaign?.third_party_tag_desktop ||
      ''
    );
    const tagMobile = cleanTag(
      job.thirdPartyTagMobile ||
      job.third_party_tag_mobile ||
      job.third_party_tag_mobile_tag ||
      job.tagMobile ||
      job.mobile_tag ||
      campaign?.thirdPartyTagMobile ||
      campaign?.third_party_tag_mobile ||
      campaign?.third_party_tag_mobile_tag ||
      tagDesktop
    );

    if (!desktopUrl && !tagDesktop) return '';

    const trackCampaignId = campaign?.campaignId || campaign?.id || '';
    const trackJobId = job?.jobId || job?.id || '';
    // The ad can repeat down the story, so the impression is sent once per page view.
    // A hidden pixel's onload is used, not a <script>: the paywall counts body text, script text included.
    const impressionScript = trackCampaignId ? `<img alt="" width="1" height="1" style="display:none" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" onload="var api = window.__openPress_API__ || ''; var seen = window.__instoryImpressions = window.__instoryImpressions || {}; var key = '${trackCampaignId}|${trackJobId}'; if (api && !seen[key]) { seen[key] = true; fetch(api + '/campaigns/trackEvent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: '${trackCampaignId}', jobId: '${trackJobId}', eventType: 'impression', placement: 'in-story', pageUrl: window.location.href, referrer: document.referrer }) }).catch(function(e) { console.warn('Failed to track ad impression', e); }); }" />` : '';

    if (tagDesktop) {
      // Third-party tag mode
      return `
        <div class="instory-ad w-full my-6 flex justify-center" style="max-width:100%;">
          <div class="w-full flex flex-col items-center">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 0.1em; margin-bottom: 8px;">
                Advertisement
            </span>
            <div class="w-full flex justify-center overflow-hidden">
                <div class="instory-ad-desktop hidden md:block" style="width: 728px; height: 90px;">
                    <iframe
                        srcdoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagDesktop.replace(/"/g, '&quot;')}"
                        style="width: 100%; height: 100%; border: none; overflow: hidden;"
                        scrolling="no"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                    ></iframe>
                </div>
                <div class="instory-ad-mobile block md:hidden" style="width: 320px; height: 50px;">
                    <iframe
                        srcdoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagMobile.replace(/"/g, '&quot;')}"
                        style="width: 100%; height: 100%; border: none; overflow: hidden;"
                        scrolling="no"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                    ></iframe>
                </div>
            </div>
          </div>
        </div>${impressionScript}`;
    }

    return `
      <div class="instory-ad w-full my-6 flex justify-center" style="max-width:100%;">
        <div class="w-full flex flex-col items-center">
            <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #6b7280; letter-spacing: 0.1em; margin-bottom: 8px;">
                Advertisement
            </span>
            <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; max-width: 728px; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); overflow: hidden;" onclick="var api = window.__openPress_API__ || ''; if(api) { fetch(api + '/campaigns/trackEvent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: '${trackCampaignId}', jobId: '${trackJobId}', eventType: 'click', placement: 'in-story', pageUrl: window.location.href, referrer: document.referrer }) }).catch(function(e) { console.warn('Failed to track ad click', e); }); }">
                <picture>
                  <source media="(max-width:768px)" srcset="${mobileUrl}">
                  <img src="${desktopUrl}" alt="${altText}" class="w-full h-auto object-contain" loading="lazy" />
                </picture>
            </a>
        </div>
      </div>${impressionScript}`;
  }

  // ─── Build body HTML, injecting ad after every N paragraphs ──────────────
  let bodyHtml = '';

  const blocks = story?.description?.blocks;
  if (Array.isArray(blocks) && blocks.length > 0 && (afterEvery !== null || spotlightAfterParagraph !== null || moreStoriesInjections.length > 0)) {
    // Use EditorJS blocks directly so we can count paragraphs precisely
    const adSnippet = buildInStoryAdHtml(inStoryJob, inStoryCampaign);
    const shouldRepeat = inStoryJob?.repeatAd !== false && inStoryJob?.repeat_ad !== false;
    const spotlightSnippet = buildSpotlightAdHtml(spotlightCampaign);
    let spotlightInjected = false;
    let paragraphCount = 0;

    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      const data = block.data || {};

      if (block.type === 'paragraph') {
        bodyHtml += `<p>${data.text || ''}</p>`;
        paragraphCount++;
        if (adSnippet && afterEvery !== null) {
          if (shouldRepeat) {
            if (paragraphCount % afterEvery === 0) {
              bodyHtml += adSnippet;
            }
          } else {
            if (paragraphCount === afterEvery) {
              bodyHtml += adSnippet;
            }
          }
        }
        // Spotlight always shows once, at its configured paragraph position — never repeats.
        if (spotlightSnippet && !spotlightInjected && spotlightAfterParagraph !== null && paragraphCount === spotlightAfterParagraph) {
          bodyHtml += spotlightSnippet;
          spotlightInjected = true;
        }
        // Inject More Stories cards at their configured paragraph positions
        for (const msInj of moreStoriesInjections) {
          if (msInj.insertAfterParagraph === paragraphCount) {
            bodyHtml += renderBlogMoreStoriesCard(msInj, publishedStoriesById);
          }
        }
      } else if (block.type === 'image') {
        const url = data.file?.url || data.url || '';
        const rawCaption = data.caption || data.file?.caption || data.text || data.title || '';
        const caption = (rawCaption && !rawCaption.startsWith('Image contains:')) ? rawCaption : '';
        // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
        // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
        const imageTune = block.tunes?.imageWrapTune || data.tunes?.imageWrapTune || {};
        const wrapAlign = imageTune.wrapAlign || null;

        if (wrapAlign) {
          const floatStyle = wrapAlign === 'left'
            ? 'float:left; margin: 0 1.5rem 1rem 0; max-width: 45%;'
            : 'float:right; margin: 0 0 1rem 1.5rem; max-width: 45%;';
          bodyHtml += `<div style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="width:100%;display:block;" loading="lazy"/>${caption ? `<p class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${caption}</p>` : ''}</div>`;
        } else {
          const align = imageTune.align || 'center';
          const width = imageTune.width || 100;
          const marginLeft = align === 'left' ? '0' : 'auto';
          const marginRight = align === 'right' ? '0' : 'auto';
          bodyHtml += `<div class="mb-2" style="max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="display:block; width:100%; height:auto; object-fit:contain;" loading="lazy"/>${caption ? `<p class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${caption}</p>` : ''}</div>`;
        }
      } else if (block.type === 'wrappedImageParagraph') {
        const url = data.imageUrl || '';
        const wrapAlign = data.wrapAlign || 'left';
        const caption = data.caption || '';
        const text = data.text || '';
        const width = data.width || 40;
        const floatStyle = wrapAlign === 'left'
          ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
          : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
        bodyHtml += `<div style="overflow:hidden;"><div style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${caption}</p>` : ''}</div><p>${text}</p></div>`;
      } else if (block.type === 'caption') {
        bodyHtml += `<p class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${data.text || ''}</p>`;
      } else if (block.type === 'header') {
        const level = data.level || 2;
        bodyHtml += `<h${level}>${data.text || ""}</h${level}>`;
      } else if (block.type === 'list') {
        const isOrdered = data.style === "ordered";
        const tag = isOrdered ? "ol" : "ul";
        const listStyleType = isOrdered ? "decimal" : "disc";
        const items = Array.isArray(data.items)
          ? data.items.map((item: any) => `<li style="margin-bottom: 0.25rem;">${typeof item === 'string' ? item : item.content || ""}</li>`).join("")
          : "";
        bodyHtml += `<${tag} style="list-style-type: ${listStyleType}; padding-left: 1.5rem; margin-bottom: 1rem;">${items}</${tag}>`;
      } else if (block.type === 'quote') {
        const text = data.text || "";
        const alignment = data.alignment || "left";
        const quoteCaption = data.caption ? `<cite>${data.caption}</cite>` : "";
        bodyHtml += `<blockquote style="text-align: ${alignment};">${text}${quoteCaption}</blockquote>`;
      } else if (block.type === 'embed' || block.type === 'youtube' || block.type === 'instagram' || block.type === 'soundcloud') {
        const embedUrl = data.embed || data.source;
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

          if (data.service === 'instagram') {
            style += ' max-width: 550px; height: 700px;';
          } else if (data.service === 'soundcloud') {
            style += ' height: 300px;';
          } else if (data.service === 'youtube') {
            style += ' aspect-ratio: 16/9; max-width: 800px;';
          }

          bodyHtml += `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === 'facebook') {
        const embedUrl = data.url || data.embed || data.source;
        if (embedUrl) {
          const trimmedCaption = (data.caption || "").trim();
          const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          const encodedUrl = encodeURIComponent(embedUrl);
          const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
          bodyHtml += `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
        }
      } else if (block.type === 'twitter') {
        const tweetHtml = (data.html || '').replace(/\n/g, '');
        const trimmedCaption = (data.caption || "").trim();
        const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
        bodyHtml += `<div class="twitter-embed-wrapper mb-2 w-full flex flex-col items-center">${tweetHtml}${tweetCaption}</div>`;
      }
    }
  } else {
    // Fallback: plain text (fullDescription / summary / bodyText)
    const displayText = bodyText || story?.fullDescription || story?.summary || "";

    // Convert newlines to <br/> tags (same as BlogBodyCard.tsx)
    // The content may already contain HTML tags like <a>, <img>, <i>, <b>, etc.
    // These should be preserved and rendered as-is
    const html = displayText
      .split(/(<[^>]+>)/g) // keep tags intact
      .map(part =>
        part.startsWith("<")
          ? part
          : part.replace(/\n{2,}/g, "<br/><br/>").replace(/\n/g, "<br/>")
      )
      .join("")
      .replace(/&nbsp;/g, " ")
      .replace(/\u00A0/g, " ");

    // If there are more-stories injections, or an in-story/spotlight ad is configured,
    // split by <br/><br/> to inject at paragraph positions. Previously this branch only
    // handled moreStoriesInjections — in-story/spotlight ads were silently never injected
    // for plain-text bodies (fullDescription/summary), which is the most common story format.
    const adSnippet = buildInStoryAdHtml(inStoryJob, inStoryCampaign);
    const shouldRepeat = inStoryJob?.repeatAd !== false && inStoryJob?.repeat_ad !== false;
    const spotlightSnippet = buildSpotlightAdHtml(spotlightCampaign);

    if (moreStoriesInjections.length > 0 || afterEvery !== null || spotlightAfterParagraph !== null) {
      const paragraphs = html.split(/(<br\s*\/?>[\s]*<br\s*\/?>)/gi);
      let paragraphCount = 0;
      let spotlightInjected = false;
      let result = '';
      for (const segment of paragraphs) {
        result += segment;
        // Count a paragraph boundary (the <br/><br/> separator)
        if (/^<br\s*\/?>[\s]*<br\s*\/?>/i.test(segment)) {
          paragraphCount++;
          if (adSnippet && afterEvery !== null) {
            if (shouldRepeat) {
              if (paragraphCount % afterEvery === 0) {
                result += adSnippet;
              }
            } else if (paragraphCount === afterEvery) {
              result += adSnippet;
            }
          }
          // Spotlight always shows once, at its configured paragraph position — never repeats.
          if (spotlightSnippet && !spotlightInjected && spotlightAfterParagraph !== null && paragraphCount === spotlightAfterParagraph) {
            result += spotlightSnippet;
            spotlightInjected = true;
          }
          for (const msInj of moreStoriesInjections) {
            if (msInj.insertAfterParagraph === paragraphCount) {
              result += renderBlogMoreStoriesCard(msInj, publishedStoriesById);
            }
          }
        }
      }
      // If the story is shorter than the configured spotlight position, show it at the end
      // instead of never showing it at all.
      if (spotlightSnippet && !spotlightInjected) {
        result += spotlightSnippet;
      }
      bodyHtml = result;
    } else {
      bodyHtml = html;
    }
  }

  return `
    <div class="w-full max-w-[900px] mx-auto my-5">
      <style>
        .blog-body-content {
          max-width: 100%;
          overflow-wrap: break-word;
          white-space: normal;
        }

        /* Clearfix: keeps any floated content (e.g. inline image captions) contained
           within this box's height instead of bleeding into whatever follows next. */
        .blog-body-content::after {
          content: "";
          display: table;
          clear: both;
        }

        .blog-body-content * {
          max-width: 100%;
          overflow-wrap: break-word;
        }
        .blog-body-content a {
          text-decoration: underline;
          color: inherit;
        }
        .blog-body-content a:hover {
          opacity: 0.8;
        }
        .blog-body-content a.no-underline {
          text-decoration: none;
        }

        .blog-body-content p {
          margin: 0 0 0.8rem 0;
        }

        .blog-body-content .openPress-story-caption,
        .blog-body-content figcaption.openPress-story-caption {
          color: #716d6d;
          font-family: 'Lato', sans-serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.35;
          text-align: left;
        }

        .blog-body-content figure {
          margin: 0 0 1rem 0;
        }

        .blog-body-content figure img {
          display: block;
          max-width: 100%;
          height: auto;
        }

        /* Mobile view responsive image width fix: OpenPress's configured image width
           (imageTune.width, applied inline as max-width:X%) is desktop/tablet-only —
           on mobile the image must always span the full available width, regardless
           of that setting. The div[style*=max-width] selector covers both the plain
           image and wrap-align image markup emitted above (no figure tag is used here). */
        @media (max-width: 768px) {
          .blog-body-content figure,
          .blog-body-content div[style*="max-width"] {
            max-width: 100% !important;
            width: 100% !important;
            float: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .blog-body-content figure img,
          .blog-body-content div[style*="max-width"] img {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
        }
      </style>
      <div class="blog-body-content text-[19px] !font-merriweather leading-[1.8rem] text-[#222] outline-none" style="font-family: 'Merriweather', serif;">
        ${bodyHtml}
      </div>
      <script>
        (function () {
          document.querySelectorAll('.blog-body-content a').forEach(function (link) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          });
        })();
      </script>
    </div>
  `;
}



//  RENDER: BlogMoreStoriesCard — was previously unregistered anywhere, so it
//  silently disappeared from published pages. `props.stories` is already
//  resolved (manual picks or automatic category/recency/most-read filtering)
//  by BlogMoreStoriesCard's own `resolveData` at save time, so we just render
//  the same "More Stories" widget the live editor shows.
//  NOTE: the React component injects itself mid-article via a DOM portal at
//  `insertAfterParagraph`, which has no equivalent in static HTML — here the
//  widget renders as its own block wherever it was placed in the grid.
export function renderBlogMoreStoriesCard(props: {
  id?: string;
  headingColor?: string;
  stories?: Array<{ id?: string; headline?: string; title?: string; publishUrl?: string; redirectUrl?: string; summary?: string; storySummary?: string }>;
}, storiesById?: StoryMap): string {
  const { id, stories: savedStories = [] } = props || {};
  // The list is saved with the template; drop stories deactivated since (storiesById holds published ones only).
  const hasPublished = !!storiesById && Object.keys(storiesById).length > 0;
  const stories = hasPublished
    ? savedStories.filter((story) => !story?.id || !!storiesById[story.id])
    : savedStories;
  if (savedStories.length > 0 && stories.length === 0) return '';
  // "Default Color" stores '' — leave border-color unset so the Tailwind grey shows
  const headingColor = props?.headingColor || '';
  const borderStyle = headingColor ? `border-color:${escapeHtml(headingColor)};` : '';
  const accentColor = escapeHtml(headingColor || '#9ca3af');

  const itemsHtml = stories.length
    ? stories
      .map((story, idx) => {
        const headline = escapeHtml(story?.headline || story?.title || "Untitled Story");
        const href = escapeHtml(story?.publishUrl || story?.redirectUrl || "#");
        const summaryText = story?.summary || story?.storySummary || "";
        const summarySpan = summaryText ? `<span class="font-normal text-gray-800"> ${escapeHtml(summaryText)}</span>` : "";
        return `<a key="${idx}" href="${href}" target="_blank" rel="noopener noreferrer" class="group block text-black hover:text-gray-600 underline decoration-gray-400 hover:decoration-[var(--more-stories-accent)] hover:decoration-2 underline-offset-4 transition-all">
            <p class="text-[#222] text-[16px] md:text-[18px] leading-[1.6] inline">
              <strong class="font-bold text-black">${headline}</strong>${summarySpan}
            </p>
          </a>`;
      })
      .join("")
    : `<p class="font-sans text-gray-500 text-[14px]">No stories selected.</p>`;

  return `
    <div id="${id || ""}" class="relative w-full my-8 clear-both font-sans">
      <div class="absolute left-1/2 transform -translate-x-1/2 -top-[14px] bg-white border text-black font-bold text-[12px] px-3 py-1 tracking-widest uppercase z-10" style="${borderStyle}">
        More Reading
      </div>
      <div class="border bg-white p-6 pt-8 flex flex-col gap-5 max-w-[800px] mx-auto" style="${borderStyle} --more-stories-accent:${accentColor};">
        ${itemsHtml}
      </div>
    </div>
  `;
}


//  RENDER: ShareCard (copy + share). Each BlogPostCard instance wires its own buttons.
function renderShareCard({ title, url = "" }: { title?: string; url?: string }, containerId: string) {
  // create buttons with data attributes; wiring script will be inserted by parent
  const safeTitle = escapeHtml(title || "");
  const safeUrl = escapeHtml(url || "");
  console.log("safe Url >>", safeUrl);

  return `
    <div class="flex flex-col items-start space-y-4 pb-2 pt-[1.40rem]">
      <div style="position: relative;">
        <button
          data-puck-share-card-button
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 25px;
            height: 23px;
            background: white;
            border: .25px solid black;
            color: #000;
            cursor: pointer;
            padding: 0;
          "
          title="Share"
          aria-label="Share"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            width="24"
            height="26"
            fill="black"
          >
            <path d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"></path>
          </svg>
        </button>

        <!-- Share Dropdown Menu -->
        <div
          data-puck-share-card-menu
          style="
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid rgb(62, 62, 62);
            border-radius: 0px;
            margin-top: 4px;
            z-index: 1000;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "
        >
        <button
          data-share-card-facebook
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            border-bottom: 1px solid black;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
          <g id="SVGRepo_bgCarrier" stroke-width="0"/>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
          <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M146.8,313.7c10.3,0,21.3,3.2,21.3,3.2l6.6-39.2c0,0-14-4.8-47.4-4.8c-20.5,0-32.4,7.8-41.1,19.3 c-8.2,10.9-8.5,28.4-8.5,39.7v25.7H51.2v38.3h26.5v133h49.6v-133h39.3l2.9-38.3h-42.2v-29.9C127.3,317.4,136.5,313.7,146.8,313.7z"/> </g> </g>
          </svg>
          <h2 class="font-libre italic pl-2 font-semibold">FACEBOOK</h2>
        </button>
        <button
          data-share-card-twitter
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            transition: background-color 0.2s;
            border-bottom: 1px solid black;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" height="25px" width="25px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M113,145c-141.4,0-256,114.6-256,256s114.6,256,256,256s256-114.6,256-256S254.4,145,113,145z M272.8,560.7 c-20.8,20.8-44.9,37.1-71.8,48.4c-27.8,11.8-57.4,17.7-88,17.7c-30.5,0-60.1-6-88-17.7c-26.9-11.4-51.1-27.7-71.8-48.4 c-20.8-20.8-37.1-44.9-48.4-71.8C-107,461.1-113,431.5-113,401s6-60.1,17.7-88c11.4-26.9,27.7-51.1,48.4-71.8 c20.9-20.8,45-37.1,71.9-48.5C52.9,181,82.5,175,113,175s60.1,6,88,17.7c26.9,11.4,51.1,27.7,71.8,48.4 c20.8,20.8,37.1,44.9,48.4,71.8c11.8,27.8,17.7,57.4,17.7,88c0,30.5-6,60.1-17.7,88C309.8,515.8,293.5,540,272.8,560.7z"/> <path d="M234.3,313.1c-10.2,6-21.4,10.4-33.4,12.8c-9.6-10.2-23.3-16.6-38.4-16.6c-29,0-52.6,23.6-52.6,52.6c0,4.1,0.4,8.1,1.4,12 c-43.7-2.2-82.5-23.1-108.4-55c-4.5,7.8-7.1,16.8-7.1,26.5c0,18.2,9.3,34.3,23.4,43.8c-8.6-0.3-16.7-2.7-23.8-6.6v0.6 c0,25.5,18.1,46.8,42.2,51.6c-4.4,1.2-9.1,1.9-13.9,1.9c-3.4,0-6.7-0.3-9.9-0.9c6.7,20.9,26.1,36.1,49.1,36.5 c-18,14.1-40.7,22.5-65.3,22.5c-4.2,0-8.4-0.2-12.6-0.7c23.3,14.9,50.9,23.6,80.6,23.6c96.8,0,149.7-80.2,149.7-149.7 c0-2.3,0-4.6-0.1-6.8c10.3-7.5,19.2-16.7,26.2-27.3c-9.4,4.2-19.6,7-30.2,8.3C222.1,335.7,230.4,325.4,234.3,313.1z"/> </g> </g>
          </svg>
          <h1 class="font-libre italic pl-2 font-semibold">TWITTER</h1>
        </button>
        <button
          data-share-card-linkedin
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            border-bottom: 1px solid black;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.setAttribute('style', 'filter: brightness(0) invert(1)'));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.removeAttribute('style'));"
        >
          <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-143 145 512 512" xml:space="preserve" width="25px" height="25px">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M329,145h-432c-22.1,0-40,17.9-40,40v432c0,22.1,17.9,40,40,40h432c22.1,0,40-17.9,40-40V185C369,162.9,351.1,145,329,145z M339,617c0,5.5-4.5,10-10,10h-432c-5.5,0-10-4.5-10-10V185c0-5.5,4.5-10,10-10h432c5.5,0,10,4.5,10,10V617z"/> <rect x="-8.5" y="348.4" width="49.9" height="159.7"/> <path d="M177.7,346.9c-28.6,0-46.5,15.6-49.8,26.6v-25.1H71.8c0.7,13.3,0,159.7,0,159.7h56.1v-86.3c0-4.9-0.2-9.7,1.2-13.1 c3.8-9.6,12.1-19.6,27-19.6c19.5,0,28.3,14.8,28.3,36.4v82.6H241v-88.8C241,369.9,213.2,346.9,177.7,346.9z"/> <path d="M15.4,273c-18.4,0-30.5,11.9-30.5,27.7c0,15.5,11.7,27.7,29.8,27.7h0.4c18.8,0,30.5-12.3,30.4-27.7 C45.1,284.9,33.8,273,15.4,273z"/> </g> </g>
          </svg>
          <h2 class="font-libre italic pl-2 font-semibold">LINKEDIN</h2>
        </button>
        <button
          data-share-card-whatsapp
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            color: #333;
            font-family: libre;
            transition: background-color 0.2s;
            border-bottom: 1px solid black;
          "
          onmouseover="this.style.backgroundColor='black'; this.style.color='white'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', 'white')));"
          onmouseout="this.style.backgroundColor='white'; this.style.color='#333'; this.querySelectorAll('svg').forEach(s => s.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#000000')));"
        >
          <svg fill="#000000" width="25px" height="25px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"/>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="SVGRepo_iconCarrier">
            <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z"/>
            <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z"/>
            </g>
          </svg>
          <h1 class="font-libre italic pl-2 font-semibold">WHATSAPP</h1>
        </button>
      </div>

      <div style="position: relative; display: inline-block;">
        <button
          data-puck-copy-button
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: none;
            border: none;
            color: #4b5563;
            cursor: pointer;
            padding-top: 2rem;
          "
          title="Copy link"
          aria-label="Copy link"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="26"
            fill="black"
          >
            <path
              d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1m5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2m-2 0H9V4h9z"
            ></path>
          </svg>
        </button>

        <span data-puck-copied-msg style="display:none; position: absolute; top: calc(100% + 20px); left: 50%; transform: translateX(-50%); white-space: nowrap;" class="text-sm text-green-600">Copied!</span>
      </div>

      <script>
        (function() {
          var container = document.getElementById("${escapeHtml(containerId)}");
          if (!container) return;

          // Get dropdown menu and buttons
          var shareBtn = container.querySelector('[data-puck-share-card-button]');
          var shareMenu = container.querySelector('[data-puck-share-card-menu]');
          var copyBtns = container.querySelectorAll('[data-puck-copy-button]');
          var msg = container.querySelector('[data-puck-copied-msg]');

          var pageUrl = typeof window !== 'undefined' ? window.location.href : '';
          var pageTitle = "${safeTitle}" || document.title || 'OpenPress | Free, independent news for everyone';

          // Mobile detection utility
          function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          }

          function isIOS() {
            return /iPhone|iPad|iPod/i.test(navigator.userAgent);
          }

          function isAndroid() {
            return /Android/i.test(navigator.userAgent);
          }

          function isSafari() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          }

          // Open URL in new tab (Safari-compatible)
          function openInNewTab(url) {
            // Safari handles window.open without specs better - opens as new tab
            // Other browsers work fine with popup specs
            if (isSafari()) {
              window.open(url, '_blank');
            } else {
              window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
            }
          }

          // Smart share handler - uses navigator.share on mobile/PWA if available, or web popup
          function smartShare(appUrl, webUrl, fallbackFn) {
            if (navigator.share && isMobile()) {
              navigator.share({
                title: pageTitle,
                url: pageUrl
              }).catch(function() {
                openInNewTab(webUrl);
              });
              return;
            }
            if (fallbackFn) {
              fallbackFn();
            } else {
              openInNewTab(webUrl);
            }
          }

          // Build WhatsApp message
          function buildWhatsAppMessage(title, url) {
            var cleanTitle = (title || '').trim();
            var messageLines = [];
            if (cleanTitle) {
              messageLines.push('📰 *' + cleanTitle + '*');
            }
            messageLines.push('');
            messageLines.push('Reading independent journalism on OpenPress.');
            messageLines.push('');
            messageLines.push('🔗 ' + url);
            return messageLines.join('\\n');
          }

          // Toggle dropdown menu on Share button click (or native Web Share API on mobile PWA)
          if (shareBtn && shareMenu) {
            shareBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              if (navigator.share && isMobile()) {
                navigator.share({
                  title: pageTitle,
                  url: pageUrl
                }).catch(function() {});
                return;
              }
              var isVisible = shareMenu.style.display === 'block';
              shareMenu.style.display = isVisible ? 'none' : 'block';
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
              if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
                shareMenu.style.display = 'none';
              }
            });

            // Facebook Share
            var facebookBtn = container.querySelector('[data-share-card-facebook]');
            if (facebookBtn) {
              facebookBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                      platform: "facebook",
                      page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                var encodedUrl = encodeURIComponent(pageUrl);
                var webUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
                openInNewTab(webUrl);
              });
            }

            // Twitter/X Share
            var twitterBtn = container.querySelector('[data-share-card-twitter]');
            if (twitterBtn) {
              twitterBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "twitter",
                        page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                var text = encodeURIComponent(pageTitle);
                var url = encodeURIComponent(pageUrl);
                var webUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;
                openInNewTab(webUrl);
              });
            }

            // LinkedIn Share
            var linkedinBtn = container.querySelector('[data-share-card-linkedin]');
            if (linkedinBtn) {
              linkedinBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "linkedin",
                        page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                var webUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl);
                openInNewTab(webUrl);
              });
            }

            // WhatsApp Share
            var whatsappBtn = container.querySelector('[data-share-card-whatsapp]');
            if (whatsappBtn) {
              whatsappBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "whatsapp",
                        page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                var message = buildWhatsAppMessage(pageTitle, pageUrl);
                var encodedMsg = encodeURIComponent(message);
                var webUrl = isMobile()
                  ? 'https://api.whatsapp.com/send?text=' + encodedMsg
                  : 'https://web.whatsapp.com/send?text=' + encodedMsg;
                openInNewTab(webUrl);
              });
            }

            // Copy Link from dropdown
            var copyFromDropdown = container.querySelector('[data-share-card-copy]');
            if (copyFromDropdown) {
              copyFromDropdown.addEventListener('click', function(e) {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "copy_link",
                        page: window.location.pathname
                    }
                  });
                }
                e.preventDefault();
                doCopy(pageUrl);
              });
            }
          }

          // Copy button below
          copyBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              if (window.cwr) {
                window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "copy_link",
                        page: window.location.pathname
                    }
                  });
              }
              e.preventDefault();
              var toCopy = typeof window !== 'undefined' ? window.location.href : pageUrl;
              if (!toCopy) {
                console.error('No URL available to copy');
                return;
              }
              doCopy(toCopy);
            });
          });

          function doCopy(urlToCopy) {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(urlToCopy).then(function() {
                showCopyNotification();
              }).catch(function(err) {
                console.error('Clipboard copy failed:', err);
                fallbackCopy();
              });
            } else {
              fallbackCopy();
            }

            function fallbackCopy() {
              var textArea = document.createElement('textarea');
              textArea.value = urlToCopy;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                showCopyNotification();
              } catch (err) {
                console.error('Fallback copy failed:', err);
              }
              document.body.removeChild(textArea);
            }

            function showCopyNotification() {
              if (msg) {
                msg.style.display = 'inline';
                setTimeout(function() {
                  msg.style.display = 'none';
                }, 2000);
              }
            }
          }
        })();
      </script>
    </div>
    </div>
  `;
}

//  MAIN RENDERER: BlogPostCard
export function renderBlogPostCard(
  props: {
    id?: string;
    storyId?: string;
    title?: string;
    author?: string;
    time?: string;
    category?: string;
    section?: string;
    imageUrl?: string;
    bodyText?: string;
    className?: string;
  },
  zones: Record<string, PuckBlock[]>,
  storiesById: StoryMap,
  ctx?: RenderContext
): string {
  const {
    id,
    storyId,
    title = "Default Blog Title",
    author = "Author Name",
    time = "Just now",
    category = "CATEGORY",
    section,
    imageUrl,
    bodyText,
    className = "",
  } = props || {};


  function renderEditorJsBlocks(blocks: any[]) {
    if (!Array.isArray(blocks)) return "";

    return blocks
      .map((block) => {
        if (!block || typeof block !== "object") return "";
        const data = block.data || {};

        if (block.type === "paragraph") {
          return `<p>${data.text || ""}</p>`;
        }
        else if (block.type === "image") {
          const url = data.file?.url || data.url || "";
          const rawCaption = data.caption || data.file?.caption || data.text || data.title || "";
          const caption = (rawCaption && !rawCaption.startsWith("Image contains:")) ? rawCaption : "";
          // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
          // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
          const imageTune = block.tunes?.imageWrapTune || data.tunes?.imageWrapTune || {};
          const wrapAlign = imageTune.wrapAlign || null;
          const captionHtml = caption ? `<figcaption class="openPress-story-caption font-lato text-[16px] leading-snug font-medium text-left m-0 mt-2 mb-4" style="color:#716d6d; font-family:'Lato',sans-serif;">${caption}</figcaption>` : "";

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
          return `<figure class="mb-4" style="margin-bottom: 1rem; max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="display: block; width:100%; height: auto; object-fit: contain;" />${captionHtml}</figure>`;
        }
        else if (block.type === "wrappedImageParagraph") {
          const url = data.imageUrl || "";
          const wrapAlign = data.wrapAlign || "left";
          const caption = data.caption || "";
          const text = data.text || "";
          const width = data.width || 40;
          const floatStyle = wrapAlign === 'left'
            ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
            : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
          return `<div style="overflow:hidden;"><div style="${floatStyle}"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${escapeHtml(caption)}</p>` : ''}</div><p>${text}</p></div>`;
        }
        else if (block.type === "caption") {
          return `<p class="openPress-story-caption font-lato" style="margin: 0 0 1rem 0; color: #716d6d; font-family: 'Lato', sans-serif; font-size: 16px; font-weight: 500; line-height: 1.35; text-align: left;">${data.text || ""}</p>`;
        }
        else if (block.type === "header") {
          const level = data.level || 2;
          return `<h${level}>${data.text || ""}</h${level}>`;
        }
        else if (block.type === "list") {
          const isOrdered = data.style === "ordered";
          const tag = isOrdered ? "ol" : "ul";
          const listStyleType = isOrdered ? "decimal" : "disc";
          const items = Array.isArray(data.items)
            ? data.items.map((item: any) => `<li style="margin-bottom: 0.25rem;">${typeof item === 'string' ? item : item.content || ""}</li>`).join("")
            : "";
          return `<${tag} style="list-style-type: ${listStyleType}; padding-left: 1.5rem; margin-bottom: 1rem;">${items}</${tag}>`;
        }
        else if (block.type === "quote") {
          const text = data.text || "";
          const alignment = data.alignment || "left";
          const caption = data.caption ? `<cite>${data.caption}</cite>` : "";
          return `<blockquote style="text-align: ${alignment};">${text}${caption}</blockquote>`;
        }
        else if (block.type === "embed" || block.type === "youtube" || block.type === "instagram" || block.type === "soundcloud") {
          const embedUrl = data.embed || data.source;
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

            if (data.service === 'instagram') {
              style += ' max-width: 550px; height: 700px;';
            } else if (data.service === 'soundcloud') {
              style += ' height: 300px;';
            } else if (data.service === 'youtube') {
              style += ' aspect-ratio: 16/9; max-width: 800px;';
            }

            return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
          }
          return "";
        }
        else if (block.type === "facebook") {
          const embedUrl = data.url || data.embed || data.source;
          if (embedUrl) {
            const trimmedCaption = (data.caption || "").trim();
            const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
            const encodedUrl = encodeURIComponent(embedUrl);
            const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
            return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
          }
          return "";
        }
        else if (block.type === "twitter") {
          const tweetHtml = (data.html || '').replace(/\n/g, '');
          const trimmedCaption = (data.caption || "").trim();
          const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          return `<div class="twitter-embed-wrapper mb-2 w-full flex flex-col items-center">${tweetHtml}${tweetCaption}</div>`;
        }
        return "";
      })
      .join("");
  }


  console.log("props of blog post card >>>>", props);
  console.log("storiesById of blog post card >>>>>>", storiesById);
  console.log("zones of blog post card >>>", zones);

  // bulletproof story lookup
  const story: BlogStory | null = (storyId && storiesById && storiesById[storyId])
    ? storiesById[storyId]
    : (storiesById
      ? Object.values(storiesById).find(s => s && (s.id === storyId || (s as any).storyId === storyId || (s as any).slug === storyId)) ||
      (Object.keys(storiesById).length === 1 ? Object.values(storiesById)[0] : null)
      : null);
  console.log("story in blog post card>>>", story);

  // NOTE: these fields are guaranteed to exist because PublishDrawer overrides them
  const displayTitle =
    story?.headline ||
    story?.title ||
    title;


  if (typeof window !== "undefined") {
    window.__PUCK_FINAL_TITLE__ = displayTitle;
  }

  console.log("dispayTitle >>>", displayTitle);

  const displayAuthor =
    story?.author ||
    story?.authorName ||
    author;

  const displayCategory =
    story?.category ||
    category;

  console.log("display category >>", displayCategory);
  const displaySection =
    story?.section ||
    section;

  const displayTime =
    story?.readTime ||
    time;


  const displayImage =
    story?.imageUrl ||
    story?.image ||
    imageUrl;

  if (typeof window !== "undefined") {
    window.__PUCK_FINAL_IMAGE__ = displayImage;
  }

  // editorJS > fullDescription > summary
  let displayBody = "";

  if (story?.description?.blocks) {
    console.log("inside editorJS");
    displayBody = renderEditorJsBlocks(story.description.blocks);
  } else if (story?.fullDescription) {
    console.log("inside fullDescription");
    displayBody = story.fullDescription;
  } else {
    console.log("inside else");
    displayBody = bodyText || "";
  }

  // if (story?.fullDescription) {
  //   console.log("1");
  //   displayBody = story.fullDescription;
  // } else if (story?.summary) {
  //   console.log("2");
  //   displayBody = story.summary;
  // } else if (story?.description?.blocks) {
  //   console.log("3");
  //   displayBody = renderEditorJsBlocks(story.description.blocks);
  // } else {
  //   console.log("4");
  //   displayBody = bodyText || "";
  // }

  console.log("displayBodyyyyy >>>>", displayBody);

  // container id (use provided id or a generated one)
  const containerId = id || `blogpost-${Math.random().toString(36).slice(2, 9)}`;


  // build subparts
  const mainTitleHTML = renderBlogMainTitle({ id: containerId + "-main-title", storyId, fallbackTitle: displayTitle }, storiesById);
  const subHeadingHTML = renderBlogSubHeading({ id: containerId + "-sub", time: displayTime, category: displaySection }, containerId);
  const imageCardHTML = renderBlogImageCard({ storyId, imageUrl: displayImage, title: displayTitle }, storiesById);
  const titleHTML = renderBlogTitle({ text: displayTitle, author: displayAuthor, storyId }, storiesById, ctx?.allAuthors || []);
  const bodyHTML = renderBlogBodyCard({ storyId, bodyText: displayBody }, storiesById, ctx?.campaigns || [], ctx?.moreStoriesInjections || [], ctx?.storiesById);

  // Share card: pass title and url; url resolved at runtime if possible
  const pageUrl = (typeof window !== 'undefined' && window.location) ? window.location.href : "";
  const shareCardHTML = renderShareCard({ title: displayTitle, url: pageUrl }, containerId);

  // Prepare meta tag values
  const ogTitle = escapeHtml(displayTitle);
  const ogDescription = escapeHtml(story?.summary || displayBody?.substring(0, 160).replace(/<[^>]*>/g, '') || "OpenPress is a free, open publishing platform for independent journalism, covering news, politics, culture and more. Every article is free to read.");

  // Ensure ogImage is an absolute URL
  let rawOgImage = displayImage || "";
  if (rawOgImage) {
    if (rawOgImage.startsWith('//')) {
      // Handle protocol-relative URLs
      rawOgImage = `https:${rawOgImage}`;
    } else if (!rawOgImage.startsWith('http') && !rawOgImage.startsWith('data:') && typeof window !== 'undefined') {
      // Handle relative URLs using current window origin
      rawOgImage = `${window.location.origin}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;
    }
  }
  const ogImage = escapeHtml(rawOgImage);

  // const ogType = "article";

  // INJECT META TAGS INTO HEAD AT RENDER TIME (not runtime)
  // This ensures Facebook crawler reads them before page load
  if (typeof window !== 'undefined' && document && document.head) {
    // Helper function to set meta tag
    const setMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setNameTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Set Open Graph tags
    setMetaTag('og:title', ogTitle);
    setMetaTag('og:description', ogDescription);
    setMetaTag('og:image', ogImage);
    setMetaTag('og:type', 'article');

    // Twitter Card tags
    setNameTag('twitter:card', 'summary_large_image');
    setNameTag('twitter:title', ogTitle);
    setNameTag('twitter:description', ogDescription);
    setNameTag('twitter:image', ogImage);

    // General meta tags
    setNameTag('description', ogDescription);
  }

  return `
    <article id="${escapeHtml(containerId)}" class="${escapeHtml(className)}">
      <div class="flex flex-col">
        <div class="mb-4 lg:mb-6 max-w-full lg:max-w-[808px]">
          ${mainTitleHTML}
        </div>

        <div class="w-full mr-0 lg:mr-[120px]">
          ${subHeadingHTML}
        </div>

        <div class="mt-2 mb-0 w-full overflow-hidden" id="${containerId}-image-section">
          <div class="mr-0 lg:mr-[120px]">
            ${imageCardHTML}
          </div>
        </div>

        <!-- Content Area with Sticky Share Side -->
        <div class="flex flex-row items-start relative mt-6">

            <!-- Share Buttons - Hidden on mobile, sticky on desktop -->
            <div class="hidden lg:block w-[40px] shrink-0 lg:sticky top-28 z-10 self-start">
               ${shareCardHTML}
            </div>


            <!-- Title and Body Content - Takes remaining space -->
            <div class="w-full lg:w-[768px] mr-0 lg:mr-[120px] border-b border-dotted border-black lg:border-none">
              ${titleHTML}
              ${bodyHTML}
            </div>

        </div>


      </div>

      <script>
        (function() {
          // Initialize share menu - define function inline to avoid reference errors
          (function(containerId) {
            const shareBtn = document.querySelector("#" + containerId + " [data-puck-share]");
            const shareMenu = document.querySelector("#" + containerId + " [data-puck-share-menu]");
            const facebookBtn = document.querySelector("#" + containerId + " [data-share-facebook]");
            const whatsappBtn = document.querySelector("#" + containerId + " [data-share-whatsapp]");
            const linkedinBtn = document.querySelector("#" + containerId + " [data-share-linkedin]");
            const twitterBtn = document.querySelector("#" + containerId + " [data-share-twitter]");

            if (!shareBtn || !shareMenu) return;

            const pageUrl = window.location.href;
            const pageTitle = "${ogTitle}" || document.title || 'OpenPress | Free, independent news for everyone';

            // Mobile detection utilities
            function isMobile() {
              return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }

            function isAndroid() {
              return /Android/i.test(navigator.userAgent);
            }

            function isSafari() {
              return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            }

            // Open URL in new tab (Safari-compatible)
            function openInNewTab(url) {
              if (isSafari()) {
                window.open(url, '_blank');
              } else {
                window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
              }
            }

            // Smart share handler - uses navigator.share on mobile/PWA if available, or web popup
            function smartShare(appUrl, webUrl, desktopFn) {
              if (navigator.share && isMobile()) {
                navigator.share({
                  title: pageTitle,
                  url: pageUrl
                }).catch(() => {
                  openInNewTab(webUrl);
                });
                return;
              }
              if (desktopFn) {
                desktopFn();
              } else {
                openInNewTab(webUrl);
              }
            }

            function buildWhatsAppMessage(title, url) {
              const cleanTitle = (title || '').trim();
              const messageLines = [];
              if (cleanTitle) {
                messageLines.push('📰 *' + cleanTitle + '*');
              }
              messageLines.push('');
              messageLines.push('Reading independent journalism on OpenPress.');
              messageLines.push('');
              messageLines.push('🔗 ' + url);
              return messageLines.join('\\n');
            }

            // Toggle menu on button click (or native Web Share API on mobile PWA)
            shareBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (navigator.share && isMobile()) {
                navigator.share({
                  title: pageTitle,
                  url: pageUrl
                }).catch(() => {});
                return;
              }
              const isVisible = shareMenu.style.display === 'block';
              shareMenu.style.display = isVisible ? 'none' : 'block';
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
              if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
                shareMenu.style.display = 'none';
              }
            });

            // Facebook Share
            if (facebookBtn) {
              facebookBtn.addEventListener('click', () => {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                        platform: "facebook",
                        page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                const encodedUrl = encodeURIComponent(pageUrl);
                const webUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
                openInNewTab(webUrl);
              });
            }

            // WhatsApp Share
            if (whatsappBtn) {
              whatsappBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                      platform: "whatsapp",
                      page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                const message = buildWhatsAppMessage(pageTitle, pageUrl);
                const encodedMsg = encodeURIComponent(message);
                const webUrl = isMobile()
                  ? 'https://api.whatsapp.com/send?text=' + encodedMsg
                  : 'https://web.whatsapp.com/send?text=' + encodedMsg;
                openInNewTab(webUrl);
              });
            }

            // LinkedIn Share
            if (linkedinBtn) {
              linkedinBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                      platform: "linkedin",
                      page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                const webUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl);
                openInNewTab(webUrl);
              });
            }

            // Twitter/X Share
            if (twitterBtn) {
              twitterBtn.addEventListener('click', function() {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                      platform: "twitter",
                      page: window.location.pathname
                    }
                  });
                }
                shareMenu.style.display = 'none';
                const text = encodeURIComponent(pageTitle);
                const url = encodeURIComponent(pageUrl);
                const webUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;
                openInNewTab(webUrl);
              });
            }

            // Copy Link
            const copyBtn = document.querySelector("#" + containerId + " [data-share-share]");
            if (copyBtn) {
              copyBtn.addEventListener('click', (e) => {
                if (window.cwr) {
                  window.cwr('recordEvent', {
                    type: "share_button_click",
                    data: {
                      platform: "copy_link",
                      page: window.location.pathname
                    }
                  });
                }
                e.preventDefault();

                // Use the current page URL
                const urlToCopy = pageUrl;

                if (!urlToCopy) {
                  console.error('No URL available to copy');
                  return;
                }

                // Try modern Clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(urlToCopy)
                    .then(() => {
                      showCopyNotification();
                      shareMenu.style.display = 'none';
                    })
                    .catch((err) => {
                      console.error('Clipboard copy failed:', err);
                      fallbackCopy();
                    });
                } else {
                  fallbackCopy();
                }

                // Fallback for older browsers
                function fallbackCopy() {
                  const textArea = document.createElement('textarea');
                  textArea.value = urlToCopy;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    showCopyNotification();
                  } catch (err) {
                    console.error('Fallback copy failed:', err);
                  }
                  document.body.removeChild(textArea);
                  shareMenu.style.display = 'none';
                }

                // Show notification
                function showCopyNotification() {
                  // Create notification if it doesn't exist
                  let notification = document.querySelector("#" + containerId + " [data-copy-notification]");
                  if (!notification) {
                    notification = document.createElement('div');
                    notification.setAttribute('data-copy-notification', '');
                    notification.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #10b981; color: white; padding: 12px 20px; border-radius: 6px; font-size: 14px; z-index: 10000; animation: slideIn 0.3s ease-out;';
                    notification.textContent = '✓ Link copied to clipboard!';
                    document.body.appendChild(notification);
                  }

                  notification.style.display = 'block';
                  notification.style.animation = 'slideIn 0.3s ease-out';

                  setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => {
                      notification.style.display = 'none';
                    }, 300);
                  }, 2000);
                }
              });
            }
          })("${containerId}");

          // Add CSS animations if not already present
          if (!document.querySelector('style[data-copy-animations]')) {
            const style = document.createElement('style');
            style.setAttribute('data-copy-animations', '');
            style.textContent = \`
              @keyframes slideIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
              }
              @keyframes slideOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
              }
            \`;
            document.head.appendChild(style);
          }

          // Initial check
        })();
      </script>
    </article>
  `;
}
