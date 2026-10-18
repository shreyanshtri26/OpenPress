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

export type CampaignAdProps = {
    id?: string;
    adId?: string;
    placementName: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
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
    desktopImageUrl?: string;
    mobileImageUrl?: string;
};

export function renderCampaign(props: CampaignAdProps, ctx?: RenderContext): string {
    const placementName = props.placementName || 'dynamic-ad';

    const {
        desktopImageUrl,
        mobileImageUrl,
        thirdPartyTagDesktop,
        thirdPartyTagMobile,
        desktopDimensions,
        mobileDimensions,
        linkUrl,
        altText,
        activeCampaign,
        matchingCampaign,
        jobId,
    } = resolveAd(props, ctx, placementName, [placementName], placementName);

    const isSidebarType = matchingCampaign?.type === 'sidebar' || placementName.toLowerCase().includes('sidebar') || placementName.toLowerCase().includes('sidebar-rectangle');

    const id = props.id || `ad-${placementName.replace(/\s+/g, '-')}`;

    // Parse dimensions for CSS
    const parseDim = (dim: string) => {
        const parts = (dim || '').replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    const d = parseDim(desktopDimensions || '300*250');
    const m = parseDim(mobileDimensions || '320*50');

    const fallbackBlock = props.fallbackBlock;
    const effectiveFallbackStoryId = props.fallbackStoryId || props._autoFallbackStoryId;
    const hasFallback = props.fallbackAllowed !== false && (!!fallbackBlock || !!effectiveFallbackStoryId);
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

        // Priority 1: Automatic Grid Fallback (overrides manual Puck fallback block when ad is in auto grid)
        if (props._autoFallbackStoryId) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            return renderRecommendCard({
                storyId: props._autoFallbackStoryId,
                title: props._autoFallbackTitle,
                label: props._autoFallbackLabel,
                imageUrl: props._autoFallbackImageUrl,
            }, context);
        }

        // Priority 2: Explicit single fallback story
        if (!fallbackBlock && props.fallbackStoryId) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            return renderRecommendCard({ storyId: props.fallbackStoryId }, context);
        }
        const type = fallbackBlock.type;

        // If it's a leaderboard placement and the fallback block is a grid, do not render it in the ad slot
        const isLeaderboard = placementName.toLowerCase().includes('leaderboard');
        const isGrid = type && (type.toLowerCase().includes('grid') || type.toLowerCase() === 'sectionbottomcard');
        if (isLeaderboard && isGrid) {
            return '';
        }

        let p = { ...(fallbackBlock.props || {}) };
        const blockId = p.id || fallbackBlock.id;

        // Check if this fallback block is already rendered elsewhere
        // Specifically bypass this for leaderboard to avoid hiding the Hero Grid when ad is active
        // If the ad is active, the fallback is hidden in the ad slot, so we must NOT skip the standalone block!
        const isVisible = !activeCampaign || alwaysShow;
        if (isVisible && !placementName.toLowerCase().includes('leaderboard')) {
            if (blockId && ctx?.renderedBlockIds && ctx.renderedBlockIds.has(blockId)) {
                console.log(`Fallback block ${blockId} already rendered elsewhere, skipping in ad.`);
                return '';
            }

            // Mark this block as rendered so the main loop doesn't render it again
            if (blockId && ctx?.renderedBlockIds) {
                ctx.renderedBlockIds.add(blockId);
            }
        }

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

    const hasAdContent = Boolean(desktopImageUrl || mobileImageUrl || tagDesktop || tagMobile);
    const campaignId = activeCampaign?.campaignId || activeCampaign?.id || '';
    const placementForTracking = (placementName || 'dynamic-ad').toLowerCase();

    // Only treat the fallback as real if it actually produced HTML — a configured
    // fallbackBlock whose type the switch above doesn't recognize (or which gets
    // skipped as already-rendered elsewhere) must not leave behind an empty,
    // space-taking .fallback-container.
    const fallbackHtml = renderFallback();
    const showFallback = !!fallbackHtml;

    return `
        <div id="${id}" class="w-full flex flex-col justify-center items-center py-6 bg-transparent ad-block-container ad-block-wrapper" data-ad-block="${placementName}" data-ad-props='${JSON.stringify(props).replace(/'/g, "&apos;")}' data-ad-type="dynamic">
            <style>
                #${id}.ad-block-container, #${id}.ad-block-wrapper {
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
                #${id} .fallback-container {
                    display: ${(!activeCampaign || alwaysShow) && showFallback ? 'block' : 'none'};
                    width: 100%;
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
                    <a href="${linkUrl || '#'}" target="_blank" rel="noopener noreferrer" class="block w-full h-full hover:opacity-95 transition-opacity ad-link" onclick="
                        if(typeof cwr === 'function') { cwr('recordEvent', { type: 'ad_click', data: { campaignId: '${campaignId}' } }); }
                        var api = window.__openPress_API__ || '';
                        if(api) {
                            fetch(api + '/campaigns/trackEvent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    campaignId: '${campaignId}',
                                    jobId: '${jobId || ''}',
                                    eventType: 'click',
                                    placement: '${placementForTracking}',
                                    pageUrl: window.location.href,
                                    referrer: document.referrer
                                })
                            }).catch(function(e) { console.warn('Failed to track ad click', e); });
                        }
                    ">
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

            ${showFallback ? `
                <div class="fallback-container">
                    ${fallbackHtml}
                </div>
            ` : ''}

            ${activeCampaign ? `
                <script>
                    (function() {
                        var api = window.__openPress_API__ || '';
                        if (!api) return;
                        // Lets the page ad script skip its duplicate impression.
                        var el = document.getElementById('${id}');
                        if (el) el.setAttribute('data-impression-campaign', '${campaignId}');
                        fetch(api + '/campaigns/trackEvent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                campaignId: '${campaignId}',
                                jobId: '${jobId || ''}',
                                eventType: 'impression',
                                placement: '${placementForTracking}',
                                pageUrl: window.location.href,
                                referrer: document.referrer
                            })
                        }).catch(function(e) { console.warn('Failed to track ad impression', e); });
                    })();
                </script>
            ` : ''}
        </div>
    `;
}
