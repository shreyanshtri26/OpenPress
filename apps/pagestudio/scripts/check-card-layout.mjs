// Alignment check for every card and grid, in a real browser.
//
//   npm run build:publish-renderer && node scripts/check-card-layout.mjs [--keep]
//
// Renders a page with every layout grid (hero, latest, ranked list, multimedia, all stories, advertisement grid) and every card
// placed straight on the page, with stories that have long headlines and no image, then loads it in headless Edge/Chrome at
// 1440, 1024, 768 and 390 px wide and measures what a reader would see:
//   - nothing pokes outside the viewport, no horizontal scrollbar
//   - every visible image loaded (no broken or empty pictures)
//   - no headline spills out of its box
//   - hero: the centre story reaches the bottom of the side columns; all stories: the lead matches the right stack
//   - latest: the four cards share a top edge and an image height
//   - ranked list: fills the page container when there is no ad rail
// Exits 1 when a check fails. Set CHROME_PATH to use a specific browser. --keep leaves the generated pages in .card-check/.
// (The pages are served from a throwaway local web server; nothing leaves the machine.)
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const here = import.meta.dirname
const bundle = path.resolve(here, '../dist/publish-renderer.js')
if (!existsSync(bundle)) throw new Error('Build the renderer first: npm run build:publish-renderer')
const { renderHomePage, buildStoriesById } = await import(pathToFileURL(bundle).href)

// ---- the browser
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const browser = candidates.find((p) => existsSync(p))
if (!browser) throw new Error('No Edge or Chrome found. Set CHROME_PATH.')

