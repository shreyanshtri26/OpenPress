import type { RenderContext } from '../core/renderTypes'
import { resolveAd } from '../core/adResolver'

export type GridZoneItem = {
  type: string
  props?: Record<string, unknown>
}

type GridItemEntry = Record<string, unknown> & {
  storyId?: string
  __automaticEmpty?: boolean
}

function clearStoryProps(props: Record<string, unknown> = {}): Record<string, unknown> {
  const nextProps = { ...props }
  ;[
    'title',
    'label',
    'imageUrl',
    'imageAlt',
    'image',
    'headline',
    'summary',
    'description',
    'category',
    'section',
  ].forEach((key) => delete nextProps[key])
  return nextProps
}

function buildFallbackProps(
  ctx: RenderContext,
  autoFallbackStoryId: string
): Record<string, unknown> {
  const story = (ctx.storiesById as Record<string, any>)?.[autoFallbackStoryId]
    ?? Object.values((ctx.storiesById as Record<string, any>) ?? {}).find(
        (s: any) => s?.id === autoFallbackStoryId || s?.storyId === autoFallbackStoryId
      )
  const extraProps: Record<string, unknown> = { _autoFallbackStoryId: autoFallbackStoryId }
  if (story) {
    extraProps._autoFallbackTitle = story.headline || story.title
    extraProps._autoFallbackLabel = story.category || story.section || story.Section || story.taxonomyCategory
    extraProps._autoFallbackImageUrl = story.imageUrl || story.image
    extraProps._autoFallbackPublishUrl = story.publishUrl
  }
  return extraProps
}

// Default placement name + fallback keywords each ad renderer resolves
// campaigns against (mirrors the hardcoded args each render*Ad.ts passes to
// resolveAd). DynamicAd/other per-placement ads carry their own
// `props.placementName` instead. SpotlightAd doesn't go through resolveAd at
// all, so it always falls through to the leftover-story fallback below.
const AD_PLACEMENT_DEFAULTS: Record<string, { placement: string; keywords: string[] }> = {
  InStoryAd: { placement: 'instory-ad', keywords: ['instory', 'in-story'] },
  LeaderboardAd: { placement: 'leaderboard-ad', keywords: ['leaderboard'] },
  SidebarAd: { placement: 'sidebar-ad', keywords: ['sidebar'] },
}

// Whether this ad block currently has a live campaign for its placement. If
// so, it doesn't need (and shouldn't consume) a leftover story — the
// campaign creative will render instead.
function hasActiveCampaign(item: GridZoneItem, ctx: RenderContext): boolean {
  const type = String(item.type ?? '')
  if (type === 'SpotlightAd') return false

  const props = (item.props ?? {}) as Record<string, unknown>
  const known = AD_PLACEMENT_DEFAULTS[type]
  const placementName = known?.placement
    ?? (typeof props.placementName === 'string' ? props.placementName : undefined)
    ?? 'dynamic-ad'
  const keywords = known?.keywords ?? []

  const resolved = resolveAd(props as any, ctx, placementName, keywords, placementName)
  return !!resolved.activeCampaign
}

export function createAutomaticGridContext(
  ctx: RenderContext,
  zonePrefixes: string[],
  autoStoryIds: string[]
): RenderContext {
  let storyIndex = 0

  // Single sequential pass over every block in document order. An ad block
  // with a live campaign for its placement is skipped entirely — it doesn't
  // consume a slot and is invisible to the sequence, so the next real card
  // gets the story the ad would otherwise have taken. An ad block with no
  // active campaign consumes the next story in line exactly like any other
  // card, in place — it's not deferred to a "leftover" pool at the end.
  const automaticZones = zonePrefixes.reduce<Record<string, GridZoneItem[]>>((zones, zonePrefix) => {
    const blocks = (ctx.zones?.[zonePrefix] ?? []) as GridZoneItem[]

    zones[zonePrefix] = blocks.map((item) => {
      if (String(item.type ?? '').includes('Ad')) {
        if (hasActiveCampaign(item, ctx)) return item
        const autoFallbackStoryId = autoStoryIds[storyIndex]
        if (!autoFallbackStoryId) return item
        storyIndex += 1
        return { ...item, props: { ...(item.props ?? {}), ...buildFallbackProps(ctx, autoFallbackStoryId) } }
      }

      const itemProps = item.props ?? {}
      if (Array.isArray(itemProps.items) && itemProps.items.length > 0) {
        const nextItems = (itemProps.items as GridItemEntry[]).map((entry) => {
          const nextStoryId = autoStoryIds[storyIndex]
          if (!nextStoryId) return { ...entry, storyId: '', __automaticEmpty: true }
          storyIndex += 1
          return { ...entry, storyId: nextStoryId, __automaticEmpty: false }
        })
        return { ...item, props: { ...itemProps, items: nextItems } }
      }

      const nextStoryId = autoStoryIds[storyIndex]
      if (!nextStoryId) {
        return { ...item, props: { ...clearStoryProps(itemProps), storyId: '', __automaticEmpty: true } }
      }
      storyIndex += 1
      return {
        ...item,
        props: { ...clearStoryProps(itemProps), storyId: nextStoryId, __automaticEmpty: false },
      }
    })

    return zones
  }, {})

  return {
    ...ctx,
    zones: {
      ...(ctx.zones ?? {}),
      ...automaticZones,
    },
  }
}

