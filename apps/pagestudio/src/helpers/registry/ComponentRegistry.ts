import type { RenderContext } from '../core/renderTypes'

// Import ALL renderers here
import { renderMastheadNavbar } from '../renderers/renderMastheadNavbar'
import { renderAdvertisementGrid } from '../renderers/renderAdvertisementGrid'
import { renderThumbnailGrid } from '../renderers/renderThumbnailGrid'
import { renderHeroGrid } from '../renderers/renderHeroGrid'
import { renderPopularGrid } from '../renderers/renderPopularGrid'
import { renderMultimediaGrid } from '../renderers/renderMultimediaGrid'
import { renderAllStoriesGrid } from '../renderers/renderAllStoriesGrid'
import { renderHeading } from '../renderers/renderHeading'
import { renderAdCard } from '../renderers/renderAdCard'
import { renderInStoryAd } from '../renderers/renderInStoryAd'
import { renderLeaderboardAd } from '../renderers/renderLeaderboardAd'
import { renderSidebarAd } from '../renderers/renderSidebarAd'
import { renderSpotlightAd } from '../renderers/renderSpotlightAd'
import { renderShowcaseCard } from '../renderers/renderShowcaseCard'
import { renderHoverCard } from '../renderers/renderHoverCard'
import { renderStoryCard } from '../renderers/renderStoryCard'
import { renderMultimediaCard } from '../renderers/renderMultimediaCard'
import { renderMainCard } from '../renderers/renderMainCard'
import { renderRecommendCard } from '../renderers/renderRecommendCard'
import { renderMostPopularCard } from '../renderers/renderMostPopularCard'
import { renderStorySubCard } from '../renderers/renderStorySubCard'
import { renderFeaturedCard } from '../renderers/renderFeaturedCard'
import { renderSidebarStoryCard } from '../renderers/renderSidebarStoryCard'
import { renderBorder } from '../renderers/renderBorder'
import { renderErrorCard } from '../renderers/renderErrorCard'
import { renderSectionGrid } from '../renderers/renderSectionGrid'
import { renderSectionBottomGrid } from '../renderers/renderSectionBottomGrid'
import { renderBottomCardList } from '../renderers/renderBottomCardList'
import { renderBottomCard } from '../renderers/renderBottomCard'
import { renderFooter } from '../renderers/renderFooter'
import { renderAboutUs } from '../renderers/renderAboutUs'
import { renderSupportUs } from '../renderers/renderSupportUs'
import { renderAuthorCard } from '../renderers/renderAuthorCard'
import { renderAuthorProfile } from '../renderers/renderAuthorProfile'
import { renderAuthorsGrid } from '../renderers/renderAuthorsGrid'
import { renderAuthorsGridManual } from '../renderers/renderAuthorsGridManual'
import { renderPrivacyPolicy } from '../renderers/renderPrivacyPolicy'
import { renderMediaCouncil } from '../renderers/renderMediaCouncil'
import { renderContactUs } from '../renderers/renderContactUs'
import {
  renderBlogGrid,
  renderBlogPostCard,
  renderPopularBlogCard,
  renderBlogShowcaseCard,
  renderBlogMoreStoriesCard,
} from '../blog/renderFunctions'

/**
 * ComponentRegistry
 *
 * This is the SINGLE source of truth that maps:
 * Puck block `type`  ->  HTML renderer function
 *
 * Every renderer must:
 *   - accept (props, ctx)
 *   - return a string (HTML)
 */
export const ComponentRegistry: Record<
  string,
  (props: any, ctx: RenderContext) => string
