export const getDonorAdSuppressionScript = (apiBase: string = '') => {
  return `
    <script>
      (function () {
        if (window.__donorAdSuppressionInitialized) return;
        window.__donorAdSuppressionInitialized = true;

        var __API_BASE__ = '${apiBase}';

        function safeParse(raw) {
          if (!raw) return null;
          try { return JSON.parse(raw); } catch { return null; }
        }

        function getUser() {
          return (
            safeParse(localStorage.getItem('auth_user')) ||
            safeParse(localStorage.getItem('website_user')) ||
            safeParse(localStorage.getItem('user'))
          );
        }

        function isDonor(u) {
          if (!u || typeof u !== 'object') return false;
          return Boolean(
            u.isDonor === true ||
            u.suppressCampaigns === true ||
            u.adFree === true ||
            Number(u.donationCount || 0) > 0 ||
            Number(u.donationTotalAmount || 0) > 0 ||
            Number(u.lastDonationAmount || 0) > 0
          );
        }

        function hasRealFallback(block) {
          const fallback = block.querySelector('.fallback-container');
          if (!fallback) return false;
          const html = (fallback.innerHTML || '').replace(/<!--([\\s\\S]*?)-->/g, '').replace(/\\s+/g, '');
          return html.length > 0;
        }

        function isLeaderboardPlacement(block) {
          const blockName = (block.getAttribute('data-ad-block') || '').toLowerCase();
          if (blockName.includes('leaderboard')) return true;

          const propsRaw = block.getAttribute('data-ad-props');
          if (!propsRaw) return false;
          try {
            const props = JSON.parse(propsRaw.replace(/&apos;/g, "'"));
            const placement = String(props?.placementName || '').toLowerCase();
            return placement.includes('leaderboard');
          } catch {
            return false;
          }
        }

        function ensureStyleTag() {
          if (document.getElementById('donor-ad-suppression-style')) return;
          const style = document.createElement('style');
          style.id = 'donor-ad-suppression-style';
          style.textContent = [
            '.ad-block-wrapper[data-donor-hide-ad="true"] .ad-container{display:none !important;}',
            '.ad-block-wrapper[data-donor-hide-ad="true"] .fallback-container{display:block !important;}',
            '.ad-block-wrapper[data-donor-hide-wrapper="true"]{display:none !important;}',
            '.instory-ad[data-donor-hide-instory="true"]{display:none !important;}',
            '#instory-ad[data-donor-hide-instory="true"]{display:none !important;}',
            '#leaderboard-ad[data-donor-hide-instory="true"]{display:none !important;}',
            '#sidebar-ad[data-donor-hide-instory="true"]{display:none !important;}'
          ].join('');
          document.head.appendChild(style);
        }

        function applySuppression() {
          const donor = isDonor(getUser());
          const blocks = document.querySelectorAll('.ad-block-wrapper[data-ad-block], .ad-block-wrapper[data-ad-type], [data-ad-block]');
          const inStoryAds = document.querySelectorAll('.instory-ad, #instory-ad, #leaderboard-ad, #sidebar-ad');

          if (!donor) {
            blocks.forEach(function (block) {
              block.removeAttribute('data-donor-hide-ad');
              block.removeAttribute('data-donor-hide-wrapper');
            });
            inStoryAds.forEach(function (ad) {
              ad.removeAttribute('data-donor-hide-instory');
            });
            return;
          }

          ensureStyleTag();

          blocks.forEach(function (block) {
            block.setAttribute('data-donor-hide-ad', 'true');
            if (!hasRealFallback(block)) {
              block.setAttribute('data-donor-hide-wrapper', 'true');
            } else {
              block.removeAttribute('data-donor-hide-wrapper');
            }
          });

          inStoryAds.forEach(function (ad) {
            ad.setAttribute('data-donor-hide-instory', 'true');
          });
        }

        // Fetch fresh profile from API and update localStorage, then re-apply suppression.
        // Called when localStorage says user is not a donor but they ARE logged in —
        // this handles stale localStorage (e.g. user paid AFTER their last SSO login).
        function fetchAndApplyProfile() {
          var token = localStorage.getItem('website_token');
          if (!token) return;
          var base = __API_BASE__ || window.__openPress_API__ || '';
          if (!base) return;
          fetch(base + '/api/audience/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
          })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) {
            if (!data || !data.user) return;
            var raw = JSON.stringify(data.user);
            localStorage.setItem('website_user', raw);
            localStorage.setItem('auth_user', raw);
            applySuppression();
          })
          .catch(function() {});
        }

        window.applyDonorAdSuppression = applySuppression;

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            applySuppression();
            // If user is logged in but not yet flagged as donor, do a fresh API check
            if (!isDonor(getUser()) && localStorage.getItem('website_token')) {
              fetchAndApplyProfile();
            }
          }, { once: true });
        } else {
          applySuppression();
          if (!isDonor(getUser()) && localStorage.getItem('website_token')) {
            fetchAndApplyProfile();
          }
        }

        setTimeout(applySuppression, 50);
        setTimeout(applySuppression, 500);

        window.addEventListener('storage', function (e) {
          if (!e || !e.key) return;
          if (e.key === 'auth_user' || e.key === 'website_user' || e.key === 'user') {
            applySuppression();
          }
        });

        if (typeof MutationObserver !== 'undefined') {
          const observer = new MutationObserver(function () { applySuppression(); });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }
      })();
    </script>
  `;
};