const storyDate = (story: any): number => {
  const time = new Date(
    story?.proposedFilingDate || story?.publishDate || story?.publishedAt || story?.createdAt || story?.updatedAt || 0
  ).getTime()
  return Number.isNaN(time) ? 0 : time
}

type StoryBlockData = { content?: GridZoneItem[]; zones?: Record<string, GridZoneItem[]> }

/**
 * Cards pinned to a story that is no longer published (e.g. deactivated) get
 * the latest published story not already on the page. Returns a copy; the
 * saved layout is untouched.
 */
export function replaceUnpublishedStories<T extends StoryBlockData | null | undefined>(
  data: T,
  storiesById: Record<string, any> | null | undefined
): T {
  try {
    return replaceUnpublishedStoriesIn(data, storiesById)
  } catch (error) {
    // Never let this step stop a page from publishing; fall back to the saved layout.
    console.warn('Could not replace unpublished stories; rendering the layout as saved', error)
    return data
  }
}

function replaceUnpublishedStoriesIn<T extends StoryBlockData | null | undefined>(
  data: T,
  storiesById: Record<string, any> | null | undefined
): T {
  const published = new Map<string, any>()
  Object.entries(storiesById ?? {}).forEach(([key, story]) => {
    published.set(key, story)
    if (story?.id) published.set(String(story.id), story)
    if (story?.storyId) published.set(String(story.storyId), story)
  })
  // Without a published list there is nothing to check against.
  if (!data || published.size === 0) return data

  const isMissing = (id: unknown): id is string =>
    typeof id === 'string' && id.trim() !== '' && !published.has(id)

  const list = (value: unknown): GridZoneItem[] => (Array.isArray(value) ? value : [])
  const blocks = [...list(data.content), ...Object.values(data.zones ?? {}).flatMap(list)]
  const used = new Set<string>()
  let anyMissing = false
  const note = (id: unknown) => {
    if (isMissing(id)) anyMissing = true
    else if (typeof id === 'string' && id) used.add(id)
  }
  blocks.forEach((block) => {
    const props = (block?.props ?? {}) as Record<string, any>
    note(props.storyId)
    note(props.fallbackStoryId)
    if (Array.isArray(props.items)) props.items.forEach((entry: any) => note(entry?.storyId))
    if (Array.isArray(props.autoStoryIds)) props.autoStoryIds.forEach(note)
  })
  if (!anyMissing) return data

  const candidates = [...new Set(published.values())]
    .sort((a, b) => storyDate(b) - storyDate(a))
    .map((story) => String(story?.id || story?.storyId || ''))
    .filter(Boolean)
  const nextStoryId = (): string => {
    const id = candidates.find((candidate) => !used.has(candidate)) ?? ''
    if (id) used.add(id)
    return id
  }

  const fixBlock = (block: GridZoneItem): GridZoneItem => {
    if (!block || typeof block !== 'object') return block
    const props = (block?.props ?? {}) as Record<string, any>
    let next: Record<string, any> | null = null
    const change = () => (next ??= { ...props })

    if (isMissing(props.storyId)) {
      const id = nextStoryId()
      // Saved title/image belong to the old story; drop them so the card reads the new one.
      if (id) next = { ...clearStoryProps(props), storyId: id }
    }
    if (isMissing(props.fallbackStoryId)) {
      const id = nextStoryId()
      if (id) change().fallbackStoryId = id
    }
    if (Array.isArray(props.items) && props.items.some((entry: any) => isMissing(entry?.storyId))) {
      change().items = props.items.map((entry: any) => {
        if (!isMissing(entry?.storyId)) return entry
        const id = nextStoryId()
        return id ? { ...clearStoryProps(entry), storyId: id } : entry
      })
    }
    if (Array.isArray(props.autoStoryIds) && props.autoStoryIds.some(isMissing)) {
      // An automatic list keeps its order: the rest move up and new stories join at the end.
      const kept = props.autoStoryIds.filter((id: unknown) => !isMissing(id))
      const added = props.autoStoryIds.filter(isMissing).map(nextStoryId).filter(Boolean)
      change().autoStoryIds = [...kept, ...added]
    }
    return next ? { ...block, props: next } : block
  }

  return {
    ...data,
    content: list(data.content).map(fixBlock),
    zones: Object.fromEntries(
      Object.entries(data.zones ?? {}).map(([zone, items]) => [zone, Array.isArray(items) ? items.map(fixBlock) : items])
    ),
  }
}
