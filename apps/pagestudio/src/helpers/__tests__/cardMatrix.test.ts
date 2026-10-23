import { describe, expect, it } from 'vitest'
import { ComponentRegistry } from '../registry/ComponentRegistry'
import { wrapRootBlock, rootProps } from '../core/wrapRootBlock'
import { buildStoriesById } from '../../publish/publishContext'

// Every story card and ad block, rendered through the real publish renderer with good data, bare data (no image / no summary),
// nothing selected, and stale editor placeholders saved in the page data. What must never reach a live page: editor stand-in
// text, empty or dead image addresses, "undefined", an empty box where a card has nothing to show.

const PLACEHOLDER = /Headline goes here|short summary of the story appears here|No description available|Lorem ipsum|No story selected|Please choose one|Top story \d|Recommended Story|Featured story|\bUntitled\b|via\.placeholder\.com|\bundefined\b|\[object Object\]|NaN(?![a-z])/i
const SECTIONS = ['News', 'Business', 'Sports']

const row = (n: number, good: boolean) => ({
  storyId: `s${n}`,
  title: good ? `Real headline ${n}` : `Bare headline ${n}`,
  section: SECTIONS[n % SECTIONS.length],
  storySummary: good ? `Real summary ${n}` : '',
  image: good ? `/img/${n}.png` : '',
  redirectUrl: `/story-${n}`,
  authorName: 'Jane Reporter',
  publishedAt: '2026-01-01T00:00:00.000Z',
})
const stories = (good: boolean) => buildStoriesById([1, 2, 3, 4, 5, 6].map((n) => row(n, good)))

/**
 * Renders blocks the way a page does: through the component registry, with the same root handling (page container for cards,
 * saved fallbacks ignored on top-level ads). Only the blocks themselves are returned, no navbar, menu or footer.
 */
const render = (blocks: any[], opts: { zones?: Record<string, any[]>; good?: boolean; campaigns?: any[] } = {}) => {
  const ctx: any = {
    zones: opts.zones ?? {},
    storiesById: stories(opts.good ?? true),
    sections: SECTIONS,
    activeSection: 'HOME',
    campaigns: opts.campaigns ?? [],
    extraRenderers: ComponentRegistry,
    pageType: 'Home',
  }
  return blocks
    .map(({ type, props = {} }) => wrapRootBlock(type, (ComponentRegistry as any)[type](rootProps(type, props), ctx)))
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
}

