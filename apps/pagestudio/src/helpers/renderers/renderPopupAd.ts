// ─── Popup Ad — full-page overlay/modal ad ─────────────────────────────────
// Unlike Spotlight/Leaderboard/Sidebar/InStory (which live inside a specific
// Puck zone), a Popup Ad floats above the entire page, so it is NOT rendered
// as a Puck-placeable block. Instead it's injected once per page, directly by
// the top-level page renderers (renderHomePageFromPuckJSON, renderBlogPage's
// renderPageFromPuckJSON), right before the closing </body>. Because it's
// injected exactly once per page-render call (not once per grid/zone
// component), it is inherently immune to the "renders twice" class of bug we
// hit with the Spotlight sidebar card — there is only ever one call site per
// page render.

export function resolveActivePopupCampaign(campaigns: any[] = []): { job: any; campaign: any } {
  const now = new Date()
  const INACTIVE = new Set(['paused', 'pause', 'draft', 'stopped', 'ended', 'cancelled', 'canceled'])
  let popupJob: any = null
  let popupCampaign: any = null

  for (const camp of campaigns) {
    const st = (camp.status || '').toLowerCase().replace(/[\s_-]+/g, '_')
    if (INACTIVE.has(st)) continue
    if (!camp.jobs) continue

    for (const job of camp.jobs) {
      const fmt = (job.adFormat || job.ad_format || '').toLowerCase().replace(/[\s_-]+/g, '')
      if (fmt !== 'popup') continue

      const desktopImg = job.popupDesktopImage || job.popup_desktop_image
      const mobileImg = job.popupMobileImage || job.popup_mobile_image
      if (!desktopImg && !mobileImg) continue

      const start = job.startTime ? new Date(job.startTime) : null
      const end = job.endTime ? new Date(job.endTime) : null
      if (start && start > now) continue
      if (end && end < now) continue

      popupJob = job
      popupCampaign = camp
      break
    }
    if (popupJob) break
  }

  return { job: popupJob, campaign: popupCampaign }
}

