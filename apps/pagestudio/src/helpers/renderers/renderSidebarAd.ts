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

export type SidebarAdProps = {
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

export function renderSidebarAd(props: SidebarAdProps, ctx?: RenderContext): string {
    const {
        desktopImageUrl,
        mobileImageUrl,
        linkUrl,
        altText
    } = resolveAd(props, ctx, 'sidebar-ad', ['sidebar']);

    const id = props.id || 'sidebar-ad';
    const hasAdContent = Boolean(desktopImageUrl || mobileImageUrl);
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
        let p = { ...(props.fallbackBlock.props || {}) };
        
        if (props.fallbackStoryId) {
            p.storyId = props.fallbackStoryId;
            // Clear manual cache fields so renderer pulls the fresh story details
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
        <div id="${id}" class="w-full flex justify-center items-center py-4 bg-transparent ad-block-wrapper" data-ad-block="Sidebar" data-ad-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'>
            <style>
                #${id} .ad-container {
                    display: ${hasAdContent ? 'flex' : 'none'};
                }
                #${id} .fallback-container {
                    display: ${!hasAdContent && showFallback ? 'block' : 'none'};
                    width: 100%;
                }
            </style>
            <div class="w-full max-w-[300px] flex flex-col items-center ad-container">
                <span class="text-[10px] uppercase font-bold text-gray-400 tracking-[0.1em] mb-2 self-start">
                    Advertisement
                </span>
                <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" class="block w-full border border-gray-100 ad-link">
                    <picture class="ad-picture">
                        ${mobileImageUrl ? `<source media="(max-width: 768px)" srcset="${mobileImageUrl}" class="ad-mobile-source" />` : ''}
                        <img
                            src="${desktopImageUrl || ''}"
                            alt="${altText}"
                            class="w-full h-auto object-contain ad-desktop-img"
                            style="aspect-ratio: 300 / 250;"
                            loading="lazy"
                        />
                    </picture>
                </a>
            </div>
            ${showFallback ? `<div class="fallback-container">${fallbackHtml}</div>` : ''}
        </div>
        ${getDonorAdSuppressionScript()}
    `;
}
