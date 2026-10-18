import type { RenderContext } from "../core/renderTypes";
import { resolveAd } from "../core/adResolver";
import { renderRecommendCard } from "./renderRecommendCard";
import { renderStoryCard } from "./renderStoryCard";
import { renderMultimediaCard } from "./renderMultimediaCard";
import { renderMainCard } from "./renderMainCard";
import { renderStorySubCard } from "./renderStorySubCard";
import { renderSidebarStoryCard } from "./renderSidebarStoryCard";
import { renderShowcaseCard } from "./renderShowcaseCard";
import { renderHoverCard } from "./renderHoverCard";
import { renderMostPopularCard } from "./renderMostPopularCard";
import { renderHeading } from "./renderHeading";
import { renderFeaturedCard } from "./renderFeaturedCard";
import { renderBottomCard } from "./renderBottomCard";
import { renderAuthorCard } from "./renderAuthorCard";
import { renderErrorCard } from "./renderErrorCard";
import { getDonorAdSuppressionScript } from './donorAdSuppressionScript';

export type DynamicAdProps = {
    id?: string;
    adId?: string;
    placementName: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
    fallbackBlock?: any;
    fallbackStoryId?: string;
    fallbackAllowed?: boolean;
    _autoFallbackStoryId?: string;
    _autoFallbackTitle?: string;
    _autoFallbackLabel?: string;
    _autoFallbackImageUrl?: string;
    _autoFallbackPublishUrl?: string;
};