> = {
  /**
   * ========== NAVIGATION ==========
   */
  AtlanticNavbar: (props, ctx) =>
    renderMastheadNavbar({
      id: props.id,
      sections: ctx.sections ?? [],
      activeSection: ctx.activeSection ?? 'HOME',
      showBanner: props.showBanner ?? false,
      showSignIn: props.showSignIn ?? false,
      showSupportUs: props.showSupportUs ?? false,
      showBecomeMember: props.showBecomeMember ?? true,
      showFacebook: props.showFacebook ?? true,
      showLinkedIn: props.showLinkedIn ?? true,
      storiesById: ctx.storiesById ?? {},
      // Banner
      bannerText: props.bannerText,
      bannerBgColor: props.bannerBgColor,
      bannerTextColor: props.bannerTextColor,
      // Support Us button
      supportUsText: props.supportUsText,
      supportUsBgColor: props.supportUsBgColor,
      supportUsTextColor: props.supportUsTextColor,
      // Sign In button
      signInText: props.signInText,
      signInBgColor: props.signInBgColor,
      signInTextColor: props.signInTextColor,
      // Become a Member button
      becomeMemberText: props.becomeMemberText,
      becomeMemberBgColor: props.becomeMemberBgColor,
      becomeMemberTextColor: props.becomeMemberTextColor,
      // Global theme color
      themeColor: props.themeColor,
    }),

  /**
   * ========== GRIDS / CONTAINERS ==========
   */
  AdvertisementGrid: (props, ctx) =>
    renderAdvertisementGrid(
      {
        id: props.id,
        heading: props.heading,
        infoLabel: props.infoLabel,
        brandName: props.brandName,
      },
      ctx
    ),

  ThumbnailGrid: (props, ctx) =>
    renderThumbnailGrid(
      {
        id: props.id,
        mode: props.mode,
        className: props.className,
        automaticCategory: props.automaticCategory,
        autoStoryIds: props.autoStoryIds,
        thumbnailGridIndex: props.thumbnailGridIndex,
        thumbnailGridTotal: props.thumbnailGridTotal,
      },
      ctx
    ),
  HeroGrid: (props, ctx) =>
    renderHeroGrid(
      {
        id: props.id,
        className: props.className,
        mode: props.mode,
        autoStoryIds: props.autoStoryIds,
      },
      ctx
    ),
  PopularGrid: (props, ctx) =>
    renderPopularGrid(
      {
        id: props.id,
        className: props.className,
        mode: props.mode,
        autoStoryIds: props.autoStoryIds,
      },
      ctx
    ),
  MultimediaGrid: (props, ctx) =>
    renderMultimediaGrid(
      {
        id: props.id,
        className: props.className,
        mode: props.mode,
        autoStoryIds: props.autoStoryIds,
      },
      ctx
    ),
  AllStoriesGrid: (props, ctx) =>
    renderAllStoriesGrid(
      {
        id: props.id,
        className: props.className,
        mode: props.mode,
        autoStoryIds: props.autoStoryIds,
      },
      ctx
    ),
  Heading: (props, ctx) =>
    renderHeading({
      id: props.id,
      text: props.text,
      align: props.align,
      level: props.level,
      size: props.size,
    }, ctx),
  BlogHeading: (props, ctx) =>
    renderHeading({
      id: props.id,
      text: props.text,
      align: props.align,
      level: props.level,
      size: props.size,
    }, ctx),
  AdCard: (props) =>
    renderAdCard({
      product: props.product,
    }),
  InStoryAd: (props, ctx) =>
    renderInStoryAd({
      id: props.id,
      adId: props.adId,
      desktopImageUrl: props.desktopImageUrl,
      mobileImageUrl: props.mobileImageUrl,
      linkUrl: props.linkUrl,
      altText: props.altText,
      fallbackBlock: props.fallbackBlock,
      fallbackStoryId: props.fallbackStoryId,
      fallbackAllowed: props.fallbackAllowed,
      _autoFallbackStoryId: props._autoFallbackStoryId,
      _autoFallbackTitle: props._autoFallbackTitle,
      _autoFallbackLabel: props._autoFallbackLabel,
      _autoFallbackImageUrl: props._autoFallbackImageUrl,
      _autoFallbackPublishUrl: props._autoFallbackPublishUrl,
      desktopDimensions: props.desktopDimensions,
      mobileDimensions: props.mobileDimensions,
    }, ctx),
  LeaderboardAd: (props, ctx) =>
    renderLeaderboardAd({
      id: props.id,
      adId: props.adId,
      desktopImageUrl: props.desktopImageUrl,
      mobileImageUrl: props.mobileImageUrl,
      linkUrl: props.linkUrl,
      altText: props.altText,
      fallbackBlock: props.fallbackBlock,
      fallbackStoryId: props.fallbackStoryId,
      fallbackAllowed: props.fallbackAllowed,
      _autoFallbackStoryId: props._autoFallbackStoryId,
      _autoFallbackTitle: props._autoFallbackTitle,
      _autoFallbackLabel: props._autoFallbackLabel,
      _autoFallbackImageUrl: props._autoFallbackImageUrl,
      _autoFallbackPublishUrl: props._autoFallbackPublishUrl,
      desktopDimensions: props.desktopDimensions,
      mobileDimensions: props.mobileDimensions,
    }, ctx),
  SidebarAd: (props, ctx) =>
    renderSidebarAd({
      id: props.id,
      adId: props.adId,
      desktopImageUrl: props.desktopImageUrl,
      mobileImageUrl: props.mobileImageUrl,
      linkUrl: props.linkUrl,
      altText: props.altText,
      fallbackBlock: props.fallbackBlock,
      fallbackStoryId: props.fallbackStoryId,
      fallbackAllowed: props.fallbackAllowed,
      _autoFallbackStoryId: props._autoFallbackStoryId,
      _autoFallbackTitle: props._autoFallbackTitle,
      _autoFallbackLabel: props._autoFallbackLabel,
      _autoFallbackImageUrl: props._autoFallbackImageUrl,
      _autoFallbackPublishUrl: props._autoFallbackPublishUrl,
      desktopDimensions: props.desktopDimensions,
      mobileDimensions: props.mobileDimensions,
    }, ctx),

  SpotlightAd: (props, ctx) =>
    renderSpotlightAd({
      id: props.id,
      adId: props.adId,
      linkUrl: props.linkUrl,
      altText: props.altText,
      fallbackBlock: props.fallbackBlock,
      fallbackStoryId: props.fallbackStoryId,
      fallbackAllowed: props.fallbackAllowed,
      _autoFallbackStoryId: props._autoFallbackStoryId,
      _autoFallbackTitle: props._autoFallbackTitle,
      _autoFallbackLabel: props._autoFallbackLabel,
      _autoFallbackImageUrl: props._autoFallbackImageUrl,
      _autoFallbackPublishUrl: props._autoFallbackPublishUrl,
    }, ctx),

  ShowcaseCard: (props, ctx) =>
    renderShowcaseCard(
      {
        items: props.items,
        noBorder: props.noBorder,
      },
      ctx
    ),
  HoverCard: (props, ctx) =>
    renderHoverCard(
      {
        items: props.items,
        noBorder: props.noBorder,
      },
      ctx
    ),
  StoryCard: (props, ctx) =>
    renderStoryCard(
      {
        id: props.id,
        storyId: props.storyId,
        imageUrl: props.imageUrl,
        label: props.label,
        title: props.title,
        description: props.description,
      },
      ctx
    ),

  MultimediaCard: (props, ctx) =>
    renderMultimediaCard(
      {
        id: props.id,
        storyId: props.storyId,
        imageUrl: props.imageUrl,
        title: props.title,
        description: props.description,
        author: props.author,
        duration: props.duration,
      },
      ctx
    ),
  MainCard: (props, ctx) =>
    renderMainCard(
      {
        storyId: props.storyId,
        imageUrl: props.imageUrl,
        label: props.label,
        title: props.title,
        description: props.description,
      },
      ctx
    ),

  RecommendCard: (props, ctx) =>
    renderRecommendCard(
      {
        storyId: props.storyId,
        title: props.title,
        label: props.label,
        imageUrl: props.imageUrl,
        imageAlt: props.imageAlt,
        className: props.className,
      },
      ctx
    ),
  MostPopularTable: (props, ctx) =>
    renderMostPopularCard(
      {
        id: props.id,
        items: props.items,
      },
      ctx
    ),

  StorySubCard: (props, ctx) =>
    renderStorySubCard(
      {
        id: props.id,
        storyId: props.storyId,
      },
      ctx
    ),
  FeaturedCard: (props, ctx) =>
    renderFeaturedCard(
      {
        items: props.items,
      },
      ctx
    ),
  SidebarStoryCard: (props, ctx) =>
    renderSidebarStoryCard(
      {
        id: props.id,
        storyId: props.storyId,
        isFirst: props.isFirst,
        isLast: props.isLast,
      },
      ctx
    ),

  Border: (props) =>
    renderBorder({
      id: props.id,
      height: props.height,
      color: props.color,
    }),

  ErrorCard: (props) =>
    renderErrorCard({
      title: props.title,
      description: props.description,
      linkText: props.linkText,
      linkUrl: props.linkUrl,
      className: props.className,
    }),

  /**
   * ========== SECTION COMPONENTS ==========
   */
  SectionGrid: (props, ctx) =>
    renderSectionGrid(
      {
        id: props.id,
        className: props.className,
      },
      ctx
    ),
  SectionBottomCard: (props, ctx) =>
    renderSectionBottomGrid(
      {
        id: props.id,
        className: props.className,
      },
      ctx
    ),
  BottomCardList: (props, ctx) =>
    renderBottomCardList(
      {
        id: props.id,
      },
      ctx
    ),
  BottomCard: (props, ctx) =>
    renderBottomCard(
      {
        id: props.id,
        storyId: props.storyId,
        imageUrl: props.imageUrl,
        title: props.title,
        description: props.description,
        date: props.date,
        readTime: props.readTime,
      },
      ctx
    ),
  BlogRecomCard: (props, ctx) =>
    renderRecommendCard(
      {
        storyId: props.storyId,
      },
      ctx
    ),

  Footer: (props) =>
    renderFooter({
      id: props.id,
      copyrightText: props.copyrightText,
    }),

  AboutUs: (props, ctx) =>
    renderAboutUs(props, ctx),
  SupportUs: (props, ctx) =>
    renderSupportUs(props, ctx),

  PrivacyPolicy: (props, ctx) =>
    renderPrivacyPolicy(props, ctx),

  MediaCouncil: (props, ctx) =>
    renderMediaCouncil(props, ctx),

  ContactUs: (props, ctx) =>
    renderContactUs(props, ctx),

  /**
   * ========== AUTHOR COMPONENTS ==========
   */
  AuthorCard: (props) =>
    renderAuthorCard({
      authorId: props.authorId,
      name: props.name,
      bio: props.bio,
      image: props.image,
    }),
  AuthorProfile: (props) =>
    renderAuthorProfile({
      authorId: props.authorId,
      name: props.name,
      bio: props.bio,
      image: props.image,
      role: props.role,
      twitter: props.twitter,
      linkedin: props.linkedin,
    }),
  AuthorsGrid: (props) =>
    renderAuthorsGrid({
      title: props.title,
    }),
  AuthorsGridManual: (props, ctx) =>
    renderAuthorsGridManual(
      {
        id: props.id,
        rowCount: props.rowCount,
        title: props.title,
      },
      ctx
    ),
  /**
   * ========== BLOG COMPONENTS ==========
   * These types are placeable inside SectionGrid/SectionBottomCard zones on
   * the Blog page (see blogComponentKeys in builderConfig.tsx). They were
   * missing entirely from this registry, so any Blog page built with
   * SectionGrid/SectionBottomCard as its layout (instead of BlogGrid) would
   * silently render nothing for these cards.
   */
  BlogGrid: (props, ctx) =>
    renderBlogGrid(props, ctx.zones ?? {}, ctx.storiesById ?? {}, ctx),

  BlogPostCard: (props, ctx) => {
    const currentStory = ctx.currentStory || null;
    let sourceStory: any = currentStory;

    if (!sourceStory || Object.keys(sourceStory).length === 0) {
      sourceStory = (
        typeof localStorage !== "undefined"
          ? JSON.parse(localStorage.getItem("currentStory") || "{}")
          : {}
      );
    }

    // Same fix as renderFunctions.ts/renderBlogPage.ts: BlogPostCard has no
    // default `storyId` prop, so resolve a stable key that always matches
    // between the map below and the sub-renderers' lookups.
    const resolvedStoryId =
      props.storyId || sourceStory?.id || sourceStory?.storyId || "__current_story__";

    const customStoriesMap: Record<string, any> = {
      [resolvedStoryId]: sourceStory,
    };

    return renderBlogPostCard(
      { ...props, storyId: resolvedStoryId },
      ctx.zones ?? {},
      customStoriesMap,
      ctx
    );
  },

  PopularBlogCard: (props, ctx) =>
    renderPopularBlogCard(props, ctx.storiesById ?? {}),

  BlogShowcaseCard: (props, ctx) =>
    renderBlogShowcaseCard(props, ctx.storiesById ?? {}),

  BlogMoreStoriesCard: (props) =>
    renderBlogMoreStoriesCard(props),
}

// A card's accent colour (picked in the editor from the Color taxonomy) becomes --chip for everything inside it.
// display: contents keeps the wrapper from changing the card's layout.
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
for (const key of Object.keys(ComponentRegistry)) {
  const render = ComponentRegistry[key]
  ComponentRegistry[key] = (props: any, ctx: any) => {
    const html = render(props, ctx)
    return HEX_COLOR.test(props?.accentColor ?? '') ? `<div style="display:contents;--chip:${props.accentColor}">${html}</div>` : html
  }
}
