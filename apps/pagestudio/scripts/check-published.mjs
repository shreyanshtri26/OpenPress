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
// A renderer-level `body { background: #fff }` after the token CSS would override dark mode (seen on every page type once).
assert.equal((style.match(/body\s*\{[^}]*background:\s*#fff/g) || []).length, 1, 'only the token CSS may set the body background to white');
console.log('body background rule ok');
