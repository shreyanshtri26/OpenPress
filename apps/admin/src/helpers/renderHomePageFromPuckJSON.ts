import { ComponentRegistry } from './registry/ComponentRegistry';
import { PUBLISHED_PAGE_STYLES } from '../generated/publishedPageStyles';
import type { RenderContext } from './core/renderTypes';
import { renderCampaign } from './renderers/renderCampaign';
import { renderSpotlightAd } from './renderers/renderSpotlightAd';
import { resolveActivePopupCampaign, buildPopupAdHtml } from './renderers/renderPopupAd';
import env from '../utils/env';
import { analyticsTags } from './analyticsTags';

type PuckBlock = {
  type: string;
  props?: Record<string, any>;
};

type PuckData = {
  content?: PuckBlock[];
  zones?: Record<string, PuckBlock[]>;
};

type Story = {
  title?: string;
  summary?: string;
  image?: string;
  updatedAt?: string;
  [key: string]: any;
};

type HomePageJson = {
  pageType?: string;
  data?: PuckData;
  storiesById?: Record<string, Story>;
  sections?: string[];
  activeSection?: string;
  campaigns?: any[];
};



/* --------------------------------------------------
 * MASTER HOME PAGE RENDERER
 * Converts Home Puck JSON into full static HTML
 * -------------------------------------------------- */
