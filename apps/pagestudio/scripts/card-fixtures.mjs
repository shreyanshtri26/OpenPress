// Shared by check-card-layout.mjs (published page) and check-puck-canvas.mjs (the Puck editor canvas): the same stories, the same
// page layout, and the same measurements, so the two can be compared line by line.

const LONG = 'An unusually long headline that keeps going well past the width of any sensible card so wrapping and clamping can be checked'

// Stories as the API returns them: some with long headlines, some with no image, some with no summary.
export const apiRows = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1
  const [w, h] = [[1600, 900], [1200, 900], [900, 1200], [1000, 1000]][i % 4]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='hsl(${n * 24},45%,35%)'/></svg>`
  return {
    storyId: `s${n}`,
    title: n % 5 === 0 ? LONG : `Story number ${n} with a headline of ordinary length`,
    section: ['News', 'Business', 'Sports', 'Technology'][i % 4],
    status: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
    storySummary: n % 4 === 0 ? '' : `Summary of story ${n}, long enough to take a couple of lines in a card.`,
    image: n % 7 === 0 ? '' : 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
    redirectUrl: `/story-${n}`,
    authorName: 'Jane Reporter',
  }
})

const card = (type, id, n, extra = {}) => ({ type, props: { id, storyId: `s${n}`, ...extra } })
const zone = (grid, name, blocks) => [`${grid}:${name}`, blocks]

// Every layout grid, then every card placed straight on the page.
export const blocks = [
  { type: 'AtlanticNavbar', props: { id: 'nav' } },
  { type: 'HeroGrid', props: { id: 'hero-grid', mode: 'manual' } },
  { type: 'Heading', props: { id: 'latest-h', text: 'Latest', align: 'left', level: '2', size: 'm' } },
  { type: 'ThumbnailGrid', props: { id: 'thumbnail-grid', mode: 'manual' } },
  { type: 'PopularGrid', props: { id: 'popular-grid', mode: 'manual' } },
  { type: 'MultimediaGrid', props: { id: 'multimedia-grid', mode: 'manual' } },
  { type: 'AllStoriesGrid', props: { id: 'all-stories-grid', mode: 'manual' } },
  { type: 'AdvertisementGrid', props: { id: 'ad-grid', heading: 'Advertisement', infoLabel: 'About ads' } },
  ...[
    ['ShowcaseCard', { items: [{ storyId: 's3' }, { storyId: 's4' }, { storyId: 's5' }] }],
    ['HoverCard', { items: [{ storyId: 's6' }, { storyId: 's8' }] }],
    ['FeaturedCard', { items: [{ storyId: 's9' }, { storyId: 's10' }] }],
    ['StoryCard', { storyId: 's11' }],
    ['MainCard', { storyId: 's12' }],
    ['RecommendCard', { storyId: 's13' }],
    ['MultimediaCard', { storyId: 's14' }],
    ['StorySubCard', { storyId: 's15' }],
    ['SidebarStoryCard', { storyId: 's1' }],
    ['MostPopularTable', { items: Array.from({ length: 6 }, (_, i) => ({ number: i + 1, text: '', storyId: `s${i + 1}` })) }],
  ].map(([type, props]) => ({ type, props: { id: `root-${type}`, ...props } })),
  { type: 'Footer', props: { id: 'foot' } },
]

export const zones = Object.fromEntries([
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

// The measurements, as the source of a function run inside the page: measure(doc, W) -> [{ ok, name, msg? }].
// `doc` is the document being measured (the page itself, or the Puck canvas iframe) and W its layout width.
export const MEASURE = `function measure(doc, W, editor) {
  var win = doc.defaultView;
  var out = [];
  var fail = function (name, msg) { out.push({ ok: false, name: name, msg: msg }); };
  var pass = function (name) { out.push({ ok: true, name: name }); };
  var skip = '.op-menu, [hidden], .hidden, [data-puck-overlay], [class*="DraggableComponent-overlay"], [class*="DropZone-"][class*="placeholder"]';
  var visible = function (el) { var r = el.getBoundingClientRect(); var s = win.getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest(skip); };
  var rect = function (sel) { var el = doc.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
  var top = function (r) { return r.top + win.scrollY; };
  var bottom = function (r) { return r.bottom + win.scrollY; };
  var scrollW = doc.documentElement.scrollWidth;

  scrollW > W + 1 ? fail('no horizontal scroll', 'content is ' + scrollW + 'px wide in a ' + W + 'px viewport') : pass('no horizontal scroll');

  var outside = [];
  doc.querySelectorAll('body *').forEach(function (el) {
    if (!visible(el) || el.closest('header, footer')) return;
    var r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) outside.push((el.id || el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
  });
  outside.length ? fail('nothing outside the viewport', outside.slice(0, 5).join('; ')) : pass('nothing outside the viewport');

  var broken = [];
  doc.querySelectorAll('img').forEach(function (img) { if (visible(img) && (!img.complete || img.naturalWidth === 0)) broken.push((img.getAttribute('src') || '(empty)').slice(0, 60)); });
  broken.length ? fail('every visible image loaded', broken.length + ' broken: ' + broken.slice(0, 3).join(', ')) : pass('every visible image loaded');

  var clipped = [];
  doc.querySelectorAll('h1, h2, h3').forEach(function (h) { if (visible(h) && h.scrollWidth > h.clientWidth + 1 && !h.closest('header')) clipped.push(h.textContent.trim().slice(0, 40)); });
  clipped.length ? fail('no headline spills out of its box', clipped.slice(0, 3).join(' | ')) : pass('no headline spills out of its box');

  var placeholder = /Headline goes here|short summary of the story appears here|No description available|Lorem ipsum|No story selected|via\\.placeholder|Top story \\d/i;
  var leaked = [];
  doc.querySelectorAll('h1, h2, h3, p, a, span').forEach(function (el) { if (visible(el) && el.children.length === 0 && placeholder.test(el.textContent)) leaked.push(el.textContent.trim().slice(0, 40)); });
  leaked.length ? fail('no placeholder text on the page', leaked.slice(0, 3).join(' | ')) : pass('no placeholder text on the page');

  if (W >= 1024) {
    var cols = [].slice.call(doc.querySelectorAll('#hero-grid .grid > div')).filter(function (el) { return el.getBoundingClientRect().height > 0; }).map(function (el) { return el.getBoundingClientRect(); });
    if (cols.length === 3) {
      var side = Math.max(bottom(cols[0]), bottom(cols[2]));
      var content = doc.querySelector('#hero-grid .grid > div:nth-child(2)');
      var lastEl = content && content.querySelector('p:last-of-type, h2:last-of-type, a:last-child');
      var gap = Math.abs(side - bottom(cols[1]));
      gap <= 8 ? pass('hero: centre story reaches the bottom of the side columns') : fail('hero: centre story reaches the bottom of the side columns', 'centre ends ' + Math.round(gap) + 'px away from the side columns');
    } else { fail('hero: three columns', 'found ' + cols.length); }
    var flexKids = [].slice.call(doc.querySelectorAll('#all-stories-grid .op-container > .flex > div'));
    if (flexKids.length === 2) { var d = Math.abs(bottom(flexKids[0].getBoundingClientRect()) - bottom(flexKids[1].getBoundingClientRect())); d <= 8 ? pass('all stories: lead matches the right stack') : fail('all stories: lead matches the right stack', 'differ by ' + Math.round(d) + 'px'); }
    else { fail('all stories: two columns', 'found ' + flexKids.length); }
    var imgs = [].slice.call(doc.querySelectorAll('#thumbnail-grid .grid > div img')).filter(visible).map(function (i) { return i.getBoundingClientRect(); });
    if (imgs.length >= 2) {
      var tops = imgs.map(top), heights = imgs.map(function (r) { return r.height; });
      var spread = function (a) { return Math.max.apply(0, a) - Math.min.apply(0, a); };
      spread(tops) <= 2 && spread(heights) <= 2 ? pass('latest: cards share a top edge and an image height') : fail('latest: cards share a top edge and an image height', 'tops differ ' + Math.round(spread(tops)) + 'px, heights differ ' + Math.round(spread(heights)) + 'px');
    } else { fail('latest: four cards', 'found ' + imgs.length + ' images'); }
    var pop = editor ? null : rect('#popular-grid .mp-list'), boxEl = doc.querySelector('#popular-grid .op-container');
    if (pop && boxEl) { var cs = win.getComputedStyle(boxEl); var inner = boxEl.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); var short = inner - pop.width; short <= 8 ? pass('ranked list fills the page container') : fail('ranked list fills the page container', 'list is ' + Math.round(short) + 'px narrower than the container'); }
    else if (!editor) { fail('ranked list', 'table or container not found'); }
    var mm = editor ? null : rect('#multimedia-grid .op-container'), mmCard = rect('#multimedia-grid .grid > div');
    if (mm && mmCard) { var narrow = mm.width - mmCard.width; narrow <= 80 ? pass('multimedia: lead takes the whole row') : fail('multimedia: lead takes the whole row', 'card is ' + Math.round(narrow) + 'px narrower than its row'); }
  }
  return out;
}`
