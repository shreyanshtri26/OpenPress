import type { RenderContext } from '../core/renderTypes';
import { resolveAd } from '../core/adResolver';
import { renderRecommendCard } from './renderRecommendCard';
import { renderStoryCard } from './renderStoryCard';
import { renderMultimediaCard } from './renderMultimediaCard';
import { renderMainCard } from './renderMainCard';
import { renderSidebarStoryCard } from './renderSidebarStoryCard';
import { renderStorySubCard } from './renderStorySubCard';
import { renderShowcaseCard } from './renderShowcaseCard';
import { renderMostPopularCard } from './renderMostPopularCard';
import { renderHeading } from './renderHeading';
import { renderFeaturedCard } from './renderFeaturedCard';
import { renderBottomCard } from './renderBottomCard';
import { renderAuthorCard } from './renderAuthorCard';
import { renderErrorCard } from './renderErrorCard';
import { getDonorAdSuppressionScript } from './donorAdSuppressionScript';

export type LeaderboardAdProps = {
    id?: string;
    adId?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    altText?: string;
    fallbackBlock?: any;
    fallbackStoryId?: string;
    fallbackAllowed?: boolean;
    _autoFallbackStoryId?: string;
    _autoFallbackTitle?: string;
    _autoFallbackLabel?: string;
    _autoFallbackImageUrl?: string;
    _autoFallbackPublishUrl?: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
};

export function renderLeaderboardAd(props: LeaderboardAdProps, ctx?: RenderContext): string {
    const {
        desktopImageUrl,
        mobileImageUrl,
        linkUrl,
        altText,
        desktopDimensions: resolvedDesktopDim,
        mobileDimensions: resolvedMobileDim,
        thirdPartyTagDesktop,
        thirdPartyTagMobile
    } = resolveAd(props, ctx, 'leaderboard-ad', ['leaderboard']);

    const id = props.id || 'leaderboard-ad';

    const parseDim = (dim: string) => {
        const parts = (dim || '').replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    const d = parseDim(resolvedDesktopDim || props.desktopDimensions || '');
    const m = parseDim(resolvedMobileDim || props.mobileDimensions || '');

    const finalDw = d.w || 728;
    const finalDh = d.h || 90;
    const finalMw = m.w || 320;
    const finalMh = m.h || 50;

    const hasAdContent = Boolean(desktopImageUrl || mobileImageUrl || thirdPartyTagDesktop || thirdPartyTagMobile);

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

    const hasFallback = props.fallbackAllowed !== false && (!!props.fallbackBlock || !!props._autoFallbackStoryId || !!props.fallbackStoryId);

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
        if (!props.fallbackBlock && props.fallbackStoryId) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            return renderRecommendCard({ storyId: props.fallbackStoryId }, context);
        }
        if (!props.fallbackBlock) return '';
        const type = props.fallbackBlock.type;
        const p = props.fallbackStoryId ? { ...(props.fallbackBlock.props || {}), storyId: props.fallbackStoryId } : (props.fallbackBlock.props || {});
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
        <div id="${id}" class="w-full flex justify-center items-center pt-2 pb-4 bg-transparent ad-block-wrapper" data-ad-block="Leaderboard" data-ad-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'>
            <style>
                #${id} {
                    padding: ${(hasAdContent || showFallback) ? '0.5rem 0 1rem 0' : '0'};
                }
                #${id} .ad-container {
                    display: ${hasAdContent ? 'flex' : 'none'};
                    width: 100%;
                    align-items: center;
                    flex-direction: column;
                }
                #${id} .fallback-container {
                    display: ${!hasAdContent && showFallback ? 'block' : 'none'};
                    width: 100%;
                }
                #${id} .ad-link {
                    width: 100%;
                    max-width: ${finalDw}px;
                }
                #${id} .ad-desktop-img {
                    width: 100%;
                    height: auto;
                    ${hasTag ? `aspect-ratio: ${finalDw} / ${finalDh};` : ''}
                }
                @media (max-width: 768px) {
                    #${id} .ad-link {
                        max-width: ${finalMw}px;
                    }
                    #${id} .ad-desktop-img {
                        ${hasTag ? `aspect-ratio: ${finalMw} / ${finalMh};` : ''}
                    }
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
            <div class="w-full px-4 md:px-8 xl:px-0 flex flex-col items-center ad-container">
                <span class="text-[10px] uppercase font-bold text-gray-400 tracking-[0.1em] mb-2 self-start md:self-center">
                    Advertisement
                </span>
                ${hasTag ? `
                    <div class="ad-iframe-wrapper w-full" style="position:relative; max-width:${finalDw}px; aspect-ratio:${finalDw}/${finalDh};">
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
                    <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" class="block w-full mx-auto ad-link">
                        <picture class="ad-picture">
                            ${mobileImageUrl ? `<source media="(max-width: 768px)" srcset="${mobileImageUrl}" class="ad-mobile-source" />` : ''}
                            <img
                                src="${desktopImageUrl || ''}"
                                alt="${altText}"
                                width="${finalDw}"
                                height="${finalDh}"
                                class="w-full h-auto object-contain ad-desktop-img"
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