export function renderHomePageFromPuckJSON(
  pageJson: HomePageJson | null | undefined
): string {
  if (!pageJson) return "<!-- invalid home page -->";

  const { data, storiesById, sections, activeSection, campaigns } = pageJson;
  const content: PuckBlock[] = data?.content ?? [];
  const zones: Record<string, PuckBlock[]> = data?.zones ?? {};

  const renderedBlockIds = new Set<string>();

  // Pre-count ThumbnailGrid blocks so each renderer knows its position
  const thumbnailGridTotal = content.filter(b => b.type === 'ThumbnailGrid').length;
  let thumbnailGridIndex = 0;

  /* --------------------------------------------------
   * Render any component via registry
   * -------------------------------------------------- */
  function renderComponent(block: PuckBlock | null | undefined): string {
    if (!block || typeof block !== "object") return "";

    const { type, props = {} } = block;
    const blockId = props.id || (block as any).id;

    // Check if this block has already been rendered (e.g. as a fallback for an ad)
    if (blockId && renderedBlockIds.has(blockId)) {
      console.log(`Skipping duplicate block with ID: ${blockId}`);
      return "";
    }

    let renderer = ComponentRegistry[type];

    // Fallback for dynamically generated Ad components from PageBuilder
    if (!renderer && type.startsWith('Ad_')) {
      if (type.toLowerCase().includes('spotlight')) {
        renderer = (p: any, c: any) => renderSpotlightAd(
          {
            id: p.id,
            adId: p.adId,
            linkUrl: p.linkUrl,
            altText: p.altText,
            fallbackStoryId: p.fallbackStoryId,
            fallbackAllowed: p.fallbackAllowed,
            _autoFallbackStoryId: p._autoFallbackStoryId,
            _autoFallbackTitle: p._autoFallbackTitle,
            _autoFallbackLabel: p._autoFallbackLabel,
            _autoFallbackImageUrl: p._autoFallbackImageUrl,
            _autoFallbackPublishUrl: p._autoFallbackPublishUrl,
          },
          c
        );
      } else {
        const placementName = type.replace('Ad_', '').replace(/_/g, '-');
        renderer = (p: any, c: any) => renderCampaign({
          ...p,
          id: p.id,
          adId: p.adId,
          placementName: placementName,
        }, c);
      }
    }

    if (!renderer) {
      console.warn("⚠️ Unknown component:", type);
      return `<!-- unknown component: ${type} -->`;
    }

    // Create RenderContext for the renderer
    const ctx: RenderContext = {
      zones,
      storiesById: storiesById ?? {},
      sections: sections ?? [],
      activeSection: activeSection ?? 'HOME',
      campaigns: campaigns ?? [],
      extraRenderers: ComponentRegistry,
      renderedBlockIds: renderedBlockIds, // Pass the set
      pageType: pageJson?.pageType || 'Home',
    };

    // Inject grid-position props into ThumbnailGrid blocks for mobile layout
    let finalProps: Record<string, any> = { ...props, id: blockId };
    if (type === 'ThumbnailGrid') {
      finalProps = { ...finalProps, thumbnailGridIndex: thumbnailGridIndex++, thumbnailGridTotal };
    }

    const result = renderer(finalProps, ctx);

    // Mark current block as rendered
    if (blockId) {
      renderedBlockIds.add(blockId);
    }

    return result;
  }

  /* --------------------------------------------------
   * Render top-level content
   * -------------------------------------------------- */
  const contentHTML: string = content.map(renderComponent).join("\n");

  /* --------------------------------------------------
   * Popup Ad — page-wide overlay, injected once here (not as a Puck block,
   * since it floats above the whole page rather than living in a zone).
   * -------------------------------------------------- */
  const { job: popupJob, campaign: popupCampaign } = resolveActivePopupCampaign(campaigns ?? []);
  const popupAdHtml = popupJob ? buildPopupAdHtml(popupJob, popupCampaign) : '';

  /* --------------------------------------------------
   * HTML escape (meta only)
   * -------------------------------------------------- */
  function escapeHtml(str: string | null | undefined): string {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* --------------------------------------------------
   * HOME SEO STRATEGY
   * -------------------------------------------------- */
  const siteName = (import.meta as any).env?.VITE_SITE_NAME || "OpenPress";
  const twitterHandle = (import.meta as any).env?.VITE_TWITTER_HANDLE || "@shreyanshtri26";
  const ogTitle = `${siteName} | Free, independent news for everyone`;
  const ogDescription =
    `${siteName} is a free, open publishing platform for independent journalism, covering news, politics, culture and more. Every article is free to read.`;
  const baseUrl = (import.meta as any).env?.VITE_CANONICAL_URL || (typeof window !== "undefined" ? window.location.origin : "https://openpress.com");
  const backendApi = (import.meta as any).env?.VITE_BACKEND_API || "";
  const ogImage = `${baseUrl}/openpress-logo-full-nobg-trim.png`;
  const canonicalUrl = `${baseUrl}/`.replace(/([^:]\/)\/+/g, "$1");

  /* --------------------------------------------------
   * Final HTML document
   * -------------------------------------------------- */
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    if (window.location.hostname.match(/^(uat|dev)\./)) {
      document.write('<meta name="robots" content="noindex, nofollow" />');
    } else {
      document.write('<meta name="robots" content="index, follow" />');
    }
  </script>
  ${analyticsTags()}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(siteName)}" />

  <title>${escapeHtml(ogTitle)}</title>

  <!-- Favicon -->
  <link rel="icon" href="/openpress-favicon-32.png" type="image/png" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Meta -->
  <meta name="description" content="${escapeHtml(ogDescription)}" />

  <!-- Tailwind (compiled, inlined to avoid FOUC) -->
  <style>${PUBLISHED_PAGE_STYLES}</style>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&family=Libre+Franklin:wght@400;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />

  <style>
    html, body { margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; background: #fff; }

    .font-share { font-family: 'Share Tech Mono', monospace !important; font-synthesis: none; }
    .font-lato { font-family: 'Lato', sans-serif !important; }
    .font-merriweather { font-family: 'Merriweather', serif !important; }
    .font-libre { font-family: 'Libre Franklin', sans-serif !important; }
    
    /* Fix recommendation card styling when inside a thumbnail grid on mobile */
    @media (max-width: 639px) {
      .thumbnail-grid-mobile-2x2 .recommend-card-content {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
      }
      .thumbnail-grid-mobile-2x2 .recommend-card-content .font-libre {
        font-size: 1.25rem !important;
        line-height: 1.15 !important;
      }
    }
  </style>
</head>

<body>
  <script>window.__openPress_API__ = '${escapeHtml(backendApi)}';</script>
  <div id="root">
    ${contentHTML}
  </div>

  ${popupAdHtml}

  <script>
    (function() {
      // Safe stringification for campaigns
      const campaigns = ${JSON.stringify(campaigns || []).replace(/</g, '\\u003c')};
      console.log("Client-side campaigns loaded:", campaigns.length);

      // Impression deduplication tracker (survives refreshAds interval calls)
      const impressionTracker = window.__campaignImpressionTracker || new Set();
      window.__campaignImpressionTracker = impressionTracker;

      function trackImpressionOnce(campaignId, jobId, placement, block) {
        if (!campaignId) return;
        var api = window.__openPress_API__ || '';
        if (!api) return;
        var key = [campaignId, jobId || '', placement || '', window.location.pathname, block ? (block.getAttribute('data-ad-block') || '') : ''].join('|');
        if (impressionTracker.has(key)) return;
        impressionTracker.add(key);
        // Skip if the block's inline script already tracked this campaign.
        if (block && block.getAttribute('data-impression-campaign') === campaignId) return;
        fetch(api + '/campaigns/trackEvent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaignId,
            jobId: jobId || null,
            placement: placement || null,
            eventType: 'impression',
            pageUrl: window.location.href,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent || null,
            blockType: block ? (block.getAttribute('data-ad-block') || null) : null
          })
        }).catch(function() {});
      }

      function safeParseUser(raw) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      }

      function getCurrentUser() {
        if (typeof localStorage === 'undefined') return null;
        return (
          safeParseUser(localStorage.getItem('auth_user')) ||
          safeParseUser(localStorage.getItem('website_user')) ||
          safeParseUser(localStorage.getItem('user'))
        );
      }

      // Donor / paid users should never see campaign ads — only logged-out
      // visitors and non-donor signed-in users should see them.
      function isDonorUser() {
        const u = getCurrentUser();
        if (!u || typeof u !== 'object') return false;
        var status = String(u.subscriptionStatus || u.subscription_status || u.planStatus || u.plan_status || u.status || '').toLowerCase();
        var paidStatuses = { active: true, paid: true, premium: true, pro: true, member: true, donor: true };
        return Boolean(
          u.isDonor === true ||
          u.is_donor === true ||
          u.suppressCampaigns === true ||
          u.suppress_campaigns === true ||
          u.adFree === true ||
          u.ad_free === true ||
          u.isPaid === true ||
          u.is_paid === true ||
          u.isMember === true ||
          u.is_member === true ||
          u.isPremium === true ||
          u.is_premium === true ||
          u.hasDonated === true ||
          u.has_donated === true ||
          Number(u.donationCount || u.donation_count || 0) > 0 ||
          Number(u.donationTotalAmount || u.donation_total_amount || 0) > 0 ||
          Number(u.lastDonationAmount || u.last_donation_amount || 0) > 0 ||
          paidStatuses[status]
        );
      }

      function resolveAd(props, defaultPlacement, fallbackKeywords, placementName) {
        const now = new Date();
        const normalize = (s) => (s || '').toLowerCase().replace(/[\\s_-]+/g, '-');
        const runningStatuses = ['start_now', 'active', 'running', 'start now'];
        const target = normalize(placementName || defaultPlacement);

        function isJobRunning(job) {
          if (!job) return false;
          if (job.startTime && new Date(job.startTime) > now) return false;
          if (job.endTime && new Date(job.endTime) < now) return false;
          return true;
        }

        function getJobForPlacement(campaign, placement) {
          if (!campaign || !campaign.jobs || !Array.isArray(campaign.jobs)) return null;
          const norm = normalize(placement);
          const matches = campaign.jobs.filter(j =>
            normalize(j.placement) === norm ||
            (j.placement && j.placement.toLowerCase() === placement.toLowerCase())
          );
          if (matches.length === 0) return null;
          // Several jobs commonly share one placement - one running now and a later
          // one scheduled to succeed it. Pick the job whose OWN window contains now,
          // never just the first match: the campaign-level gate opens at the earliest
          // job start, so a first-match hit would serve a future job creative before
          // its start time. Falling back to the first match leaves the isJobRunning()
          // gate downstream in charge of suppressing the slot.
          return matches.find(isJobRunning) || matches[0];
        }

        let activeCampaign;
        let placement = placementName || defaultPlacement;

        if (props.adId && props.adId !== 'auto') {
          activeCampaign = campaigns.find(c => {
            if (!props.adId?.startsWith(c.campaignId + '-')) {
                if (!props.adId?.startsWith(c.campaignId)) return false;
            }
            const status = (c.status || '').toLowerCase();
            const endStr = c.endTime || c.endDate;
            const basicMatch = runningStatuses.includes(status) &&
                (!c.startTime || new Date(c.startTime) <= now) &&
                (!endStr || new Date(endStr) >= now);
            if (!basicMatch) return false;

            const pName = props.adId.startsWith(c.campaignId + '-')
              ? props.adId.replace(c.campaignId + '-', '')
              : props.adId.replace(c.campaignId, '');

            if (c.jobs && Array.isArray(c.jobs) && c.jobs.length > 0) {
              const matchedJob = getJobForPlacement(c, pName);
              if (!matchedJob || !isJobRunning(matchedJob)) return false;
            }
            return true;
          });
          
          if (activeCampaign) {
            placement = props.adId.startsWith(activeCampaign.campaignId + '-')
                ? props.adId.replace(activeCampaign.campaignId + '-', '')
                : props.adId.replace(activeCampaign.campaignId, '');
          }
        } else {
          activeCampaign = campaigns.find(c => {
            const status = (c.status || '').toLowerCase();
            const typeMatch = (c.type && normalize(c.type) === target) ||
                              (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw))));
            const placementMatch = c.placements && c.placements.some(p => {
                 if (target && normalize(p) === target) return true;
                 return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
              });
            
            const endStr = c.endTime || c.endDate;
            const basicMatch = runningStatuses.includes(status) &&
              (!c.startTime || new Date(c.startTime) <= now) &&
              (!endStr || new Date(endStr) >= now) &&
              (typeMatch || placementMatch);
            if (!basicMatch) return false;

            let matchedPlacement = placement;
            if (c.placements) {
              matchedPlacement = c.placements.find(p => {
                if (target && normalize(p) === target) return true;
                return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
              }) || placement;
            }

            if (c.jobs && Array.isArray(c.jobs) && c.jobs.length > 0) {
              const matchedJob = getJobForPlacement(c, matchedPlacement);
              if (!matchedJob || !isJobRunning(matchedJob)) return false;
            }
            return true;
          });

          if (activeCampaign && activeCampaign.placements) {
            placement = activeCampaign.placements.find(p => {
               if (target && normalize(p) === target) return true;
               return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
            }) || placement;
          }
        }

        const getCreative = (camp, pName) => {
          if (!camp) return null;
          const norm = normalize(pName);

          // Job-level creatives take priority: camp.creatives is keyed by placement
          // alone, so it cannot tell two jobs on the same placement apart and would
          // hand back the wrong job artwork.
          const job = getJobForPlacement(camp, pName);
          if (job && job.creatives) {
            const desktopVal = job.creatives.desktop?.[0]?.fileUrl || job.creatives.desktop;
            const mobileVal = job.creatives.mobile?.[0]?.fileUrl || job.creatives.mobile;
            const jobDesktop = typeof desktopVal === 'string' ? desktopVal : '';
            const jobMobile = typeof mobileVal === 'string' ? mobileVal : '';
            if (jobDesktop || jobMobile) {
              return { desktop: jobDesktop, mobile: jobMobile };
            }
          }

          if (camp.creatives) {
            const keys = Object.keys(camp.creatives);
            const exact = keys.find(k => k.toLowerCase() === pName.toLowerCase());
            if (exact) return camp.creatives[exact];
            const normalizedKey = keys.find(k => normalize(k) === norm);
            if (normalizedKey) return camp.creatives[normalizedKey];
          }

          return null;
        };

        const creative = getCreative(activeCampaign, placement);
        const matchingCampaign = campaigns.find(c => 
          (c.type && normalize(c.type) === target) ||
          (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw)))) ||
          (c.placements && c.placements.some(p => {
              if (target && normalize(p) === target) return true;
              return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
          }))
        );

        const job = activeCampaign?.jobs?.find(j => normalize(j.placement) === normalize(placement) || j.placement?.toLowerCase() === placement?.toLowerCase());

        return {
          desktop: props.desktopImageUrl || creative?.desktop,
          mobile: props.mobileImageUrl || creative?.mobile,
          thirdPartyTagDesktop: job?.thirdPartyTagDesktop || creative?.thirdPartyTagDesktop || creative?.third_party_tag_desktop || activeCampaign?.thirdPartyTag || activeCampaign?.third_party_tag || '',
          thirdPartyTagMobile: job?.thirdPartyTagMobile || creative?.thirdPartyTagMobile || creative?.third_party_tag_mobile || activeCampaign?.thirdPartyTagMobile || activeCampaign?.third_party_tag_mobile || '',
          desktopDimensions: creative?.desktopDimensions || creative?.desktop_dimensions || job?.dimension?.desktop || job?.dimension?.desktopDimensions || props.desktopDimensions || '300*250',
          mobileDimensions: creative?.mobileDimensions || creative?.mobile_dimensions || job?.dimension?.mobile || job?.dimension?.mobileDimensions || props.mobileDimensions || '320*50',
          link: props.linkUrl || job?.landingPageURL || job?.landing_page_url || activeCampaign?.landingPageURL || activeCampaign?.url || '#',
          alt: props.altText || activeCampaign?.campaignName || 'Advertisement',
          activeCampaign,
          matchingCampaign
        };
      }

      function refreshAds() {
        const blocks = document.querySelectorAll('[data-ad-block]');
        blocks.forEach(block => {
          const type = block.getAttribute('data-ad-block');
          const propsJson = block.getAttribute('data-ad-props');
          if (!propsJson) return;
          
          try {
            const props = JSON.parse(propsJson.replace(/&apos;/g, "'"));
            let defaultPlacement = 'leaderboard';
            let keywords = ['leaderboard'];
            
            if (type === 'In-Story' || type === 'in-story') {
              defaultPlacement = 'in-story';
              keywords = ['instory', 'in-story'];
            } else if (type === 'Sidebar' || type === 'sidebar') {
              defaultPlacement = 'sidebar';
              keywords = ['sidebar'];
            } else if (block.getAttribute('data-ad-type') === 'dynamic') {
              defaultPlacement = type;
              keywords = [];
            }

            const link = block.querySelector('.ad-link');
            const img = block.querySelector('.ad-desktop-img');
            const source = block.querySelector('.ad-mobile-source');
            const container = block.querySelector('.ad-container');
            const fallback = block.querySelector('.fallback-container');

            // Donors never see campaign ads — show fallback content instead (or hide the block).
            if (isDonorUser()) {
              if (container) container.style.display = 'none';
              if (fallback) {
                fallback.style.display = 'block';
                block.style.display = 'flex';
              } else {
                block.style.display = 'none';
              }
              return;
            }

            const ad = resolveAd(props, defaultPlacement, keywords, type);

            if (link && ad.link) link.href = ad.link;

            const fallbackBlock = props.fallbackBlock;
            const alwaysShow = fallbackBlock && [
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

            if (ad.desktop || ad.mobile || ad.thirdPartyTagDesktop || ad.thirdPartyTagMobile) {
              if (container) container.style.display = 'flex';
              if (fallback) fallback.style.display = alwaysShow ? 'block' : 'none';
              block.style.display = 'flex';

              // Fire impression tracking once per unique ad+placement+page
              var activeCamp = ad.activeCampaign;
              if (activeCamp) {
                var campJob = activeCamp.jobs && activeCamp.jobs.find(function(j) {
                  var norm = function(s) { return (s || '').toLowerCase().replace(/[\s_-]+/g, '-'); };
                  return norm(j.placement) === norm(type);
                });
                trackImpressionOnce(
                  activeCamp.campaignId || activeCamp.id || '',
                  campJob ? (campJob.jobId || campJob.id || '') : '',
                  type || '',
                  block
                );
              }

              const isMobile = window.innerWidth <= 768;
              const tag = isMobile ? (ad.thirdPartyTagMobile || ad.thirdPartyTagDesktop) : ad.thirdPartyTagDesktop;

              if (tag) {
                // Handle Third Party Tag
                let iframeWrapper = container.querySelector('.ad-iframe-wrapper');
                if (!iframeWrapper) {
                  if (link) link.style.display = 'none';
                  iframeWrapper = document.createElement('div');
                  iframeWrapper.className = 'ad-iframe-wrapper';
                  iframeWrapper.style.cssText = 'position:relative;width:100%;height:100%;';
                  container.appendChild(iframeWrapper);
                } else {
                  iframeWrapper.style.display = 'block';
                  if (link) link.style.display = 'none';
                }

                const cleanTag = (t) => (t || '').replace(/\\u00A0/g, ' ').replace(/&nbsp;/g, ' ').replace(/{{LANDING_PAGE_URL}}/gi, ad.link || '#');
                const finalTag = cleanTag(tag);
                
                let iframe = iframeWrapper.querySelector('iframe');
                if (!iframe) {
                  iframe = document.createElement('iframe');
                  iframe.className = 'ad-iframe';
                  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
                  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
                  iframeWrapper.appendChild(iframe);
                }
                
                const srcDoc = \`<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>\${finalTag}\`;
                if (iframe.srcdoc !== srcDoc) {
                  iframe.srcdoc = srcDoc;
                }
              } else {
                // Handle Image
                const iframeWrapper = container.querySelector('.ad-iframe-wrapper');
                if (iframeWrapper) iframeWrapper.style.display = 'none';
                if (link) link.style.display = 'block';

                if (img) {
                  img.src = isMobile ? (ad.mobile || ad.desktop || '') : (ad.desktop || '');
                  img.alt = ad.alt || 'Advertisement';
                }
                if (source && ad.mobile) {
                  source.srcset = ad.mobile;
                }
              }

              // Update dimensions
              if (container && (ad.desktopDimensions || ad.mobileDimensions)) {
                const parseDim = (dim) => {
                  const parts = (dim || '').replace(/\\s+/g, '').replace('x', '*').split('*').map(Number);
                  return { w: parts[0] || 0, h: parts[1] || 0 };
                };
                const d = parseDim(ad.desktopDimensions);
                const m = parseDim(ad.mobileDimensions);
                const dim = isMobile ? m : d;
                const isTag = !!(ad.thirdPartyTagDesktop || ad.thirdPartyTagMobile);
                
                if (isTag) {
                  if (dim.w) {
                    container.style.width = dim.w + 'px';
                    container.style.maxWidth = dim.w + 'px';
                  }
                  if (dim.h) container.style.height = dim.h + 'px';
                  container.style.aspectRatio = '';
                } else {
                  if (dim.w) {
                    container.style.maxWidth = dim.w + 'px';
                    container.style.width = '100%';
                  }
                  container.style.height = 'auto';
                  container.style.aspectRatio = '';
                  if (img) {
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.aspectRatio = '';
                  }
                }
              }
            } else {
              if (container) container.style.display = 'none';
              if (fallback) {
                fallback.style.display = 'block';
                block.style.display = 'flex';
              } else {
                block.style.display = 'none';
              }
            }
          } catch (e) {
            console.error("Error updating ad block:", e);
          }
        });
      }

      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
          refreshAds();
        });
      } else {
        refreshAds();
      }
      setInterval(refreshAds, 60000);

      window.addEventListener('storage', function (e) {
        if (!e || !e.key) return;
        if (e.key === 'auth_user' || e.key === 'website_user' || e.key === 'user') {
          refreshAds();
        }
      });
    })();
  </script>
</body>
</html>
  `;
}