export function renderDynamicAd(props: DynamicAdProps, ctx?: RenderContext): string {
    const placementName = props.placementName || 'dynamic-ad';

    const {
        desktopImageUrl,
        mobileImageUrl,
        thirdPartyTagDesktop,
        thirdPartyTagMobile,
        linkUrl,
        altText,
        desktopDimensions: resolvedDesktopDim,
        mobileDimensions: resolvedMobileDim
    } = resolveAd(props, ctx, placementName, [], placementName);

    const id = props.id || `ad-${placementName.replace(/\s+/g, '-')}`;

    // Parse dimensions for CSS
    const parseDim = (dim: string) => {
        const parts = (dim || '').replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    const d = parseDim(resolvedDesktopDim || props.desktopDimensions || '300*250');
    const m = parseDim(resolvedMobileDim || props.mobileDimensions || '320*50');

    const fallbackBlock = props.fallbackBlock;
    const hasFallback = props.fallbackAllowed !== false && (!!fallbackBlock || !!props._autoFallbackStoryId || !!props.fallbackStoryId);
    const hasAdContent = Boolean(desktopImageUrl || mobileImageUrl || thirdPartyTagDesktop || thirdPartyTagMobile);
    const alwaysShow = hasFallback && fallbackBlock && [
        'BlogGrid',
        'BlogPostCard',
        'BlogBodyCard',
        'BlogMainTitle',
        'BlogTitle',
        'BlogHeading',
        'BlogSubHeading',
        'SectionGrid',
        'SectionBottomCard'
    ].includes(fallbackBlock.type);

    const cleanTag = (tag: string) => {
        if (!tag) return '';
        return tag
            .replace(/\u00A0/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/{{LANDING_PAGE_URL}}/gi, linkUrl || '#');
    };

    const tagDesktop = cleanTag(thirdPartyTagDesktop);
    const tagMobile = cleanTag(thirdPartyTagMobile);
    const hasTag = !!(tagDesktop || tagMobile);

    const renderFallback = () => {
        if (!hasFallback) return '';
        if (props._autoFallbackStoryId) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            return renderRecommendCard({
                storyId: props._autoFallbackStoryId,
                title: props._autoFallbackTitle,
                label: props._autoFallbackLabel,
                imageUrl: props._autoFallbackImageUrl,
            }, context);
        }
        if (!fallbackBlock && props.fallbackStoryId) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            return renderRecommendCard({ storyId: props.fallbackStoryId }, context);
        }
        if (!fallbackBlock) return '';
        const type = fallbackBlock.type;
        let p = { ...(fallbackBlock.props || {}) };
        if (props.fallbackStoryId) {
            p.storyId = props.fallbackStoryId;
            // Clear content props to force re-fetch from storiesById using the new storyId
            delete p.title;
            delete p.description;
            delete p.imageUrl;
            delete p.label;
            delete p.image;
            delete p.headline;
            delete p.summary;
        }

        const context = ctx ?? { zones: {}, storiesById: {} };

        const blockHtml = (() => {
            switch (type) {
                case 'StoryCard': return renderStoryCard(p, context);
                case 'RecommendCard': return renderRecommendCard(p, context);
                case 'MultimediaCard': return renderMultimediaCard(p, context);
                case 'MainCard': return renderMainCard(p, context);
                case 'SidebarStoryCard': return renderSidebarStoryCard({ ...p, isFirst: false, isLast: false }, context);
                case 'StorySubCard': return renderStorySubCard(p, context);
                case 'ShowcaseCard': return renderShowcaseCard(p, context);
                case 'HoverCard': return renderHoverCard(p, context);
                case 'MostPopularTable': return renderMostPopularCard(p, context);
                case 'Heading': return renderHeading(p);
                case 'FeaturedCard': return renderFeaturedCard(p, context);
                case 'BottomCard': return renderBottomCard(p, context);
                case 'AuthorCard': return renderAuthorCard(p);
                case 'ErrorCard': return renderErrorCard(p);
                default: {
                    if (context.extraRenderers && context.extraRenderers[type]) {
                        return context.extraRenderers[type](p, context);
                    }
                    return '';
                }
            }
        })();

        // A stale/unsupported fallbackBlock (e.g. a zone-container type like
        // SectionGrid that can't render from a cloned props snapshot) must not
        // silently win over an explicitly selected fallback story.
        if (blockHtml) return blockHtml;
        if (props.fallbackStoryId) {
            return renderRecommendCard({ storyId: props.fallbackStoryId }, context);
        }
        return '';
    };

    // Only treat the fallback as real if it actually produced HTML — an
    // unrecognized fallbackBlock type must not leave behind an empty,
    // space-taking .fallback-container.
    const fallbackHtml = renderFallback();
    const showFallback = !!fallbackHtml;

    return `
        <div id="${id}" class="w-full flex flex-col justify-center items-center py-6 bg-transparent ad-block-wrapper ad-block-container" data-ad-block="${placementName}" data-ad-props='${JSON.stringify(props).replace(/'/g, "&apos;")}' data-ad-type="dynamic">
            <style>
                #${id}.ad-block-wrapper, #${id}.ad-block-container {
                    flex-direction: column;
                    padding: ${(hasAdContent || showFallback) ? (placementName === 'leaderboard' ? '0.5rem 0 1.5rem 0' : '1.5rem 0') : '0'};
                }
                #${id} .ad-container {
                    width: 100%;
                    max-width: ${m.w}px;
                    ${hasTag ? `aspect-ratio: ${m.w} / ${m.h};` : 'height: auto;'}
                    display: ${hasAdContent ? 'flex' : 'none'};
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                #${id} .ad-desktop-img {
                    width: 100%;
                    height: auto;
                }
                @media (min-width: 769px) {
                    #${id} .ad-container {
                        max-width: ${d.w}px;
                        ${hasTag ? `aspect-ratio: ${d.w} / ${d.h};` : 'height: auto;'}
                    }
                }
                #${id} .fallback-container {
                    display: ${(!hasAdContent || alwaysShow) && showFallback ? 'block' : 'none'};
                    width: 100%;
                }
                #${id} .ad-iframe-wrapper {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                #${id} .ad-iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                #${id} .ad-desktop-tag { display: block; }
                #${id} .ad-mobile-tag { display: none; }
                @media (max-width: 768px) {
                    #${id} .ad-desktop-tag { display: none; }
                    #${id} .ad-mobile-tag { display: block; }
                }
            </style>
            <div class="ad-container">
                ${(tagDesktop || tagMobile) ? `
                    <div class="ad-iframe-wrapper">
                        ${tagDesktop ? `
                            <iframe
                                class="ad-iframe ad-desktop-tag"
                                title="Ad Desktop Tag"
                                srcDoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagDesktop.replace(/"/g, '&quot;')}"
                                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                            ></iframe>
                        ` : ''}
                        ${tagMobile ? `
                            <iframe
                                class="ad-iframe ad-mobile-tag"
                                title="Ad Mobile Tag"
                                srcDoc="<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagMobile.replace(/"/g, '&quot;')}"
                                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                            ></iframe>
                        ` : ''}
                    </div>
                ` : `
                    <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" class="block w-full h-full hover:opacity-95 transition-opacity ad-link">
                        <picture class="w-full h-full ad-picture">
                            ${mobileImageUrl ? `<source media="(max-width: 768px)" srcset="${mobileImageUrl}" class="ad-mobile-source" />` : '<source media="(max-width: 768px)" srcset="" class="ad-mobile-source" />'}
                            <img
                                src="${desktopImageUrl || ''}"
                                alt="${altText || ''}"
                                class="w-full h-full object-contain ad-desktop-img"
                                style="object-fit: contain;"
                                loading="lazy"
                            />
                        </picture>
                    </a>
                `}
            </div>
            ${showFallback ? `<div class="fallback-container">${fallbackHtml}</div>` : ''}
        </div>
        ${getDonorAdSuppressionScript()}
    `;
}