const imgSrcs = (html: string) => [...html.matchAll(/<img[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1])
const divBalance = (html: string) => (html.match(/<div[\s>]/g) || []).length - (html.match(/<\/div>/g) || []).length

// [type, props for a card showing story n]
const SINGLE: [string, (n: number) => any][] = [
  ['StoryCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['MainCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['RecommendCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['MultimediaCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['StorySubCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['SidebarStoryCard', (n) => ({ id: 'c', storyId: `s${n}` })],
]
const LISTS: [string, (n: number) => any][] = [
  ['ShowcaseCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['HoverCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['FeaturedCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['MostPopularTable', (n) => ({ id: 'c', items: [{ number: 1, text: 'Top story 1', storyId: `s${n}` }, { number: 2, text: 'Top story 2', storyId: `s${n + 1}` }] })],
]
const ALL_CARDS = [...SINGLE, ...LISTS]

describe.each(ALL_CARDS)('%s (published)', (type, propsFor) => {
  it('shows the real headline, links to the story and carries no placeholder', () => {
    const html = render([{ type, props: propsFor(1) }], { good: true })
    expect(html).toContain('Real headline 1')
    expect(html).toContain('href="/story-1"')
    expect(html).not.toMatch(PLACEHOLDER)
    expect(imgSrcs(html).every((src) => src.length > 0)).toBe(true)
    expect(divBalance(html)).toBe(0)
  })

  it('copes with a story that has no image and no summary', () => {
    const html = render([{ type, props: propsFor(2) }], { good: false })
    expect(html).toContain('Bare headline 2')
    expect(html).not.toMatch(PLACEHOLDER)
    expect(imgSrcs(html).every((src) => src.length > 0)).toBe(true)
    expect(divBalance(html)).toBe(0)
  })

  it('draws nothing visible when no story is chosen', () => {
    const empty = LISTS.some(([t]) => t === type)
      ? { id: 'c', items: [{ storyId: '', title: '', text: '', category: '' }] }
      : { id: 'c', storyId: '' }
    const html = render([{ type, props: empty }])
    expect(html).not.toMatch(PLACEHOLDER)
    expect(html).not.toMatch(/<img|<h2|<h3/)
  })

  it('ignores placeholder values saved into the page data earlier', () => {
    const stale = { ...propsFor(1), title: 'Headline goes here', description: 'No description available', imageUrl: 'https://via.placeholder.com/600x400', label: 'Category' }
    const html = render([{ type, props: stale }], { good: false })
    expect(html).not.toMatch(PLACEHOLDER)
    expect(imgSrcs(html).every((src) => src.length > 0 && !/via\.placeholder/.test(src))).toBe(true)
  })

  it('stays inside the page container when placed straight on the page', () => {
    const html = render([{ type, props: propsFor(1) }])
    expect(html).toMatch(/op-container/)
  })
})

describe('story cards inside a grid cell', () => {
  it('render in a zone exactly like a top-level card, without the page container', () => {
    const html = render(
      [{ type: 'ThumbnailGrid', props: { id: 'tg', mode: 'manual' } }],
      { zones: { 'tg:thumbnail-grid-box-0': [{ type: 'StoryCard', props: { id: 'z', storyId: 's1' } }] } },
    )
    expect(html).toContain('Real headline 1')
    expect(html).not.toMatch(PLACEHOLDER)
  })
})

const CAMPAIGN = (over: any = {}) => ({
  campaignId: 'camp1',
  status: 'start_now',
  placements: ['Leaderboard', 'Sidebar', 'In-Story'],
  creatives: {
    leaderboard: { desktop: '/ads/leaderboard.png', mobile: '/ads/leaderboard-m.png' },
    sidebar: { desktop: '/ads/sidebar.png', mobile: '/ads/sidebar.png' },
    'in-story': { desktop: '/ads/instory.png', mobile: '/ads/instory.png' },
  },
  ...over,
})

describe.each([
  ['LeaderboardAd', '/ads/leaderboard.png'],
  ['SidebarAd', '/ads/sidebar.png'],
  ['InStoryAd', '/ads/instory.png'],
])('%s (published)', (type, creative) => {
  it('draws nothing on the page when no campaign is live, even with a fallback story saved', () => {
    const html = render([{ type, props: { id: 'ad', adId: 'auto', fallbackStoryId: 's1', fallbackAllowed: true } }])
    expect(html).not.toContain('Real headline 1')
    expect(html).not.toContain('fallback-container">')
    // The slot itself stays hidden until the page script has a campaign for it.
    expect(html).toMatch(/\.ad-container\s*\{[^}]*display:\s*none/)
    expect(html).not.toMatch(/via\.placeholder|Headline goes here/i)
  })

  it('shows the campaign creative when one is live', () => {
    const html = render([{ type, props: { id: 'ad', adId: 'auto' } }], { campaigns: [CAMPAIGN()] })
    expect(html).toContain(creative)
  })

  it.each(['paused', 'rejected', 'expired'])('never serves a %s campaign', (status) => {
    const html = render([{ type, props: { id: 'ad', adId: 'auto' } }], { campaigns: [CAMPAIGN({ status })] })
    expect(html).not.toContain(creative)
  })

  it('falls back to the chosen story inside a grid cell when no campaign is live', () => {
    const html = render(
      [{ type: 'ThumbnailGrid', props: { id: 'tg', mode: 'manual' } }],
      { zones: { 'tg:thumbnail-grid-box-0': [{ type, props: { id: 'ad', adId: 'auto', fallbackStoryId: 's1', fallbackAllowed: true } }] } },
    )
    expect(html).toContain('Real headline 1')
  })
})

describe('Popup ad', () => {
  it('is page-wide: nothing in the page body, the popup script only when a campaign is live', () => {
    const body = render([{ type: 'PopupAd', props: { id: 'p', adId: 'auto' } }])
    expect(body).not.toMatch(PLACEHOLDER)
  })
})

describe('Ad card and Advertisement grid', () => {
  it('Ad card resolves its product from the saved productId and has an image fallback', () => {
    const html = render([{ type: 'AdCard', props: { id: 'a', productId: 'coastal-bedroom-set' } }])
    expect(html).toContain('Coastal bedroom set')
    expect(html).toMatch(/onerror="[^"]*openpress-share\.png/)
  })

  it('an Advertisement grid with no cards draws nothing', () => {
    const html = render([{ type: 'AdvertisementGrid', props: { id: 'g', heading: 'Advertisement', infoLabel: 'About ads', brandName: 'x' } }])
    expect(html).not.toMatch(/Advertisement|<h2|<img/i)
  })

  it('an Advertisement grid with ad cards draws the heading and the cards', () => {
    const html = render(
      [{ type: 'AdvertisementGrid', props: { id: 'g', heading: 'Advertisement', infoLabel: 'About ads' } }],
      { zones: { 'g:advertisement-grid-items': [{ type: 'AdCard', props: { id: 'a1', productId: 'coastal-bedroom-set' } }, { type: 'AdCard', props: { id: 'a2', productId: 'heritage-wooden-bed' } }] } },
    )
    expect(html).toContain('Advertisement')
    expect(html).toContain('Coastal bedroom set')
    expect(html).toContain('Heritage wooden bed')
  })
})

describe('layout grids', () => {
  const zones = (prefix: string, names: string[]) =>
    Object.fromEntries(names.map((name, i) => [`${prefix}:${name}`, [{ type: 'StoryCard', props: { id: `${prefix}-${i}`, storyId: `s${(i % 6) + 1}` } }]]))

  it('Popular grid gives the list the full width when there is no rail', () => {
    const html = render(
      [{ type: 'PopularGrid', props: { id: 'pg', mode: 'manual' } }],
      { zones: { 'pg:popular-grid-left': [{ type: 'MostPopularTable', props: { id: 't', items: [{ number: 1, text: '', storyId: 's1' }] } }] } },
    )
    expect(html).toContain('lg:col-span-12')
    expect(html).not.toContain('lg:col-span-3')
  })

  it('Multimedia grid gives the lead the whole row when the right side is empty', () => {
    const html = render([{ type: 'MultimediaGrid', props: { id: 'mg', mode: 'manual' } }], { zones: zones('mg', ['multimedia-grid-left']) })
    expect(html).toContain('lg:col-span-12')
    expect(html).not.toContain('lg:col-span-6')
  })

  it('Hero grid keeps its three columns and stretches the centre story', () => {
    const html = render(
      [{ type: 'HeroGrid', props: { id: 'hg', mode: 'manual' } }],
      { zones: { 'hg:hero-grid-center-0': [{ type: 'MainCard', props: { id: 'm', storyId: 's1' } }], ...zones('hg', ['hero-grid-left-0', 'hero-grid-right-0']) } },
    )
    expect(html).toContain('Real headline 1')
    expect(html).toMatch(/lg:\[&_img\]:flex-1/)
  })

  it('All stories grid has no empty right column when only the lead is set', () => {
    const html = render([{ type: 'AllStoriesGrid', props: { id: 'ag', mode: 'manual' } }], { zones: zones('ag', ['all-stories-grid-left']) })
    expect(html).not.toMatch(/divide-y/)
  })

  it('Thumbnail grid draws column dividers only between filled columns', () => {
    const one = render([{ type: 'ThumbnailGrid', props: { id: 'tg', mode: 'manual' } }], { zones: zones('tg', ['thumbnail-grid-box-0']) })
    const two = render([{ type: 'ThumbnailGrid', props: { id: 'tg', mode: 'manual' } }], { zones: zones('tg', ['thumbnail-grid-box-0', 'thumbnail-grid-box-1']) })
    expect(one).not.toContain('lg:border-l')
    expect(two).toContain('lg:border-l')
  })
})
