// Analytics tags for published pages. Nothing is emitted unless configured, so pages never report
// to someone else's account:
//   VITE_GA_MEASUREMENT_ID   Google Analytics 4 (free), e.g. G-XXXXXXX
// Plus our own first-party tracker (no cookies, honours Do Not Track): it reports to VITE_BACKEND_API
// /analytics/collect, which feeds the admin /analytics dashboard.
const env = ((import.meta as any).env || {}) as Record<string, string | undefined>;

// Escaped for a <script> block: the API address is the only dynamic part.
const TRACKER = String.raw`(function () {
  try {
    var API = '__API__';
    if (!API || location.protocol === 'file:' || navigator.doNotTrack === '1') return;
    var rid = function () { return (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); };
    var get = function (store, k) { try { var v = store.getItem(k); if (!v) { v = rid(); store.setItem(k, v); } return v; } catch (e) { return rid(); } };
    var userId = get(localStorage, 'op_uid'), sessionId = get(sessionStorage, 'op_sid');
    var start = Date.now(), maxDepth = 0, exited = false;
    var category = function () {
      var m = document.querySelector('meta[property="article:section"]');
      var s = (m && m.content) || window.currentActiveSection || '';
      return s ? s.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
    };
    var send = function (type, extra) {
      var body = JSON.stringify(Object.assign({ type: type, userId: userId, sessionId: sessionId, pageId: location.pathname, title: document.title, category: category(), referrer: document.referrer, language: navigator.language }, extra));
      var url = API.replace(/\/$/, '') + '/analytics/collect';
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' })))) fetch(url, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    };
    document.addEventListener('DOMContentLoaded', function () { send('page_view'); });
    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0) maxDepth = Math.max(maxDepth, Math.min(100, Math.round((scrollY / h) * 100)));
      else maxDepth = 100;
    }, { passive: true });
    var exit = function () { if (exited) return; exited = true; send('page_exit', { durationMs: Date.now() - start, depth: maxDepth || (document.documentElement.scrollHeight <= innerHeight ? 100 : 0) }); };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') exit(); });
    window.addEventListener('pagehide', exit);
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest && e.target.closest('[data-share-facebook],[data-share-twitter],[data-share-linkedin],[data-share-whatsapp]');
      if (!el) return;
      var platform = ['facebook', 'twitter', 'linkedin', 'whatsapp'].filter(function (p) { return el.hasAttribute('data-share-' + p); })[0];
      send('share_button_click', { platform: platform });
    });
  } catch (e) { /* analytics must never break a page */ }
})();`;

const SECTION_COLORS = String.raw`(function () {
  try {
    var API = '__API__';
    if (!API) return;
    var apply = function (colors) {
      var map = {}; Object.keys(colors || {}).forEach(function (k) { map[k.trim().toLowerCase()] = colors[k]; });
      document.querySelectorAll('[class*="border-[0.5px]"].uppercase, span.font-share.border.uppercase, p.font-share.uppercase, div.font-share.uppercase, .nav-btn').forEach(function (el) {
        var c = map[(el.getAttribute('data-section') || el.textContent || '').trim().toLowerCase()];
        if (!c) return;
        el.style.setProperty('--chip', c);
        if (el.classList.contains('nav-btn')) el.style.setProperty('--pill', c);
      });
    };
    document.addEventListener('DOMContentLoaded', function () {
      var cached; try { cached = JSON.parse(sessionStorage.getItem('op_colors') || 'null'); } catch (e) {}
      if (cached && Date.now() - cached.t < 300000) apply(cached.c);
      fetch(API.replace(/\/$/, '') + '/taxonomy/colors').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || !j.colors) return;
        try { sessionStorage.setItem('op_colors', JSON.stringify({ t: Date.now(), c: j.colors })); } catch (e) {}
        apply(j.colors);
      }).catch(function () {});
    });
  } catch (e) { /* colours are decoration: never break a page */ }
})();`;

const SAFE_ID = /^[A-Za-z0-9:_-]+$/;

export function analyticsTags(): string {
  const tags: string[] = [];
  const api = env.VITE_BACKEND_API;
  if (api && /^https?:\/\/[^\s'"<>]+$/.test(api)) tags.push(`<script>${TRACKER.replace('__API__', api)}</script>`);
  if (api && /^https?:\/\/[^\s'"<>]+$/.test(api)) tags.push(`<script>${SECTION_COLORS.replace('__API__', api)}</script>`);
  const ga = env.VITE_GA_MEASUREMENT_ID;
  if (ga && SAFE_ID.test(ga)) {
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); } gtag('js', new Date()); gtag('config', '${ga}');</script>`);
  }
  return tags.join('\n  ');
}
