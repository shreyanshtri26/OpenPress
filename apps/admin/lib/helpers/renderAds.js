import { resolveAd } from '../../src/helpers/core/adResolver';

export function renderCampaignAd(props, ctx) {
    const placementName = props.placementName || 'dynamic-ad';

    // Delegate matching/creative-resolution to the single shared resolver
    // (also used by the static LeaderboardAd/InStoryAd/SidebarAd blocks and
    // by OpenPress-Page Studio) instead of duplicating campaign-matching
    // logic here, so the two apps can no longer drift apart on this.
    const {
        activeCampaign,
        placement,
        desktopImageUrl,
        mobileImageUrl,
        thirdPartyTagDesktop,
        thirdPartyTagMobile,
        desktopDimensions,
        mobileDimensions,
        linkUrl,
        altText,
    } = resolveAd(props, ctx, placementName, [placementName], placementName);

    const activeJob = activeCampaign?.jobs?.find(j => (j.placement || '').toLowerCase() === (placement || '').toLowerCase());

    const id = props.id || `ad-${placementName.replace(/\s+/g, '-')}`;

    const parseDim = (dim) => {
        const parts = (dim || '300*250').replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    const d = parseDim(desktopDimensions || '300*250');
    const m = parseDim(mobileDimensions || '320*50');

    const cleanTag = (tag) => {
        if (!tag) return '';
        return tag
            .replace(/\u00A0/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/{{LANDING_PAGE_URL}}/gi, linkUrl || '#');
    };

    const tagDesktop = cleanTag(thirdPartyTagDesktop);
    const tagMobile = cleanTag(thirdPartyTagMobile);

    // Show the ad slot whenever it actually has content to show \u2014 a
    // creative/tag resolved from literal props still counts, even when no
    // live campaign object matched it. Previously this required
    // `activeCampaign` to be truthy, which hid perfectly valid ads (like the
    // navbar-adjacent leaderboard synced in from Page Studio) whenever they
    // weren't backed by a currently-matching campaign record.
    const hasAdContent = Boolean(desktopImageUrl || mobileImageUrl || tagDesktop || tagMobile);
    const active = hasAdContent;

    // --- FALLBACK LOGIC ---
    const fallbackBlock = props.fallbackBlock;
    const hasFallback = props.fallbackAllowed !== false && (!!fallbackBlock || !!props.fallbackStoryId || !!props._autoFallbackStoryId);
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

    // Render a single fallback story via whatever RecommendCard renderer is
    // available in this execution scope (mirrors the RecommendCard case below).
    const renderFallbackStory = (storyId, context, extra) => {
        if (context.extraRenderers && context.extraRenderers['RecommendCard']) {
            return context.extraRenderers['RecommendCard']({ storyId, ...(extra || {}) }, context);
        }
        return typeof renderBlogRecomCard !== 'undefined' ? renderBlogRecomCard({ storyId, ...(extra || {}) }, context.storiesById) : '';
    };

    const renderFallback = () => {
        if (!hasFallback) return '';
        const context = ctx || { zones: {}, storiesById: {} };

        // Priority 1: Automatic Grid Fallback (overrides manual Puck fallback block when ad is in auto grid)
        if (props._autoFallbackStoryId) {
            return renderFallbackStory(props._autoFallbackStoryId, context, {
                title: props._autoFallbackTitle,
                label: props._autoFallbackLabel,
                imageUrl: props._autoFallbackImageUrl,
            });
        }

        // Priority 2: Explicit single fallback story (no fallbackBlock configured)
        if (!fallbackBlock && props.fallbackStoryId) {
            return renderFallbackStory(props.fallbackStoryId, context);
        }

        if (!fallbackBlock) return '';
        const type = fallbackBlock.type;

        // If it's a leaderboard placement and the fallback block is a grid, do not render it in the ad slot
        const isLeaderboard = placementName.toLowerCase().includes('leaderboard');
        const isGrid = type && (type.toLowerCase().includes('grid') || type.toLowerCase() === 'sectionbottomcard');
        if (isLeaderboard && isGrid) {
            return '';
        }

        let p = { ...(fallbackBlock.props || {}) };
        const blockId = p.id || fallbackBlock.id;

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

        // Check if this fallback block is already rendered elsewhere
        // Specifically bypass this for leaderboard to avoid hiding the Hero Grid or Blog Grid when ad is active
        // If the ad is active, the fallback is hidden in the ad slot, so we must NOT skip the standalone block!
        const isVisible = !active || alwaysShow;
        if (isVisible && !placementName.toLowerCase().includes('leaderboard')) {
            if (blockId && context.renderedBlockIds && context.renderedBlockIds.has(blockId)) {
                return "";
            }

            // Mark this block as rendered so the main loop doesn't render it again
            if (blockId && context.renderedBlockIds) {
                context.renderedBlockIds.add(blockId);
            }
        }

        const blockHtml = (() => {
            // Attempt to render via ComponentRegistry (extraRenderers)
            if (context.extraRenderers && context.extraRenderers[type]) {
                return context.extraRenderers[type](p, context);
            }

            // Fallback for common types if registry fails
            switch (type) {
                case 'StoryCard': return typeof renderBlogPostCard !== 'undefined' ? renderBlogPostCard(p, context.zones, context.storiesById, context) : '';
                case 'RecommendCard': return typeof renderBlogRecomCard !== 'undefined' ? renderBlogRecomCard(p, context.storiesById) : '';
                default: return '';
            }
        })();

        // A stale/unsupported fallbackBlock (e.g. a zone-container type like
        // SectionGrid that can't render from a cloned props snapshot) must not
        // silently win over an explicitly selected fallback story.
        if (blockHtml) return blockHtml;
        if (props.fallbackStoryId) {
            return renderFallbackStory(props.fallbackStoryId, context);
        }
        return '';
    };

    // Only treat the fallback as real if it actually produced HTML — a configured
    // fallbackBlock whose type can't be rendered must not leave behind an empty,
    // space-taking .fallback-container.
    const fallbackHtml = renderFallback();
    const showFallback = !!fallbackHtml;

    return `
        <div id="${id}" class="w-full flex flex-col justify-center items-center py-6 bg-transparent ad-block-container ad-block-wrapper" data-ad-block="${placementName}" data-ad-props='${JSON.stringify(props).replace(/'/g, "&apos;")}' data-ad-type="dynamic">
            <style>
                #${id}.ad-block-container, #${id}.ad-block-wrapper {
                    flex-direction: column;
                    padding: ${(active || showFallback) ? (placementName === 'leaderboard' ? '0.5rem 0 1.5rem 0' : '1.5rem 0') : '0'};
                }
                #${id} .ad-container {
                    width: 100%;
                    max-width: ${m.w}px;
                    aspect-ratio: ${m.w} / ${m.h};
                    display: ${active ? 'flex' : 'none'};
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                #${id} .fallback-container {
                    display: ${(!active || alwaysShow) && showFallback ? 'block' : 'none'};
                    width: 100%;
                }
                #${id} .ad-desktop-img {
                    width: 100%;
                    height: 100%;
                }
                @media (min-width: 769px) {
                    #${id} .ad-container {
                        max-width: ${d.w}px;
                        aspect-ratio: ${d.w} / ${d.h};
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
                        if(typeof cwr === 'function') { cwr('recordEvent', { type: 'ad_click', data: { campaignId: '${activeCampaign?.campaignId || activeCampaign?.id || ''}' } }); }
                        var api = window.__openPress_API__ || '';
                        if(api) {
                            fetch(api + '/campaigns/trackEvent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    campaignId: '${activeCampaign?.campaignId || activeCampaign?.id || ''}',
                                    jobId: '${activeJob?.id || activeJob?.jobId || ''}',
                                    eventType: 'click',
                                    placement: '${placementName}',
                                    pageUrl: window.location.href,
                                    referrer: document.referrer
                                })
                            }).catch(function(e) { console.warn('Failed to track click', e); });
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

            ${active ? `
                <script>
                    (function() {
                        var api = window.__openPress_API__ || '';
                        if (!api) return;
                        // Lets the client ad script skip its duplicate impression.
                        var el = document.getElementById('${id}');
                        if (el) el.setAttribute('data-impression-campaign', '${activeCampaign?.campaignId || activeCampaign?.id || ''}');
                        fetch(api + '/campaigns/trackEvent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                campaignId: '${activeCampaign?.campaignId || activeCampaign?.id || ''}',
                                jobId: '${activeJob?.id || activeJob?.jobId || ''}',
                                eventType: 'impression',
                                placement: '${placementName}',
                                pageUrl: window.location.href,
                                referrer: document.referrer
                            })
                        }).catch(function(e) { console.warn('Failed to track ad impression', e); });
                    })();
                </script>
            ` : ''}

            ${showFallback ? `
                <div class="fallback-container">
                    ${fallbackHtml}
                </div>
            ` : ''}
        </div>
    `;
}
