// @vitest-environment jsdom
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-icons/io', () => ({ IoIosPlayCircle: () => null }))

// jsdom has no ResizeObserver and some editor modules touch it while loading.
vi.hoisted(() => {
  ;(globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  ;(globalThis as any).matchMedia = (globalThis as any).matchMedia ?? (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
import { getConfigForPage } from '../builderConfig'
import { initializeStories } from '../storyData'
import { ComponentRegistry } from '../../../helpers/registry/ComponentRegistry'
import { buildStoriesById } from '../../../publish/publishContext'

// A card has two renderers: the React block you see in the Puck canvas and the HTML renderer that makes the published page.
// They have to show the same story the same way. This mounts both for every story card and compares what a reader would see:
// the headline, the category label and the images.

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const API_ROWS = [1, 2, 3, 4, 5, 6].map((n) => ({
  storyId: `s${n}`,
  title: `Real headline ${n}`,
  section: ['News', 'Business', 'Sports'][n % 3],
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  storySummary: `Real summary ${n}`,
  image: `/img/${n}.png`,
  redirectUrl: `/story-${n}`,
  authorName: 'Jane Reporter',
}))

const PLACEHOLDER = /Headline goes here|short summary of the story appears here|No description available|Lorem ipsum|No story selected|via\.placeholder\.com|\bundefined\b|\[object Object\]/i

const CARDS: [string, (n: number) => any][] = [
  ['StoryCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['MainCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['RecommendCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['MultimediaCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['StorySubCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['SidebarStoryCard', (n) => ({ id: 'c', storyId: `s${n}` })],
  ['ShowcaseCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['HoverCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['FeaturedCard', (n) => ({ id: 'c', items: [{ storyId: `s${n}` }, { storyId: `s${n + 1}` }] })],
  ['MostPopularTable', (n) => ({ id: 'c', items: [{ number: 1, text: '', storyId: `s${n}` }, { number: 2, text: '', storyId: `s${n + 1}` }] })],
]

const original = globalThis.fetch
beforeAll(async () => {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ data: API_ROWS }), { status: 200, headers: { 'content-type': 'application/json' } })) as any
  await initializeStories({ pageType: 'Home' })
})
afterAll(() => { globalThis.fetch = original })

const config: any = getConfigForPage('Home')
const published = (type: string, props: any) => {
  const ctx: any = { zones: {}, storiesById: buildStoriesById(API_ROWS), sections: ['News'], activeSection: 'HOME', campaigns: [], extraRenderers: ComponentRegistry, pageType: 'Home' }
  const host = document.createElement('div')
  host.innerHTML = (ComponentRegistry as any)[type](props, ctx)
  return host
}
const editor = async (type: string, props: any) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(config.components[type].render(props)) })
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  return { host, unmount: () => act(async () => root.unmount()) }
}
const srcs = (host: HTMLElement) => [...host.querySelectorAll('img')].map((img) => img.getAttribute('src') || '')
const words = (host: HTMLElement) => (host.textContent || '').replace(/\s+/g, ' ').trim()

describe.each(CARDS)('%s: editor and published page agree', (type, propsFor) => {
  it('both show the story headline and no placeholder', async () => {
    const props = propsFor(1)
    const pub = published(type, props)
    const ed = await editor(type, props)
    expect(words(pub)).toContain('Real headline 1')
    expect(words(ed.host)).toContain('Real headline 1')
    expect(words(pub)).not.toMatch(PLACEHOLDER)
    expect(words(ed.host)).not.toMatch(PLACEHOLDER)
    await ed.unmount()
  })

  it('both show the same category label and the same images', async () => {
    const props = propsFor(2)
    const pub = published(type, props)
    const ed = await editor(type, props)
    const section = ['News', 'Business', 'Sports'][2 % 3]
    if (/Card$/.test(type) && type !== 'StorySubCard' && type !== 'SidebarStoryCard' && type !== 'MultimediaCard') {
      expect(words(pub).toLowerCase()).toContain(section.toLowerCase())
      expect(words(ed.host).toLowerCase()).toContain(section.toLowerCase())
    }
    // every story image the published card shows is shown by the editor card too (and the other way round)
    const story = (srcs(pub).filter((s) => s.startsWith('/img/')))
    const mine = (srcs(ed.host).filter((s) => s.startsWith('/img/')))
    expect([...new Set(mine)].sort()).toEqual([...new Set(story)].sort())
    expect(srcs(ed.host).every((s) => s.length > 0 && !/via\.placeholder/.test(s))).toBe(true)
    await ed.unmount()
  })
})