// ---- the page
const LONG = 'An unusually long headline that keeps going well past the width of any sensible card so wrapping and clamping can be checked'
const rows = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1
  const [w, h] = [[1600, 900], [1200, 900], [900, 1200], [1000, 1000]][i % 4]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='hsl(${n * 24},45%,35%)'/></svg>`
  return {
    storyId: `s${n}`,
    title: n % 5 === 0 ? LONG : `Story number ${n} with a headline of ordinary length`,
    section: ['News', 'Business', 'Sports', 'Technology'][i % 4],
    storySummary: n % 4 === 0 ? '' : `Summary of story ${n}, long enough to take a couple of lines in a card.`,
    image: n % 7 === 0 ? '' : 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
    redirectUrl: `/story-${n}`,
    authorName: 'Jane Reporter',
  }
})
const storiesById = buildStoriesById(rows)
const card = (type, id, n, extra = {}) => ({ type, props: { id, storyId: `s${n}`, ...extra } })
const zone = (grid, name, blocks) => [`${grid}:${name}`, blocks]
const blocks = [
  { type: 'AtlanticNavbar', props: { id: 'nav' } },
  { type: 'HeroGrid', props: { id: 'hero-grid', mode: 'manual' } },
  { type: 'Heading', props: { id: 'latest-h', text: 'Latest', align: 'left', level: '2', size: 'm' } },
  { type: 'ThumbnailGrid', props: { id: 'thumbnail-grid', mode: 'manual' } },
  { type: 'PopularGrid', props: { id: 'popular-grid', mode: 'manual' } },
  { type: 'MultimediaGrid', props: { id: 'multimedia-grid', mode: 'manual' } },
  { type: 'AllStoriesGrid', props: { id: 'all-stories-grid', mode: 'manual' } },
  { type: 'AdvertisementGrid', props: { id: 'ad-grid', heading: 'Advertisement', infoLabel: 'About ads' } },
  ...[['ShowcaseCard', { items: [{ storyId: 's3' }, { storyId: 's4' }, { storyId: 's5' }] }], ['HoverCard', { items: [{ storyId: 's6' }, { storyId: 's8' }] }], ['FeaturedCard', { items: [{ storyId: 's9' }, { storyId: 's10' }] }], ['StoryCard', { storyId: 's11' }], ['MainCard', { storyId: 's12' }], ['RecommendCard', { storyId: 's13' }], ['MultimediaCard', { storyId: 's14' }], ['StorySubCard', { storyId: 's15' }], ['SidebarStoryCard', { storyId: 's1' }], ['MostPopularTable', { items: Array.from({ length: 6 }, (_, i) => ({ number: i + 1, text: '', storyId: `s${i + 1}` })) }]].map(([type, props]) => ({ type, props: { id: `root-${type}`, ...props } })),
  { type: 'Footer', props: { id: 'foot' } },
]
const zones = Object.fromEntries([
  zone('hero-grid', 'hero-grid-left-0', [card('StoryCard', 'h-l0', 2)]),
  zone('hero-grid', 'hero-grid-left-1', [card('StoryCard', 'h-l1', 3)]),
  zone('hero-grid', 'hero-grid-center-0', [card('MainCard', 'h-c', 1)]),
  zone('hero-grid', 'hero-grid-right-0', [card('StoryCard', 'h-r0', 4)]),
  zone('hero-grid', 'hero-grid-right-1', [card('StoryCard', 'h-r1', 5)]),
  ...[6, 7, 8, 9].map((n, i) => zone('thumbnail-grid', `thumbnail-grid-box-${i}`, [card('StoryCard', `t${i}`, n)])),
  zone('popular-grid', 'popular-grid-left', [{ type: 'MostPopularTable', props: { id: 'pop', items: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, text: '', storyId: `s${i + 1}` })) } }]),
  zone('multimedia-grid', 'multimedia-grid-left', [card('StoryCard', 'mm', 10)]),
  zone('all-stories-grid', 'all-stories-grid-left', [card('MainCard', 'a-l', 11)]),
  zone('all-stories-grid', 'all-stories-grid-right-top-1', [card('StoryCard', 'a-r1', 12)]),
  zone('all-stories-grid', 'all-stories-grid-right-top-2', [card('StoryCard', 'a-r2', 13)]),
  zone('all-stories-grid', 'all-stories-grid-right-top-3', [card('StoryCard', 'a-r3', 14)]),
  zone('ad-grid', 'advertisement-grid-items', ['coastal-bedroom-set', 'sunlit-workspace-desk', 'heritage-wooden-bed', 'adjustable-standing-desk'].map((productId, i) => ({ type: 'AdCard', props: { id: `ad${i}`, productId } }))),
])
const { html } = renderHomePage({ content: blocks, zones, root: { props: { title: 'Card check' } } }, { storiesById, sections: ['News', 'Business', 'Sports'], campaigns: [] })

// ---- what is measured, run inside the page
const MEASURE = `
(function () {
  var out = [];
  var fail = function (name, msg) { out.push({ ok: false, name: name, msg: msg }); };
  var pass = function (name) { out.push({ ok: true, name: name }); };
  var W = window.innerWidth;
  var visible = function (el) { var r = el.getBoundingClientRect(); var s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.op-menu, [hidden], .hidden'); };
  var rect = function (sel) { var el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
  var top = function (r) { return r.top + window.scrollY; };
  var bottom = function (r) { return r.bottom + window.scrollY; };

  document.documentElement.scrollWidth > W + 1 ? fail('no horizontal scroll', 'page is ' + document.documentElement.scrollWidth + 'px wide in a ' + W + 'px viewport') : pass('no horizontal scroll');

  var outside = [];
  document.querySelectorAll('body *').forEach(function (el) {
    if (!visible(el) || el.closest('header, footer')) return;
    var r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) outside.push((el.id || el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
  });
  outside.length ? fail('nothing outside the viewport', outside.slice(0, 5).join('; ')) : pass('nothing outside the viewport');

  var broken = [];
  document.querySelectorAll('img').forEach(function (img) { if (visible(img) && (!img.complete || img.naturalWidth === 0)) broken.push((img.getAttribute('src') || '(empty)').slice(0, 60)); });
  broken.length ? fail('every visible image loaded', broken.length + ' broken: ' + broken.slice(0, 3).join(', ')) : pass('every visible image loaded');

  var clipped = [];
  document.querySelectorAll('h1, h2, h3').forEach(function (h) { if (visible(h) && h.scrollWidth > h.clientWidth + 1 && !h.closest('header')) clipped.push(h.textContent.trim().slice(0, 40)); });
  clipped.length ? fail('no headline spills out of its box', clipped.slice(0, 3).join(' | ')) : pass('no headline spills out of its box');

  var wide = W >= 1024;
  if (wide) {
    var hero = ['#hero-grid .lg\\\\:col-span-3:first-child', '#hero-grid .lg\\\\:col-span-6', '#hero-grid .lg\\\\:col-span-3:last-child'].map(rect);
    if (hero.every(Boolean)) {
      var side = Math.max(bottom(hero[0]), bottom(hero[2]));
      var gap = Math.abs(side - bottom(hero[1]));
      gap <= 8 ? pass('hero: centre story reaches the bottom of the side columns') : fail('hero: centre story reaches the bottom of the side columns', 'centre ends ' + Math.round(gap) + 'px away from the side columns');
    }
    var all = rect('#all-stories-grid .flex > :first-child'), right = rect('#all-stories-grid .flex > :last-child');
    if (all && right) { var d = Math.abs(bottom(all) - bottom(right)); d <= 8 ? pass('all stories: lead matches the right stack') : fail('all stories: lead matches the right stack', 'differ by ' + Math.round(d) + 'px'); }
    var imgs = [].slice.call(document.querySelectorAll('#thumbnail-grid .grid > div img')).filter(visible).map(function (i) { return i.getBoundingClientRect(); });
    if (imgs.length >= 2) {
      var tops = imgs.map(top), heights = imgs.map(function (r) { return r.height; });
      var sameTop = Math.max.apply(0, tops) - Math.min.apply(0, tops) <= 2;
      var sameHeight = Math.max.apply(0, heights) - Math.min.apply(0, heights) <= 2;
      sameTop && sameHeight ? pass('latest: cards share a top edge and an image height') : fail('latest: cards share a top edge and an image height', 'tops differ ' + Math.round(Math.max.apply(0, tops) - Math.min.apply(0, tops)) + 'px, heights differ ' + Math.round(Math.max.apply(0, heights) - Math.min.apply(0, heights)) + 'px');
    }
    var pop = rect('#popular-grid table'), boxEl = document.querySelector('#popular-grid .op-container');
    if (pop && boxEl) { var cs = getComputedStyle(boxEl); var inner = boxEl.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); var short = inner - pop.width; short <= 8 ? pass('ranked list fills the page container') : fail('ranked list fills the page container', 'list is ' + Math.round(short) + 'px narrower than the container'); }
  }
  parent.postMessage({ cardcheck: out }, '*');
})();
`

// ---- run it
const dir = path.resolve(here, '../.card-check')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'page.html'), html.replace('</body>', `<script>window.addEventListener('load', function () { setTimeout(function () {${MEASURE}}, 400) })</script></body>`))

// Serve the generated pages plus the site's own public files, so root-absolute images (/openpress-share.png ...) load as they do live.
const publicDir = path.resolve(here, '../public')
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' }
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '')
  const file = [path.join(dir, name), path.join(publicDir, name)].find((f) => existsSync(f) && statSync(f).isFile())
  if (!file) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const run = (args) => new Promise((resolve, reject) => execFile(browser, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => (stdout ? resolve(stdout) : reject(error))))

let failures = 0
for (const width of [1440, 1024, 768, 390]) {
  const wrapper = `<!doctype html><body style="margin:0"><iframe src="page.html" style="border:0;width:${width}px;height:7000px"></iframe><pre id="out"></pre><script>addEventListener('message', function (e) { if (e.data && e.data.cardcheck) document.getElementById('out').textContent = JSON.stringify(e.data.cardcheck) })</script></body>`
  writeFileSync(path.join(dir, `wrap-${width}.html`), wrapper)
  const dom = await run(['--headless', '--disable-gpu', '--virtual-time-budget=9000', `--window-size=${Math.max(width + 40, 540)},1000`, '--dump-dom', `${origin}/wrap-${width}.html`])
  const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  if (!json) { console.log(`\n${width}px  no result from the browser`); failures++; continue }
  const results = JSON.parse(json)
  console.log(`\n${width}px`)
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : `: ${r.msg}`}`)
    if (!r.ok) failures++
  }
}
server.close()
if (!process.argv.includes('--keep')) rmSync(dir, { recursive: true, force: true })
console.log(failures ? `\n${failures} check(s) failed` : '\nall card layout checks passed')
process.exit(failures ? 1 : 0)
