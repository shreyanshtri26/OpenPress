import type { RenderContext } from '../core/renderTypes';
import { renderRecommendCard } from './renderRecommendCard';

export type SpotlightAdRenderProps = {
    id?: string;
    adId?: string;
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
};

/* ─── Campaign Resolution ─────────────────────────────────────── */
function resolveSpotlightCampaign(
    props: SpotlightAdRenderProps,
    ctx?: RenderContext
): { images: string[]; linkUrl: string; altText: string; campaign: any; job: any; _debug: string } | null {

    const campaigns = ctx?.campaigns || [];
    const now = new Date();

    // Backend stores status via CreateCampaignView: (status).toLowerCase().replace(' ','_')
    // So possible values: 'start_now', 'run_now', 'active', 'running', 'scheduled', 'draft', 'paused'
    // We accept everything EXCEPT explicitly inactive ones.
    const INACTIVE = new Set(['paused', 'pause', 'draft', 'stopped', 'ended', 'cancelled', 'canceled']);

    const isActive = (c: any): boolean => {
        const st = (c.status || '').toLowerCase().replace(/[\s_-]+/g, '_');
        if (INACTIVE.has(st)) return false;
        const s = c.startDate || c.startTime;
        const e = c.endDate   || c.endTime;
        if (s && new Date(s) > now) return false;
        if (e && new Date(e) < now) return false;
        return true;
    };

    const toImgArr = (raw: any): string[] =>
        Array.isArray(raw)
            ? raw.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
            : [];

    // FIX: || on arrays is broken because [] is truthy — use find() instead
    const firstNonEmpty = (...arrs: string[][]): string[] =>
        arrs.find(a => a.length > 0) ?? [];

    const extractSpotlight = (camp: any): { images: string[]; linkUrl: string; altText: string; campaign: any; job: any } | null => {
        for (const job of (camp.jobs || [])) {
            const fmt = (job.adFormat || job.ad_format || '').toLowerCase().replace(/[\s_-]+/g, '');
            if (fmt !== 'spotlight') continue;
            // Each job is only live inside its own window, not the campaign's.
            if (job.startTime && new Date(job.startTime) > now) continue;
            if (job.endTime && new Date(job.endTime) < now) continue;

            // Check every field the backend might store images in
            const imgs = firstNonEmpty(
                toImgArr(job.spotlightMobileImages),
                toImgArr(job.spotlight_mobile_images),
                toImgArr(job.creatives?.spotlightMobileImages),
                toImgArr(job.creatives?.spotlight_mobile_images),
            );

            if (imgs.length >= 1) {
                return {
                    images : imgs,
                    linkUrl: props.linkUrl || job.landingPageURL || job.landing_page_url || camp.landingPageURL || camp.url || '#',
                    altText: props.altText  || camp.campaignName  || camp.name || 'Ad',
                    campaign: camp,
                    job,
                };
            }
        }

        // Fallback: top-level creatives[placement].spotlightMobileImages
        const creatives = camp.creatives || {};
        for (const key of Object.keys(creatives)) {
            const imgs = firstNonEmpty(
                toImgArr(creatives[key]?.spotlightMobileImages),
                toImgArr(creatives[key]?.spotlight_mobile_images),
            );
            if (imgs.length >= 1) {
                return {
                    images : imgs,
                    linkUrl: props.linkUrl || camp.landingPageURL || camp.url || '#',
                    altText: props.altText  || camp.campaignName  || camp.name || 'Ad',
                    campaign: camp,
                    job: null,
                };
            }
        }

        return null;
    };

    const adId = props.adId;

    // ── Pinned campaign ──────────────────────────────────────────────────────
    if (adId && adId !== 'auto') {
        const pinned = campaigns.find((c: any) => c.campaignId === adId || c.id === adId);

        if (!pinned) {
            // Try auto below but record the miss
            const debugNote = `pinned id="${adId}" NOT FOUND in ${campaigns.length} campaigns`;
            for (const camp of campaigns) {
                if (!isActive(camp)) continue;
                const result = extractSpotlight(camp);
                if (result) return { ...result, _debug: `${debugNote} → fell back to auto: ${camp.campaignId}` };
            }
            return null;
        }

        if (!isActive(pinned)) {
            const debugNote = `pinned id="${adId}" status="${pinned.status}" is inactive/expired`;
            for (const camp of campaigns) {
                if (!isActive(camp)) continue;
                const r = extractSpotlight(camp);
                if (r) return { ...r, _debug: `${debugNote} → fell back to auto: ${camp.campaignId}` };
            }
            return null;
        }

        const result = extractSpotlight(pinned);
        if (result) return { ...result, _debug: `pinned id="${adId}" status="${pinned.status}" images=${result.images.length}` };

        // Pinned found but no spotlight images — fall back to auto
        const debugNote = `pinned id="${adId}" has no spotlight images`;
        for (const camp of campaigns) {
            if (!isActive(camp)) continue;
            const r = extractSpotlight(camp);
            if (r) return { ...r, _debug: `${debugNote} → fell back to auto: ${camp.campaignId}` };
        }
        return null;
    }

    // ── Auto ─────────────────────────────────────────────────────────────────
    for (const camp of campaigns) {
        if (!isActive(camp)) continue;
        const result = extractSpotlight(camp);
        if (result) return { ...result, _debug: `auto resolved: ${camp.campaignId} status="${camp.status}" images=${result.images.length}` };
    }
    return null;
}

