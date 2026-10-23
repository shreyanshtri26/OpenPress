import { describe, expect, it } from 'vitest'
import { buildLibraryCategories, matchesLibraryQuery } from '../libraryGroups'
import { describeSave, hasUnsavedChanges, retryDelayMs, saveReducer, type SaveStatus } from '../saveStatus'
import { blockingIssues, validatePageForPublish } from '../validatePage'
import { placeList } from '../fields/dropdownPlacement'
import { isCssColor, swatchFor } from '../fields/dropdownSwatch'

describe('component library groups', () => {
  const keys = ['LeaderboardAd', 'PopupAd', 'HeroGrid', 'PopularGrid', 'PopularBlogCard', 'AtlanticNavbar', 'StoryCard', 'Ad_Home_Banner', 'BrandNewBlock']

  it('puts every block in exactly one group, in order', () => {
    const cats = buildLibraryCategories(keys)
    const all = Object.values(cats).flatMap((c) => c.components)
    expect(all.sort()).toEqual([...keys].sort())
    expect(new Set(all).size).toBe(all.length)
    expect(Object.keys(cats)[0]).toBe('Placements')
  })

  it('keeps PopularGrid with the editorial layouts, not blog and video', () => {
    const cats = buildLibraryCategories(keys)
    expect(cats['Editorial layouts'].components).toContain('PopularGrid')
    expect(cats['Blog and video'].components).toEqual(['PopularBlogCard'])
  })

  it('sends unknown blocks to Other and drops empty groups', () => {
    const cats = buildLibraryCategories(['BrandNewBlock'])
    expect(Object.keys(cats)).toEqual(['Other'])
  })

  it('searches by key or label, ignoring case, spaces and dashes', () => {
    expect(matchesLibraryQuery('leader', 'LeaderboardAd', 'Leaderboard Ad')).toBe(true)
    expect(matchesLibraryQuery('in story', 'InStoryAd', 'In-Story Ad (300x250)')).toBe(true)
    expect(matchesLibraryQuery('', 'Anything')).toBe(true)
    expect(matchesLibraryQuery('zzz', 'HeroGrid', 'Hero Grid')).toBe(false)
  })
})

describe('save status', () => {
  const idle: SaveStatus = { state: 'idle' }

  it('walks edit -> saving -> saved', () => {
    let s = saveReducer(idle, { type: 'edit' })
    expect(s.state).toBe('dirty')
    s = saveReducer(s, { type: 'start' })
    expect(s).toEqual({ state: 'saving', attempt: 1 })
    s = saveReducer(s, { type: 'success', at: 1000 })
    expect(s).toEqual({ state: 'saved', at: 1000 })
    expect(hasUnsavedChanges(s)).toBe(false)
  })

  it('treats a failed save as unsaved and keeps the message', () => {
    const s = saveReducer({ state: 'saving', attempt: 3 }, { type: 'failure', message: 'HTTP 500', attempt: 3 })
    expect(s).toEqual({ state: 'error', message: 'HTTP 500', attempt: 3 })
    expect(hasUnsavedChanges(s)).toBe(true)
    expect(describeSave(s)).toBe('Save failed')
  })

  it('backs off between retries up to a ceiling', () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([1000, 2000, 4000, 8000, 8000])
  })

  it('describes the saved age', () => {
    expect(describeSave({ state: 'saved', at: 0 }, 2000)).toBe('Saved')
    expect(describeSave({ state: 'saved', at: 0 }, 30000)).toBe('Saved 30s ago')
    expect(describeSave({ state: 'saved', at: 0 }, 180000)).toBe('Saved 3m ago')
    expect(describeSave({ state: 'saving', attempt: 2 })).toBe('Saving… (retry 1)')
  })
})

