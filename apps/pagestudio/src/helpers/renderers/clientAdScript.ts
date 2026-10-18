export const getClientAdScript = (sidebarDefaultPlacement: 'sidebar' | 'sidebar-rectangle') => {
  return `
        console.log("Client-side campaigns loaded:", campaigns.length);

        function safeParse(raw) {
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch (e) {
            return null;
          }
        }

        function getCurrentUser() {
          if (typeof localStorage === 'undefined') return null;
          return (
            safeParse(localStorage.getItem('auth_user')) ||
            safeParse(localStorage.getItem('website_user')) ||
            safeParse(localStorage.getItem('user'))
          );
        }

        function isDonorUser() {
          const u = getCurrentUser();
          if (!u || typeof u !== 'object') return false;
          var status = String(u.subscriptionStatus || u.subscription_status || u.planStatus || u.plan_status || u.status || '').toLowerCase();
          var paidStatuses = {
            active: true,
            paid: true,
            premium: true,
            pro: true,
            member: true,
            donor: true
          };
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

        const impressionTracker = window.__campaignImpressionTracker || new Set();
        window.__campaignImpressionTracker = impressionTracker;

        function resolveCampaignApiBase() {
          if (typeof window === 'undefined') return '';
          const explicitBase = String(window.__openPress_API__ || '').trim();
          if (explicitBase) return explicitBase.replace(/\\/$/, '');

          const host = window.location && window.location.hostname ? window.location.hostname : '';
          if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
          return '';
        }

        function postCampaignEvent(eventType, ad, block) {
          if (!ad || !ad.campaignId) return;
          const apiBase = resolveCampaignApiBase();
          if (!apiBase) return;

          const payload = {
            campaignId: ad.campaignId,
            jobId: ad.jobId || null,
            placement: ad.placement || null,
            eventType,
            pageUrl: (window.location && window.location.href) ? window.location.href : null,
            referrer: document.referrer || null,
            userAgent: (navigator && navigator.userAgent) ? navigator.userAgent : null,
            blockType: block ? (block.getAttribute('data-ad-block') || null) : null
          };

          fetch(apiBase + '/campaigns/trackEvent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        }

        function trackImpressionOnce(ad, block) {
          if (!ad || !ad.campaignId) return;
          const key = [
            ad.campaignId,
            ad.jobId || '',
            ad.placement || '',
            window.location && window.location.pathname ? window.location.pathname : '',
            block ? (block.getAttribute('data-ad-block') || '') : ''
          ].join('|');
          if (impressionTracker.has(key)) return;
          impressionTracker.add(key);
          postCampaignEvent('impression', ad, block);
        }

        function attachClickTracker(linkEl, ad, block) {
          if (!linkEl || !ad || !ad.campaignId) return;
          const clickKey = [ad.campaignId, ad.jobId || '', ad.placement || ''].join('|');
          if (linkEl.getAttribute('data-campaign-click-key') === clickKey) return;

          linkEl.setAttribute('data-campaign-click-key', clickKey);
          linkEl.onclick = function () {
            postCampaignEvent('click', ad, block);
          };
        }

        function resolveAd(props, defaultPlacement, fallbackKeywords, placementName) {
          const now = new Date();
          const normalize = (s) => (s || '').toLowerCase().replace(/[\\s_-]+/g, '-');
          const target = normalize(placementName || defaultPlacement);

          function isCampaignRunning(campaign) {
            if (!campaign) return false;
            const status = (campaign.status || '').toLowerCase();
            const runningStatuses = ['start_now', 'active', 'running', 'start now'];
            if (!runningStatuses.includes(status)) return false;

            if (campaign.startTime && new Date(campaign.startTime) > now) return false;
            if ((campaign.endTime || campaign.endDate) && new Date(campaign.endTime || campaign.endDate) < now) return false;
            return true;
          }

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
            // Jobs can share a placement; pick the one running now, not the first.
            return matches.find(isJobRunning) || matches[0];
          }

          function getCreative(camp, pName) {
            if (!camp) return null;
            const norm = normalize(pName);

            // Job creatives win: camp.creatives is keyed by placement only.
            const job = getJobForPlacement(camp, pName);
            if (job && job.creatives) {
              const desktopVal = job.creatives.desktop?.[0]?.fileUrl || job.creatives.desktop;
              const mobileVal = job.creatives.mobile?.[0]?.fileUrl || job.creatives.mobile;
              const jobDesktop = typeof desktopVal === 'string' ? desktopVal : '';
              const jobMobile = typeof mobileVal === 'string' ? mobileVal : '';
              const jobTagDesktop = job.thirdPartyTagDesktop || job.creatives.thirdPartyTagDesktop || job.creatives.third_party_tag_desktop || '';
              const jobTagMobile = job.thirdPartyTagMobile || job.creatives.thirdPartyTagMobile || job.creatives.third_party_tag_mobile || '';
              if (jobDesktop || jobMobile || jobTagDesktop || jobTagMobile) {
                return {
                  desktop: jobDesktop,
                  mobile: jobMobile,
                  thirdPartyTagDesktop: jobTagDesktop,
                  thirdPartyTagMobile: jobTagMobile
                };
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
          }

          let activeCampaign;
          let placement = placementName || defaultPlacement;

          if (props.adId && props.adId !== 'auto') {
            activeCampaign = campaigns.find(c => {
              if (!props.adId?.startsWith(c.campaignId + '-')) {
                if (!props.adId?.startsWith(c.campaignId)) return false;
              }
              if (!isCampaignRunning(c)) return false;

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
              if (!isCampaignRunning(c)) return false;

              const typeMatch = (c.type && normalize(c.type) === target) ||
                                (c.type && fallbackKeywords.some(kw => normalize(c.type).includes(normalize(kw))));
              const placementMatch = c.placements && c.placements.some(p => {
                if (target && normalize(p) === target) return true;
                return fallbackKeywords.some(kw => p.toLowerCase().includes(kw.toLowerCase()));
              });

              if (!typeMatch && !placementMatch) return false;

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

          const creative = getCreative(activeCampaign, placement);
          const job = getJobForPlacement(activeCampaign, placement);

          const ad = {
            campaignId: activeCampaign?.campaignId || activeCampaign?.id || '',
            jobId: job?.jobId || job?.id || '',
            placement: placement || placementName || defaultPlacement,
            desktop: props.desktopImageUrl || creative?.desktop || '',
            mobile: props.mobileImageUrl || creative?.mobile || '',
            thirdPartyTagDesktop: job?.thirdPartyTagDesktop || creative?.thirdPartyTagDesktop || creative?.third_party_tag_desktop || activeCampaign?.thirdPartyTag || activeCampaign?.third_party_tag || '',
            thirdPartyTagMobile: job?.thirdPartyTagMobile || creative?.thirdPartyTagMobile || creative?.third_party_tag_mobile || activeCampaign?.thirdPartyTagMobile || activeCampaign?.third_party_tag_mobile || '',
            desktopDimensions: job?.dimension?.desktop || job?.dimension?.desktopDimensions || props.desktopDimensions || '300*250',
            mobileDimensions: job?.dimension?.mobile || job?.dimension?.mobileDimensions || props.mobileDimensions || '320*50',
            link: props.linkUrl || job?.landingPageURL || job?.landing_page_url || activeCampaign?.landingPageURL || activeCampaign?.url || '#',
            alt: props.altText || activeCampaign?.campaignName || 'Advertisement'
          };

          const hasRenderable = !!(ad.desktop || ad.mobile || ad.thirdPartyTagDesktop || ad.thirdPartyTagMobile);
          if (!hasRenderable) {
            return {
              desktop: '',
              mobile: '',
              thirdPartyTagDesktop: '',
              thirdPartyTagMobile: '',
              desktopDimensions: props.desktopDimensions || '300*250',
              mobileDimensions: props.mobileDimensions || '320*50',
              link: '#',
              alt: 'Advertisement',
              campaignId: activeCampaign?.campaignId || activeCampaign?.id || '',
              jobId: job?.jobId || job?.id || '',
              placement: placement || placementName || defaultPlacement
            };
          }
          return ad;
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
                defaultPlacement = '${sidebarDefaultPlacement}';
                keywords = ['sidebar'];
              } else if (block.getAttribute('data-ad-type') === 'dynamic') {
                defaultPlacement = type;
                keywords = [];
              }

              const container = block.querySelector('.ad-container');
              const fallback = block.querySelector('.fallback-container');

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
              const link = block.querySelector('.ad-link');
              const img = block.querySelector('.ad-desktop-img');
              const source = block.querySelector('.ad-mobile-source');
              
              if (link && ad.link) link.href = ad.link;

              if (ad.desktop || ad.mobile || ad.thirdPartyTagDesktop || ad.thirdPartyTagMobile) {
                if (container) container.style.display = 'flex';
                if (fallback) fallback.style.display = 'none';
                block.style.display = 'flex';

                trackImpressionOnce(ad, block);
                attachClickTracker(link, ad, block);

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

                  const cleanTag = (t) => (t || '').replace(/\\\\u00A0/g, ' ').replace(/&nbsp;/g, ' ').replace(/{{LANDING_PAGE_URL}}/gi, ad.link || '#');
                  const finalTag = cleanTag(tag);
                  
                  let iframe = iframeWrapper.querySelector('iframe');
                  if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.className = 'ad-iframe';
                    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
                    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
                    iframeWrapper.appendChild(iframe);
                  }
                  
                  const srcDoc = '<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>' + finalTag;
                  if (iframe.srcdoc !== srcDoc) {
                    iframe.srcdoc = srcDoc;
                  }
                } else {
                  // Handle Image
                  const iframeWrapper = container.querySelector('.ad-iframe-wrapper');
                  if (iframeWrapper) iframeWrapper.style.display = 'none';
                  if (link) link.style.display = 'block';

                  if (img && ad.desktop) {
                    img.src = ad.desktop;
                    img.alt = ad.alt || 'Advertisement';
                  }
                  if (source && ad.mobile) {
                    source.srcset = ad.mobile;
                  }
                }

                // Update dimensions
                if (container && (ad.desktopDimensions || ad.mobileDimensions)) {
                  const parseDim = (dim) => {
                    const parts = (dim || '').replace(/\\\\s+/g, '').replace('x', '*').split('*').map(Number);
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

          if (typeof window.applyDonorAdSuppression === 'function') {
            window.applyDonorAdSuppression();
          }
        }

        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', refreshAds);
        } else {
          refreshAds();
        }
        window.addEventListener('resize', refreshAds);
        setInterval(refreshAds, 60000);
  `;
};
