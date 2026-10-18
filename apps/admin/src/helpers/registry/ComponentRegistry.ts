import type { RenderContext } from '../core/renderTypes'

// Import home-page renderers
import {
    renderAccountCard,
    renderAuthorCard,
    renderAuthorsGrid,
    renderErrorCard,
    renderLoginForm,
    renderMediaCouncil,
    renderPrivacyPolicy
} from '../renderers/extraRenderers'
import { renderAboutUs } from '../renderers/renderAboutUs'
import { renderAdCard } from '../renderers/renderAdCard'
import { renderAdvertisementGrid } from '../renderers/renderAdvertisementGrid'
import { renderAllStoriesGrid } from '../renderers/renderAllStoriesGrid'
import { renderMastheadNavbar } from '../renderers/renderMastheadNavbar'
import { renderAuthorProfile } from '../renderers/renderAuthorProfile'
import { renderBlogMoreStoriesCard } from '../renderers/renderBlogMoreStoriesCard'
import { renderBorder } from '../renderers/renderBorder'
import { renderCampaign } from '../renderers/renderCampaign'
import { renderFeaturedCard } from '../renderers/renderFeaturedCard'
import { renderFooter } from '../renderers/renderFooter'
import { renderHeading } from '../renderers/renderHeading'
import { renderHeroGrid } from '../renderers/renderHeroGrid'
import { renderHoverCard } from '../renderers/renderHoverCard'
import { renderMainCard } from '../renderers/renderMainCard'
import { renderMostPopularCard } from '../renderers/renderMostPopularCard'
import { renderMultimediaCard } from '../renderers/renderMultimediaCard'
import { renderMultimediaGrid } from '../renderers/renderMultimediaGrid'
import { renderPopularGrid } from '../renderers/renderPopularGrid'
import { renderRecommendCard } from '../renderers/renderRecommendCard'
import { renderSectionBottomGrid } from '../renderers/renderSectionBottomGrid'
import { renderSectionGrid } from '../renderers/renderSectionGrid'
import { renderShowcaseCard } from '../renderers/renderShowcaseCard'
import { renderSidebarStoryCard } from '../renderers/renderSidebarStoryCard'
import { renderSpotlightAd } from '../renderers/renderSpotlightAd'
import { renderStoryCard } from '../renderers/renderStoryCard'
import { renderStorySubCard } from '../renderers/renderStorySubCard'
import { renderThumbnailGrid } from '../renderers/renderThumbnailGrid'

/**
 * ComponentRegistry
 *
 * Maps Puck block `type` -> HTML renderer function
 * Only home-page components are included.
 */
export const ComponentRegistry: Record<
  string,
  (props: any, ctx: RenderContext) => string