describe('publish validation', () => {
  it('blocks an empty page', () => {
    const issues = validatePageForPublish({ content: [] })
    expect(blockingIssues(issues)).toHaveLength(1)
  })

  it('blocks unsafe link schemes anywhere on the page, including zones', () => {
    const data = {
      content: [{ type: 'ErrorCard', props: { id: 'e', linkUrl: 'javascript:alert(1)' } }],
      zones: { 'g:z': [{ type: 'AdCard', props: { id: 'a', href: ' DATA:text/html,x' } }] },
    }
    const blockers = blockingIssues(validatePageForPublish(data))
    expect(blockers.map((b) => b.componentType).sort()).toEqual(['AdCard', 'ErrorCard'])
  })

  it('allows normal and relative links', () => {
    const data = { content: [{ type: 'ErrorCard', props: { id: 'e', linkUrl: '/' } }, { type: 'Footer', props: { id: 'f', url: 'https://example.com' } }] }
    expect(validatePageForPublish(data)).toEqual([])
  })

  it('warns, without blocking, about missing campaigns and duplicate section ids', () => {
    const data = { content: [{ type: 'SidebarAd', props: { id: 'x', adId: 'gone' } }, { type: 'Heading', props: { id: 'x' } }] }
    const issues = validatePageForPublish(data, { knownAdIds: new Set(['auto', 'c1-Sidebar']) })
    expect(blockingIssues(issues)).toHaveLength(0)
    expect(issues.map((i) => i.severity)).toEqual(['warning', 'warning'])
  })
})

describe('dropdown placement', () => {
  const rect = (o: Partial<DOMRect>) => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...o }) as DOMRect
  const viewport = { width: 1200, height: 800 }

  it('opens below the trigger when there is room, and is wider than a narrow trigger so long labels fit', () => {
    const p = placeList(rect({ left: 20, right: 180, width: 160, top: 100, bottom: 136 }), viewport)
    expect(p.top).toBe(142)
    expect(p.bottom).toBeUndefined()
    expect(p.width).toBe(240)
  })

  it('flips above when the space below is too small and above is larger', () => {
    const p = placeList(rect({ left: 20, right: 180, width: 160, top: 700, bottom: 736 }), viewport)
    expect(p.top).toBeUndefined()
    expect(p.bottom).toBe(800 - 700 + 6)
    expect(p.maxHeight).toBeLessThanOrEqual(320)
  })

  it('stays inside the viewport at the right edge and never exceeds it on a tiny screen', () => {
    const edge = placeList(rect({ left: 1150, right: 1190, width: 40, top: 10, bottom: 40 }), viewport)
    expect(edge.left + edge.width).toBeLessThanOrEqual(1200 - 8)
    const tiny = placeList(rect({ left: 0, right: 100, width: 100, top: 10, bottom: 40 }), { width: 200, height: 400 })
    expect(tiny.width).toBeLessThanOrEqual(200 - 16)
  })
})

describe('dropdown colour swatches', () => {
  it('recognises the colours a browser understands', () => {
    for (const v of ['#fff', '#0057FF', '#0057ff80', 'rgb(0, 87, 255)', 'rgba(0,0,0,0.5)', 'hsl(210 50% 40%)']) expect(isCssColor(v)).toBe(true)
    for (const v of ['Slate', 'red', '#12', '#ggg', 'url(x)', '', null, 42, undefined]) expect(isCssColor(v)).toBe(false)
  })

  it('uses an option value that is itself a colour (the Accent / Title / Paragraph pickers)', () => {
    expect(swatchFor({ label: '#B42318', value: '#B42318' })).toBe('#B42318')
    expect(swatchFor({ label: 'Slate', value: '#d1d5db' })).toBe('#d1d5db')
  })

  it('prefers an explicit swatch, e.g. the default colour on "Default Color"', () => {
    expect(swatchFor({ label: 'Default Color', value: '', swatch: '#6e6e73' })).toBe('#6e6e73')
  })

  it('looks up the colour an admin assigned to a category or section, ignoring case', () => {
    const colors = { Politics: '#b42318', Sports: '#067647' }
    expect(swatchFor({ label: 'Politics', value: 'politics-id' }, colors)).toBe('#b42318')
    expect(swatchFor({ label: 'x', value: 'sports' }, colors)).toBe('#067647')
  })

  it('shows nothing for options with no colour, and ignores a bad stored colour', () => {
    expect(swatchFor({ label: 'Home', value: 'Home' }, { Politics: '#b42318' })).toBeUndefined()
    expect(swatchFor({ label: 'Politics', value: 'p' }, { Politics: 'not-a-colour' })).toBeUndefined()
  })
})