/* ─── Renderer ────────────────────────────────────────────────── */
export function renderSpotlightAd(props: SpotlightAdRenderProps, ctx?: RenderContext): string {
    const id = props.id || 'spotlight-ad';
    const resolved = resolveSpotlightCampaign(props, ctx);

    const campaigns = ctx?.campaigns || [];
    const debugCampaignIds = campaigns.map((c: any) => `${c.campaignId}(${c.status})`).join(', ') || 'none';

    if (!resolved) {
        const hasFallback = props.fallbackAllowed !== false && (!!props._autoFallbackStoryId || !!props.fallbackStoryId);
        if (hasFallback) {
            const context = ctx ?? { zones: {}, storiesById: {} };
            if (props._autoFallbackStoryId) {
                return renderRecommendCard({
                    storyId: props._autoFallbackStoryId,
                    title: props._autoFallbackTitle,
                    label: props._autoFallbackLabel,
                    imageUrl: props._autoFallbackImageUrl,
                }, context);
            }
            return renderRecommendCard({ storyId: props.fallbackStoryId }, context);
        }
        return [
            `<!-- spotlight-ad-debug: adId="${props.adId}" | no campaign resolved`,
            `     campaigns available: [${debugCampaignIds}] -->`,
            `<div id="${id}" style="display:none;" data-ad-block="Spotlight" data-no-campaign="true"></div>`,
        ].join('\n');
    }

    const { images, linkUrl, altText, campaign, job, _debug } = resolved;
    const jobId = job?.jobId || job?.id || '';
    const u = `spl${(id + (props.adId || 'auto')).replace(/[^a-z0-9]/gi, '').slice(0, 16)}`;
    const N = images.length;

    /*
     * Cover-stack structure:
     * ─────────────────────
     * #${u}-wrap   — tall wrapper: height = N × 100dvh. This is what the PAGE scrolls through.
     * #${u}-sticky — position:sticky, top:0, height:100dvh. Stays pinned while wrap scrolls.
     * .${u}-panel  — N panels stacked inside sticky via z-index.
     *                Panel 0 sits at z:1 and never moves.
     *                Panel i (i≥1) slides up from below as the user scrolls the i-th viewport.
     *
     * A single passive scroll listener drives all translateY values — no preventDefault,
     * no snap, no transitions. The page scrolls naturally out of the bottom of the wrap.
     */

    /*
     * Cover-stack panels:
     * Panel 0 (z-index:1) — always at translateY(0), never moves. The "base".
     * Panel i (z-index:i+1) — starts at translateY(100%), slides up to translateY(0)
     *   covering the panel below it as the user scrolls the i-th viewport through #wrap.
     * No CSS transitions — scroll position directly drives each panel's translateY.
     */
    const panelHtml = images.map((src, i) => `
  <div class="${u}-panel" data-index="${i}" style="
    position:absolute;inset:0;
    z-index:${i + 1};
    transform:translateY(${i === 0 ? '0' : '100%'});
    will-change:transform;">
    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer"
       style="display:block;width:100%;height:100%;"
       onclick="
         if(typeof cwr === 'function') { cwr('recordEvent', { type: 'ad_click', data: { campaignId: '${campaign?.campaignId || campaign?.id || ''}' } }); }
         var api = window.__openPress_API__ || '';
         if(api) {
           fetch(api + '/campaigns/trackEvent', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               campaignId: '${campaign?.campaignId || campaign?.id || ''}',
               jobId: '${jobId}',
               eventType: 'click',
               placement: 'spotlight',
               pageUrl: window.location.href,
               referrer: document.referrer
             })
           }).catch(function(e) { console.warn('Failed to track ad click', e); });
         }
       ">
      <img src="${src}"
        alt="${altText}"
        loading="${i === 0 ? 'eager' : 'lazy'}"
        draggable="false"
        style="width:100%;height:100%;object-fit:cover;display:block;" />
    </a>
  </div>`).join('\n');

    /* ── CSS ──
     * NOTE: The horizontal full-bleed (edge-to-edge) width/offset is NOT set here via
     * `width:100vw; margin-left:calc(-50vw + 50%)`. That trick only works when the
     * element's parent is perfectly centered on the viewport — inside a narrower/off-center
     * content column (e.g. the blog article body) it leaves a stray gap on one side and can
     * cause horizontal overflow. Instead the JS below measures the wrap's real position via
     * getBoundingClientRect() and computes the exact breakout, which works in any container. */
    const css = `<style>
/* Spotlight Ad — hidden on desktop, sticky-scroll interscroller on mobile */
#${id}{ display:none; }
@media(max-width:768px){
  #${id}{ display:block !important; max-width:none !important; }
  #${u}-wrap{
    height:calc(${N} * 100dvh);
    /* Host pages often set ".article-body *{ max-width:100% }"-style rules to keep
       long words/images from overflowing the article column. Since this ad is
       injected as a descendant of that column, that rule would cap our JS-computed
       full-bleed width (window.innerWidth) back down to the column's own width,
       leaving a gap on the right. An id-selector beats that class-based universal
       selector on specificity, so this override wins regardless of source order. */
    max-width:none !important;
  }
  #${u}-sticky{
    position:sticky;
    top:0;
    height:100dvh;
    overflow:hidden;
    max-width:none !important;
  }
}
</style>`;

    /*
     * Cover-stack scroll driver:
     * ─────────────────────────
     * #wrap is (N × 100dvh) tall. As the page scrolls through it:
     *   scrolled = how many px of wrap have passed above the viewport (0 at top, (N-1)*vh at bottom).
     *   panelH   = sticky height (= 100dvh).
     *
     * For panel i (i >= 1):
     *   progress_i = clamp( (scrolled - (i-1)*panelH) / panelH, 0, 1 )
     *   translateY  = (1 - progress_i) * 100%
     *
     *   → When progress=0: panel is fully below (translateY 100%)
     *   → When progress=1: panel fully covers the one below (translateY 0%)
     *
     * Panel 0 never moves. No CSS transitions — scroll IS the animation.
     * After the last panel settles, the wrap ends and the page scrolls normally.
     */
    const js = `<script>
(function(){
  var wrap    = document.getElementById('${u}-wrap');
  var sticky  = document.getElementById('${u}-sticky');
  var panels  = sticky ? Array.prototype.slice.call(sticky.querySelectorAll('.${u}-panel')) : [];
  var N       = ${N};
  if(!wrap || panels.length < 1) return;

  var ticking = false;

  /* Compute the exact edge-to-edge breakout for the wrap, regardless of how
   * deeply it's nested or whether its parent is centered on the viewport.
   * Reset first so getBoundingClientRect() reflects the natural (un-bled) offset. */
  function fullBleed(){
    if(window.innerWidth > 768){
      wrap.style.width = '';
      wrap.style.marginLeft = '';
      return;
    }
    wrap.style.width = '';
    wrap.style.marginLeft = '0px';
    var rect = wrap.getBoundingClientRect();
    wrap.style.width = window.innerWidth + 'px';
    wrap.style.marginLeft = (-rect.left) + 'px';
  }

  function update(){
    var scrolled = -wrap.getBoundingClientRect().top;
    var panelH   = sticky.offsetHeight || window.innerHeight;

    /* Panel 0 is always at translateY(0) — never touch it. */
    for(var i = 1; i < N; i++){
      var progress = Math.min(Math.max((scrolled - (i - 1) * panelH) / panelH, 0), 1);
      panels[i].style.transform = 'translateY(' + ((1 - progress) * 100) + '%)';
    }

    ticking = false;
  }

  window.addEventListener('scroll', function(){
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  window.addEventListener('resize', function(){ fullBleed(); update(); }, { passive: true });

  /* run once on load to set correct state if page is mid-scroll */
  fullBleed();
  update();
})();
</script>`;

    return [
        `<!-- spotlight-ad-debug: ${_debug} | images=[${images.map(img => img.split('/').pop()).join(', ')}] -->`,
        css,
        `<div id="${id}" data-ad-block="Spotlight">`,
        `  <div id="${u}-wrap">`,
        `    <div id="${u}-sticky">`,
        panelHtml,
        `    </div>`,
        `  </div>`,
        `  <script>
            (function() {
                var api = window.__openPress_API__ || '';
                if (!api) return;
                fetch(api + '/campaigns/trackEvent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaignId: '${campaign?.campaignId || campaign?.id || ''}',
                        jobId: '${jobId}',
                        eventType: 'impression',
                        placement: 'spotlight',
                        pageUrl: window.location.href,
                        referrer: document.referrer
                    })
                }).catch(function(e) { console.warn('Failed to track ad impression', e); });
            })();
          </script>`,
        `</div>`,
        js,
    ].join('\n');
}