export function buildPopupAdHtml(job: any, campaign: any): string {
  if (!job) return ''

  const desktopImg = job.popupDesktopImage || job.popup_desktop_image || ''
  const mobileImg = job.popupMobileImage || job.popup_mobile_image || desktopImg
  if (!desktopImg && !mobileImg) return ''

  const jobId = job.jobId || job.job_id || `popup-${Math.random().toString(36).slice(2)}`
  const linkUrl = job.landingPageURL || job.landing_page_url || campaign?.landingPageURL || campaign?.url || '#'
  const altText = (campaign?.campaignName || campaign?.name || 'Advertisement').replace(/"/g, '&quot;')
  const ctaText = job.popupCtaText || job.popup_cta_text || ''

  // Trigger config — "immediate" and "delay" both resolve to a plain timer;
  // "immediate" is simply delay=0. See resolvePopupTrigger() in the client
  // script below for the actual dispatch.
  const trigger = (job.popupTrigger || 'immediate').toLowerCase()
  const triggerVal = Number(job.popupTriggerVal) || 0
  const capDays = job.popupCapDays !== undefined ? Number(job.popupCapDays) : 7
  const hideOnConvert = job.popupHideOnConvert !== false

  const id = `popup-ad-${jobId}`
  const capKey = `popup_ad_seen_${jobId}`

  return `
<div id="${id}" class="popup-ad-overlay" data-ad-block="Popup-Ad" style="display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
  <div class="popup-ad-card" style="position:relative;max-width:520px;width:100%;">
    <button type="button" class="popup-ad-close" aria-label="Close advertisement" style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#111;z-index:1;">&times;</button>
    <span style="display:block;font-size:10px;text-transform:uppercase;font-weight:700;color:#e5e7eb;letter-spacing:0.1em;margin-bottom:6px;">Advertisement</span>
    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="popup-ad-link" style="display:block;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.3);background:#fff;">
      <img class="popup-ad-img-desktop" src="${desktopImg || mobileImg}" alt="${altText}" style="width:100%;height:auto;display:block;" />
      <img class="popup-ad-img-mobile" src="${mobileImg || desktopImg}" alt="${altText}" style="width:100%;height:auto;display:none;" />
      ${ctaText ? `<span class="popup-ad-cta" style="display:block;text-align:center;padding:10px 16px;font-weight:600;font-size:14px;background:#111;color:#fff;">${ctaText}</span>` : ''}
    </a>
  </div>
</div>
<style>
@media(max-width:768px){
  #${id} .popup-ad-img-desktop{ display:none !important; }
  #${id} .popup-ad-img-mobile{ display:block !important; }
}
</style>
<script>
(function(){
  var overlay = document.getElementById('${id}');
  if(!overlay) return;
  var capKey = ${JSON.stringify(capKey)};
  var capDays = ${capDays};
  var hideOnConvert = ${hideOnConvert ? 'true' : 'false'};
  var trigger = ${JSON.stringify(trigger)};
  var triggerVal = ${triggerVal};
  var shown = false;

  /* ── Frequency-cap guard — evaluated once, before any trigger is armed ── */
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(capKey) || 'null'); } catch(e) {}
  if (stored && stored.converted) return;
  if (stored && stored.lastShown && (Date.now() - stored.lastShown) < capDays * 86400000) return;

  function showPopup(){
    if (shown) return;
    shown = true;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { localStorage.setItem(capKey, JSON.stringify({ lastShown: Date.now() })); } catch(e) {}
    try {
      var api = window.__openPress_API__ || '';
      if (api) {
        fetch(api + '/campaigns/trackEvent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: '${campaign?.campaignId || campaign?.id || ''}',
            jobId: '${job.jobId || job.job_id || job.id || ''}',
            eventType: 'impression',
            placement: 'popup',
            pageUrl: window.location.href,
            referrer: document.referrer
          })
        }).catch(function(e) { console.warn('Failed to track ad impression', e); });
      }
    } catch(err) {}
  }

  function closePopup(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  overlay.querySelector('.popup-ad-close').addEventListener('click', function(e){
    e.preventDefault();
    closePopup();
  });
  overlay.addEventListener('click', function(e){
    if (e.target === overlay) closePopup();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && overlay.style.display !== 'none') closePopup();
  });
  var link = overlay.querySelector('.popup-ad-link');
  if (link) {
    link.addEventListener('click', function(){
      if (hideOnConvert) {
        try { localStorage.setItem(capKey, JSON.stringify({ converted: true })); } catch(e) {}
      }
      try {
        var api = window.__openPress_API__ || '';
        if (api) {
          fetch(api + '/campaigns/trackEvent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: '${campaign?.campaignId || campaign?.id || ''}',
              jobId: '${job.jobId || job.job_id || job.id || ''}',
              eventType: 'click',
              placement: 'popup',
              pageUrl: window.location.href,
              referrer: document.referrer
            })
          }).catch(function(e) { console.warn('Failed to track ad click', e); });
        }
      } catch(err) {}
    });
  }

  /* ── Trigger dispatch ──────────────────────────────────────────────── */
  function armDelay(){
    setTimeout(showPopup, Math.max(0, triggerVal) * 1000);
  }

  function armScroll(){
    var ticking = false;
    function check(){
      ticking = false;
      var docEl = document.documentElement;
      var scrollable = docEl.scrollHeight - window.innerHeight;
      var pct = scrollable > 0 ? ((window.scrollY / scrollable) * 100) : 100;
      if (pct >= triggerVal) {
        showPopup();
        window.removeEventListener('scroll', onScroll);
      }
    }
    function onScroll(){
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Handle pages shorter than the viewport (no scroll possible) — treat as
    // already "fully scrolled" so the ad still shows rather than never firing.
    if (document.documentElement.scrollHeight <= window.innerHeight) check();
  }

  function armExitIntent(){
    // Desktop-only: no reliable mouse-based exit signal exists on touch
    // devices, so on mobile a popup configured for exit-intent simply never
    // shows (documented limitation, same tradeoff Spotlight makes for its
    // mobile/desktop split).
    if (window.innerWidth <= 768) return;
    var armedAt = Date.now();
    function onMouseOut(e){
      if (Date.now() - armedAt < 3000) return; // ignore accidental moves right after load
      if (e.clientY <= 0 && !e.relatedTarget) {
        showPopup();
        document.removeEventListener('mouseout', onMouseOut);
      }
    }
    document.addEventListener('mouseout', onMouseOut);
  }

  switch (trigger) {
    case 'scroll':
      armScroll();
      break;
    case 'exit_intent':
      armExitIntent();
      break;
    case 'delay':
    case 'immediate':
    default:
      armDelay();
      break;
  }
})();
</script>`
}