> = {
  // ========== NAVIGATION ==========
  AtlanticNavbar: (props, ctx) =>
    renderMastheadNavbar({
      id: props.id,
      sections: ctx.sections ?? [],
      activeSection: ctx.activeSection ?? 'HOME',
      showBanner: props.showBanner ?? false,
      showSignIn: props.showSignIn ?? false,
      showSupportUs: resolveToggle(props, ['showSupportUs', 'supportUsVisible', 'showSupportButton', 'showSubscribeButton'], ['hideSupportUs', 'supportUsHidden', 'hideSupportButton', 'hideSubscribeButton'], false),
      showBecomeMember: props.showBecomeMember ?? true,
      showFacebook: resolveToggle(props, ['showFacebookIcon', 'showFacebook', 'facebookVisible'], ['hideFacebookIcon', 'hideFacebook', 'facebookHidden'], true),
      showLinkedIn: resolveToggle(props, ['showLinkedInIcon', 'showLinkedinIcon', 'showLinkedIn', 'showLinkedin', 'linkedInVisible', 'linkedinVisible'], ['hideLinkedInIcon', 'hideLinkedinIcon', 'hideLinkedIn', 'hideLinkedin', 'linkedInHidden', 'linkedinHidden'], true),
      storiesById: ctx.storiesById,
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
    }),

  // ========== GRIDS / CONTAINERS ==========
  AdvertisementGrid: (props, ctx) =>
    renderAdvertisementGrid(
      { id: props.id, heading: props.heading, infoLabel: props.infoLabel, brandName: props.brandName },
      ctx
    ),

  ThumbnailGrid: (props, ctx) =>
    renderThumbnailGrid(props, ctx),

  HeroGrid: (props, ctx) =>
    renderHeroGrid(props, ctx),

  PopularGrid: (props, ctx) =>
    renderPopularGrid(props, ctx),

  MultimediaGrid: (props, ctx) =>
    renderMultimediaGrid(props, ctx),

  AllStoriesGrid: (props, ctx) =>
    renderAllStoriesGrid(props, ctx),

  Heading: (props, ctx) =>
    renderHeading({ id: props.id, text: props.text, align: props.align, level: props.level, size: props.size }, ctx),

  // ========== CARD COMPONENTS ==========
  AdCard: (props) =>
    renderAdCard({ product: props.product }),

  InStoryAd: (props, ctx) =>
    renderCampaign({
      id: props.id,
      adId: props.adId,
      placementName: 'in-story',
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
    renderCampaign({
      id: props.id,
      adId: props.adId,
      placementName: 'leaderboard',
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
    renderCampaign({
      id: props.id,
      adId: props.adId,
      placementName: 'sidebar',
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
      fallbackStoryId: props.fallbackStoryId,
      fallbackAllowed: props.fallbackAllowed,
      _autoFallbackStoryId: props._autoFallbackStoryId,
      _autoFallbackTitle: props._autoFallbackTitle,
      _autoFallbackLabel: props._autoFallbackLabel,
      _autoFallbackImageUrl: props._autoFallbackImageUrl,
      _autoFallbackPublishUrl: props._autoFallbackPublishUrl,
    }, ctx),

  ShowcaseCard: (props, ctx) =>
    renderShowcaseCard({ items: props.items, noBorder: props.noBorder }, ctx),

  HoverCard: (props, ctx) =>
    renderHoverCard({ items: props.items, noBorder: props.noBorder }, ctx),

  StoryCard: (props, ctx) =>
    renderStoryCard(
      { id: props.id, storyId: props.storyId, imageUrl: props.imageUrl, label: props.label, title: props.title, description: props.description },
      ctx
    ),

  MultimediaCard: (props, ctx) =>
    renderMultimediaCard(
      { id: props.id, storyId: props.storyId, imageUrl: props.imageUrl, title: props.title, description: props.description, author: props.author, duration: props.duration },
      ctx
    ),

  MainCard: (props, ctx) =>
    renderMainCard(
      { storyId: props.storyId, imageUrl: props.imageUrl, label: props.label, title: props.title, description: props.description },
      ctx
    ),

  RecommendCard: (props, ctx) =>
    renderRecommendCard(
      { storyId: props.storyId, title: props.title, label: props.label, imageUrl: props.imageUrl, imageAlt: props.imageAlt, className: props.className },
      ctx
    ),

  MostPopularTable: (props, ctx) =>
    renderMostPopularCard({ id: props.id, items: props.items }, ctx),

  StorySubCard: (props, ctx) =>
    renderStorySubCard({ id: props.id, storyId: props.storyId }, ctx),

  FeaturedCard: (props, ctx) =>
    renderFeaturedCard({ items: props.items }, ctx),

  SidebarStoryCard: (props, ctx) =>
    renderSidebarStoryCard(
      { id: props.id, storyId: props.storyId, isFirst: props.isFirst, isLast: props.isLast },
      ctx
    ),

  Border: (props) =>
    renderBorder({ id: props.id, height: props.height, color: props.color }),

  BlogRecomCard: (props, ctx) =>
    renderRecommendCard({ storyId: props.storyId }, ctx),

  Footer: (props) =>
    renderFooter({ id: props.id, copyrightText: props.copyrightText }),

  SectionGrid: (props, ctx) =>
    renderSectionGrid({ id: props.id, className: props.className }, ctx),

  SectionBottomCard: (props, ctx) =>
    renderSectionBottomGrid({ id: props.id, className: props.className }, ctx),

  AboutUs: (props, ctx) =>
    renderAboutUs(props, ctx),

  AuthorProfile: (props, ctx) =>
    renderAuthorProfile(props, ctx),

  AuthorCard: (props, ctx) =>
    renderAuthorCard(props, ctx),

  AuthorsGrid: (props, ctx) =>
    renderAuthorsGrid(props, ctx),

  AuthorsGridManual: (props, ctx) =>
    renderAuthorsGrid(props, ctx), // Use same for manual for now

  PrivacyPolicy: (props, ctx) =>
    renderPrivacyPolicy(props, ctx),

  MediaCouncil: (props, ctx) =>
    renderMediaCouncil(props, ctx),

  LoginForm: (props, ctx) =>
    renderLoginForm(props, ctx),

  AccountCard: (props, ctx) =>
    renderAccountCard(props, ctx),

  ErrorCard: (props, ctx) =>
    renderErrorCard(props, ctx),

  BlogMoreStoriesCard: (props) =>
    renderBlogMoreStoriesCard({ id: props.id, headingColor: props.headingColor, stories: props.stories }),

}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'show', 'visible'].includes(normalized)) return true;
    if (['false', '0', 'no', 'hide', 'hidden'].includes(normalized)) return false;
  }
  return undefined;
}

function resolveToggle(
  props: Record<string, any>,
  showKeys: string[] = [],
  hideKeys: string[] = [],
  defaultValue = true
): boolean {
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
