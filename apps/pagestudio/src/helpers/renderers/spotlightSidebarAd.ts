// ─── Shared Spotlight campaign resolution + desktop sidebar card builder ──
// Used by renderBlogBodyCard/renderBlogGrid (blog/renderFunctions.ts) AND by
// renderSectionGrid — the "Blog" page's single-article template actually uses
// the SectionGrid component (not BlogGrid) for its two-column layout, so the
// desktop Spotlight fallback card must be injected there too. Lives in its
// own module (rather than blog/renderFunctions.ts) to avoid a circular
// import, since renderFunctions.ts already imports renderSectionGrid.

export function resolveActiveSpotlightCampaign(campaigns: any[] = []): { job: any; campaign: any } {
  const now = new Date();
  let spotlightJob: any = null;
  let spotlightCampaign: any = null;
  for (const camp of campaigns) {
    if (!camp.jobs) continue;
    for (const job of camp.jobs) {
      const fmt = (job.adFormat || job.ad_format || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (fmt !== 'spotlight') continue;
      const imgs = job.spotlightMobileImages || job.spotlight_mobile_images
        || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images;
      if (!Array.isArray(imgs) || imgs.filter(Boolean).length < 1) continue;
      const start = job.startTime ? new Date(job.startTime) : null;
      const end = job.endTime ? new Date(job.endTime) : null;
      const campStatus = (camp.status || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
      const isActive =
        (['start_now', 'active', 'running', 'started'].includes(campStatus) || campStatus.includes('start')) &&
        (!start || start <= now) &&
        (!end || end >= now);
      if (isActive) {
        spotlightJob = job;
        spotlightCampaign = camp;
        break;
      }
    }
    if (spotlightJob) break;
  }
  return { job: spotlightJob, campaign: spotlightCampaign };
}

// Builds the desktop-only Spotlight fallback ad card (image + link), styled
// as a bordered/shadowed card so it can drop into a sidebar zone and match
// PopularBlogCard's placement/width/spacing.
export function buildSpotlightDesktopFallbackHtml(job: any, campaign: any): string {
  if (!job) return '';
  const imgs = (job.spotlightMobileImages || job.spotlight_mobile_images
    || job.creatives?.spotlightMobileImages || job.creatives?.spotlight_mobile_images || [])
    .filter(Boolean);
  if (imgs.length === 0) return '';
  const rawIdx = job.spotlightFallbackIndex ?? job.spotlight_fallback_index;
  const idx = Number.isInteger(Number(rawIdx)) && imgs[Number(rawIdx)] ? Number(rawIdx) : 0;
  const fallbackUrl = imgs[idx] || imgs[0];
  const linkUrl = job.landingPageURL || job.landing_page_url || campaign?.landingPageURL || campaign?.url || '#';
  const altText = campaign?.campaignName || campaign?.name || 'Advertisement';
  const campaignId = campaign?.campaignId || campaign?.id || '';
  const jobId = job.jobId || job.id || '';
  // Impression is skipped when the card is hidden or the in-story spotlight already counted it.
  return `
<div id="instory-spotlight-desktop-fallback" data-ad-block="Spotlight-Desktop-Fallback" style="width:100%;box-sizing:border-box;">
  <span style="display:block;font-size:10px;text-transform:uppercase;font-weight:700;color:#9ca3af;letter-spacing:0.1em;margin-bottom:8px;">Advertisement</span>
  <a href="${fallbackUrl ? linkUrl : '#'}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;" onclick="
    var api = window.__openPress_API__ || '';
    if(api) {
      fetch(api + '/campaigns/trackEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: '${campaignId}', jobId: '${jobId}', eventType: 'click', placement: 'spotlight', pageUrl: window.location.href, referrer: document.referrer })
      }).catch(function(e) { console.warn('Failed to track ad click', e); });
    }
  ">
    <img src="${fallbackUrl}" alt="${altText}" loading="lazy" style="width:100%;height:auto;display:block;" />
  </a>
  <script>
    (function() {
      var api = window.__openPress_API__ || '';
      var el = document.getElementById('instory-spotlight-desktop-fallback');
      var seen = window.__spotlightImpressions = window.__spotlightImpressions || {};
      var key = '${campaignId}|${jobId}';
      if (!api || !el || el.offsetParent === null || seen[key]) return;
      seen[key] = true;
      fetch(api + '/campaigns/trackEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: '${campaignId}', jobId: '${jobId}', eventType: 'impression', placement: 'spotlight', pageUrl: window.location.href, referrer: document.referrer })
      }).catch(function(e) { console.warn('Failed to track ad impression', e); });
    })();
  </script>
</div>`;
}
