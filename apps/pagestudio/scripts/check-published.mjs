// Renders a Home page through the real publish bundle and checks the HTML.
// Run after `npm run build:publish-renderer`: node scripts/check-published.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const bundle = path.resolve(import.meta.dirname, '../dist/publish-renderer.js');
const { renderHomePage } = await import(pathToFileURL(bundle).href);

const data = { content: [{ type: 'AtlanticNavbar', props: { id: 'nav' } }, { type: 'Footer', props: { id: 'foot' } }, { type: 'ThumbnailGrid', props: { id: 'tg' } }], zones: { 'tg:thumbnail-grid-box-0': [{ type: 'StoryCard', props: { id: 'c0' } }] } };
const { html } = renderHomePage(data, { storiesById: {}, sections: ['HOME'], campaigns: [] });

// Markup only: comments, <script> and <style> bodies often mention tag names in prose.
const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/(script|style)>/g, '');
const count = (re) => (markup.match(re) || []).length;
const style = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('\n');

assert.equal(count(/<header[\s>]/g), 1, 'exactly one <header>');
assert.equal(count(/<footer[\s>]/g), 1, 'exactly one <footer>');
assert.match(html, /name="viewport"/, 'viewport meta');
assert.doesNotMatch(markup, /\bundefined\b|\[object Object\]|NaN(?![a-z])/, 'no leaked undefined/[object Object]/NaN');
assert.equal(count(/<div[\s>]/g), count(/<\/div>/g), 'balanced <div> tags');
// Every local image the page references must be a file the site actually ships (a missing default shows as a broken image).
const publicDir = path.resolve(import.meta.dirname, '../public');
for (const [, src] of markup.matchAll(/<img[^>]+src="(\/[^"]+)"/g)) {
  assert.ok(existsSync(path.join(publicDir, src)), `local image ${src} is not in pagestudio/public`);
}
// Dark theme: logos must be recoloured on both the media query and class-based dark modes.
assert.match(style, /prefers-color-scheme:\s*dark/, 'dark-mode media query in inlined CSS');
assert.match(style, /footer-logo-mark/, 'footer logo covered by dark rule');
assert.match(style, /navbar-logo-mark/, 'navbar logo covered by dark rule');
console.log(`published HTML ok (${html.length} bytes)`);
// The page background comes from the --op-bg token (light/dark); a hard-coded white body background would override dark mode.
assert.equal((style.match(/body\s*\{[^}]*background:\s*#fff/g) || []).length, 0, 'no hard-coded white body background');
assert.match(style, /body\s*\{[^}]*background:\s*var\(--op-bg\)/, 'body background uses --op-bg');
assert.match(html, /name="color-scheme" content="light dark"/, 'color-scheme meta so the browser follows the system theme');
assert.doesNotMatch(markup, /<body[^>]*background/, 'no inline body background');
// Every block shares one container: no stray per-block gutters (lg:px-16 / max-w-7xl) that misalign edges.
assert.doesNotMatch(markup, /lg:px-16|max-w-7xl|lg:w-\[84%\]|class="[^"]*px-16/, 'blocks use .op-container, not their own gutters');
console.log('theme + container ok');

// Every campaign ad placed in the editor must come out of the real publish renderer carrying its creative.
const live = { campaignId: 'c1', campaignName: 'Live', advertiserName: 'Acme', status: 'start_now', landingPageURL: 'https://acme.test',
  placements: ['Leaderboard', 'Sidebar', 'In-Story'],
  creatives: { Leaderboard: { desktop: 'https://cdn.test/lb-d.png', mobile: 'https://cdn.test/lb-m.png' }, Sidebar: { desktop: 'https://cdn.test/sb-d.png', mobile: 'https://cdn.test/sb-m.png' }, 'In-Story': { desktop: 'https://cdn.test/is-d.png', mobile: 'https://cdn.test/is-m.png' } },
  jobs: [{ placement: 'Leaderboard' }, { placement: 'Sidebar' }, { placement: 'In-Story' },
    { jobId: 'p1', adFormat: 'popup', popupDesktopImage: 'https://cdn.test/pop-d.png', popupMobileImage: 'https://cdn.test/pop-m.png' }] };
const dead = (status) => ({ ...live, campaignId: 'dead', status, creatives: { Leaderboard: { desktop: 'https://cdn.test/DEAD.png' } }, jobs: [{ adFormat: 'popup', popupDesktopImage: 'https://cdn.test/DEAD-pop.png' }] });
const page = (blocks) => ({ content: [{ type: 'AtlanticNavbar', props: { id: 'nav' } }, ...blocks, { type: 'Footer', props: { id: 'foot' } }] });
const adBlocks = [
  { type: 'LeaderboardAd', props: { id: 'lb', adId: 'auto' } },
  { type: 'SidebarAd', props: { id: 'sb', adId: 'auto' } },
  { type: 'InStoryAd', props: { id: 'is', adId: 'c1-In-Story' } },
  { type: 'PopupAd', props: { id: 'pop', adId: 'auto' } },
];
const ads = renderHomePage(page(adBlocks), { storiesById: {}, sections: ['HOME'], campaigns: [live] }).html;
for (const url of ['lb-d.png', 'sb-d.png', 'is-d.png', 'pop-d.png']) assert.ok(ads.includes(url), `placed ad creative ${url} is published`);
assert.doesNotMatch(ads, /unknown component/, 'every placed block has a renderer');
assert.equal((ads.match(/class="popup-ad-card"/g) || []).length, 1, 'a page with a PopupAd block gets one popup, not an automatic second one');
// Without the block the live popup is still added automatically, exactly once.
const auto = renderHomePage(page([]), { storiesById: {}, sections: ['HOME'], campaigns: [live] }).html;
assert.equal((auto.match(/class="popup-ad-card"/g) || []).length, 1, 'automatic popup on a page without the block');
// Campaigns that are not serving never reach the page.
for (const status of ['rejected', 'expired', 'ready_to_publish', 'paused', 'draft']) {
  const out = renderHomePage(page(adBlocks), { storiesById: {}, sections: ['HOME'], campaigns: [dead(status)] }).html;
  assert.doesNotMatch(out, /DEAD/, `${status} campaign must not serve`);
}
console.log('campaign ads ok');

// Every fixed page shell: same head contract (icons that exist, theme-aware colour) and no hard-coded white body.
const { renderFlatPage } = await import(pathToFileURL(bundle).href);
const flatCtx = { storiesById: {}, sections: ['HOME'], campaigns: [live] };
for (const [type, blocks] of [['About', [{ type: 'AboutUs', props: { id: 'a' } }]], ['ContactUs', [{ type: 'ContactUs', props: { id: 'c' } }]], ['Error', [{ type: 'ErrorCard', props: { id: 'e' } }]], ['PrivacyPolicy', [{ type: 'PrivacyPolicy', props: { id: 'p' } }]], ['MediaCouncil', [{ type: 'MediaCouncil', props: { id: 'm' } }]]]) {
  const out = renderFlatPage(type, page(blocks), flatCtx).html;
  assert.match(out, /name="color-scheme" content="light dark"/, `${type}: color-scheme meta`);
  assert.match(out, /theme-color"[^>]*prefers-color-scheme: dark/, `${type}: dark theme-color`);
  assert.doesNotMatch(out, /site\.webmanifest|favicon\.svg|favicon-96x96/, `${type}: links only files the site serves`);
  assert.doesNotMatch(out, /<body[^>]*class="[^"]*bg-white/, `${type}: body must not force white`);
  const shown = out.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/(script|style)>/g, '');
  assert.doesNotMatch(out, /unknown component/, `${type}: block has a renderer`);
  assert.doesNotMatch(shown, /\bundefined\b|\[object Object\]/, `${type}: no leaked undefined`);
}
console.log('page shells ok');
