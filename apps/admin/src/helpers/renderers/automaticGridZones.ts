import type { RenderContext } from '../core/renderTypes'
import { resolveAd } from '../core/adResolver'

type GridZoneItem = {
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
// campaigns against (mirrors the campaign-type variants each render*Ad.ts
// itself accepts, e.g. renderInStoryAd.ts's 'in-story' | 'instory' |
// 'in story'). Generic per-placement `Ad_<name>` blocks derive their
// placement from the block type itself instead. SpotlightAd doesn't go
// through resolveAd at all, so it always falls through to the
// leftover-story fallback below.
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
    ?? (type.startsWith('Ad_') ? type.replace('Ad_', '').replace(/_/g, '-') : undefined)
    ?? (typeof props.placementName === 'string' ? props.placementName : undefined)
    ?? 'dynamic-ad'
  const keywords = known?.keywords ?? [placementName]

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
