import { useContext, useMemo } from 'react'
import { createUsePuck } from '@measured/puck'
import { PageZonesContext } from './PageZonesContext'
import { getLiveAd } from '../campaignData'

// Placement names the 4 fixed ad block types resolve a live campaign
// against (mirrors the `getLiveAd(...)` calls each type's render function
// makes in CommonBlocksConfig.tsx). Generic per-placement dynamic ad blocks
// (e.g. "Ad_Leaderboard_Yashvi") aren't fixed types — their placement name
// instead lives on `props.placementName` (set from `defaultProps` when the
// block is registered), so those are resolved from the block's own props
// below. SpotlightAd is explicitly excluded either way: its render function
// doesn't go through the same `resolveAd`/`getLiveAd` matching at all — it's
// only resolved live at publish time — so it always falls through to the
// leftover-story fallback, same as the server-side automaticGridZones.ts.
const AD_PLACEMENT_LOOKUP: Record<string, string> = {
  LeaderboardAd: 'Leaderboard',
  InStoryAd: 'In-Story',
  SidebarAd: 'Sidebar',
}

function hasActiveCampaignForBlock(type: string, props: Record<string, unknown> | undefined): boolean {
  if (type === 'SpotlightAd') return false
  const placementName = AD_PLACEMENT_LOOKUP[type]
    ?? (typeof props?.placementName === 'string' ? props.placementName : undefined)
  if (!placementName) return false
  return !!getLiveAd(placementName)
}

type GridCardBlock = {
  type?: string
  props?: {
    id?: string
    items?: unknown[]
    placementName?: string
  }
}

type GridZones = Record<string, GridCardBlock[]>

const EMPTY_ZONES: GridZones = {}
const usePuckData = createUsePuck()

export function useAutoGridCardAssignments(
  gridId: string | undefined,
  zonePrefix: string,
  zoneNames: string[],
  autoStoryIds: string[]
): Record<string, string[]> {
  let zones: GridZones = EMPTY_ZONES
  try {
    zones = usePuckData((state) => (
      (state.appState.data as { zones?: GridZones })?.zones ?? EMPTY_ZONES
    ))
  } catch {
    // Outside <Puck> context (e.g., during <Render>/Preview mode)
  }

  // Fall back to page-level zones context provided by PublishedPage in render mode
  const pageZones = useContext(PageZonesContext)

  return useMemo(() => {
    const effectiveZones = (Object.keys(zones).length > 0 ? zones : pageZones) as GridZones
    return computeAutoGridCardAssignments(effectiveZones, gridId, zonePrefix, zoneNames, autoStoryIds).assignments
  }, [autoStoryIds, gridId, zoneNames, zonePrefix, zones, pageZones])
}

function computeAutoGridCardAssignments(
  effectiveZones: GridZones,
  gridId: string | undefined,
  zonePrefix: string,
  zoneNames: string[],
  autoStoryIds: string[]
): { assignments: Record<string, string[]>; emptyCardIds: string[] } {
  const assignments: Record<string, string[]> = {}
  const emptyCardIds: string[] = []
  let storyIndex = 0

  // Single sequential pass over every block in document order — mirrors
  // automaticGridZones.ts. An ad block with a live campaign for its
  // placement is skipped entirely (no slot consumed, invisible to the
  // sequence); an ad block with no active campaign consumes the next story
  // in line exactly like any other card, in place.
  zoneNames.forEach((zoneName) => {
    const zone = `${zonePrefix}-${zoneName}`
    const fullKey = gridId ? `${gridId}:${zone}` : zone
    const blocks = effectiveZones[fullKey] ?? effectiveZones[zone] ?? []

    blocks.forEach((block) => {
      const cardId = block?.props?.id
      if (!cardId) return

      if (String(block?.type ?? '').includes('Ad')) {
        if (hasActiveCampaignForBlock(String(block?.type ?? ''), block?.props)) return
        const slice = autoStoryIds.slice(storyIndex, storyIndex + 1)
        if (slice.length > 0) {
          assignments[cardId] = slice
        }
        storyIndex += 1
        return
      }

      const storyCount = Array.isArray(block.props?.items) && block.props.items.length > 0
        ? block.props.items.length
        : 1
      const slice = autoStoryIds.slice(storyIndex, storyIndex + storyCount)
      // Registered even when short so the card renders empty instead of its manual data
      assignments[cardId] = slice
      if (slice.length < storyCount) emptyCardIds.push(cardId)
      storyIndex += storyCount
    })
  })

  return { assignments, emptyCardIds }
}

const AUTO_GRID_LAYOUTS: Record<string, { zonePrefix: string; zoneNames: string[] }> = {
  HeroGrid: { zonePrefix: 'hero-grid', zoneNames: ['left-0', 'left-1', 'center-0', 'right-0', 'right-1'] },
  ThumbnailGrid: { zonePrefix: 'thumbnail-grid', zoneNames: ['box-0', 'box-1', 'box-2', 'box-3'] },
  PopularGrid: { zonePrefix: 'popular-grid', zoneNames: ['left', 'right-1', 'right-2'] },
  MultimediaGrid: { zonePrefix: 'multimedia-grid', zoneNames: ['left', 'right-0', 'right-1', 'right-2', 'right-3'] },
  AllStoriesGrid: { zonePrefix: 'all-stories-grid', zoneNames: ['left', 'right-top-1', 'right-top-2', 'right-top-3', 'right-bottom'] },
}

// Cards in automatic grids that the current filters leave without a story
export function findEmptyAutoGridCards(data: { content?: GridCardBlock[]; zones?: GridZones }): string[] {
  const zones = data?.zones ?? EMPTY_ZONES
  const blocks = [...(data?.content ?? []), ...Object.values(zones).flat()]

  return blocks.flatMap((block) => {
    const layout = AUTO_GRID_LAYOUTS[String(block?.type ?? '')]
    const props = block?.props as { id?: string; mode?: string; autoStoryIds?: string[] } | undefined
    if (!layout || props?.mode !== 'automatic') return []
    return computeAutoGridCardAssignments(
      zones,
      props.id,
      layout.zonePrefix,
      layout.zoneNames,
      Array.isArray(props.autoStoryIds) ? props.autoStoryIds : []
    ).emptyCardIds
  })
}
