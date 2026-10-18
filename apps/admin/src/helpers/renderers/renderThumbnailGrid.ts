import type { RenderContext } from '../core/renderTypes'
import { getLatestStoriesForCategory } from '../core/storyCategory'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'
import { createAutomaticGridContext } from './automaticGridZones'
import { renderZone } from '../core/renderZone'

type RenderThumbnailGridProps = {
  id?: string
  className?: string
  mode?: string
  automaticCategory?: string
  autoStoryIds?: string[]
  thumbnailGridIndex?: number
  thumbnailGridTotal?: number
  [key: string]: unknown
}

export function renderThumbnailGrid(
  props: RenderThumbnailGridProps,
  ctx: RenderContext
): string {
  const { id, className = '', mode, automaticCategory, autoStoryIds, thumbnailGridIndex = 0, thumbnailGridTotal = 1 } = props
  // Automatic mode only applies on the home page — any other page type
  // (Blog, Section, Author, etc.) always renders manually, even if stale
  // data has an automatic mode saved on it.
  const isHomePage = ctx.pageType == null || ctx.pageType === 'Home'
  const isAutomatic = isHomePage && (mode === 'automatic' || Boolean(automaticCategory?.trim()) || (Array.isArray(autoStoryIds) && autoStoryIds.length > 0))

  // Mobile-only column logic: 1 grid → 2x2; 2+ grids → even-index = 1-col, odd-index = 2x2
  const isMobile2x2 = thumbnailGridTotal === 1 || thumbnailGridIndex % 2 === 1
  const mobileGridCols = isMobile2x2 ? 'grid-cols-2' : 'grid-cols-1'

  const prefix = id ? `${id}:` : ''
  const zonePrefixes = [
    `${prefix}thumbnail-grid-box-0`,
    `${prefix}thumbnail-grid-box-1`,
    `${prefix}thumbnail-grid-box-2`,
    `${prefix}thumbnail-grid-box-3`,
  ]

  let effectiveIds: string[] = []
  if (isAutomatic) {
    if (Array.isArray(autoStoryIds) && autoStoryIds.length > 0) {
      effectiveIds = autoStoryIds
    } else if (Object.keys(props).some(k => k.startsWith('autoTaxonomy_'))) {
      effectiveIds = resolveAutoStoryIds(props as Record<string, unknown>, ctx.storiesById ?? {}, 20)
    } else if (automaticCategory) {
      effectiveIds = getLatestStoriesForCategory(Object.values(ctx.storiesById ?? {}), automaticCategory, 4)
        .map((s: any) => s.id || s.storyId)
        .filter(Boolean)
    }
  }

  const renderCtx = isAutomatic
    ? createAutomaticGridContext(ctx, zonePrefixes, effectiveIds)
    : ctx

  const box0 = renderZone({ zonePrefix: zonePrefixes[0], ctx: renderCtx })
  const box1 = renderZone({ zonePrefix: zonePrefixes[1], ctx: renderCtx })
  const box2 = renderZone({ zonePrefix: zonePrefixes[2], ctx: renderCtx })
  const box3 = renderZone({ zonePrefix: zonePrefixes[3], ctx: renderCtx })

  if (!box0 && !box1 && !box2 && !box3) return ''

  return `
<section
  id="${id ?? ''}"
  class="w-full bg-white pt-6 px-0 lg:px-16 lg:pb-6 relative ${className}"
>
  <div class="mx-auto w-full max-w-7xl px-0 lg:px-8 relative pb-0 thumbnail-grid ${isMobile2x2 ? 'thumbnail-grid-mobile-2x2' : 'thumbnail-grid-mobile-single'}">

    <!-- Mobile plus-type border (only for 2x2 layout) -->
    ${isMobile2x2 ? `
    <div class="lg:hidden absolute inset-0 pointer-events-none flex items-center justify-center">
      <div class="absolute top-0 bottom-0 left-1/2" style="border-left: 1px solid #d2d2d7;"></div>
      <div class="absolute left-0 right-0 top-1/2" style="border-top: 1px solid #d2d2d7;"></div>
      <!-- Intersection gap -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white z-10"></div>
    </div>
    ` : ''}

    <!-- Dotted vertical lines (desktop only) -->
    <div class="hidden lg:block absolute inset-0 pointer-events-none">
      ${box0 && (box1 || box2 || box3) ? `<div class="absolute top-0 bottom-0 left-[25.5%]" style="border-left: 1px solid #d2d2d7;"></div>` : ''}
      ${(box0 || box1) && (box2 || box3) ? `<div class="absolute top-0 bottom-0 left-[50%]" style="border-left: 1px solid #d2d2d7;"></div>` : ''}
      ${(box0 || box1 || box2) && box3 ? `<div class="absolute top-0 bottom-0 left-[74.4%]" style="border-left: 1px solid #d2d2d7;"></div>` : ''}
      <div class="mx-8 absolute left-0 right-0 -bottom-5" style="border-bottom: 1px solid gray;"></div>
    </div>

    <!-- 4-column grid -->
    <div class="grid ${mobileGridCols} lg:grid-cols-4 gap-6 lg:gap-x-8 relative">

      <div class="w-full h-full">${box0}</div>
      <div class="w-full h-full">${box1}</div>
      <div class="w-full h-full">${box2}</div>
      <div class="w-full h-full">${box3}</div>

    </div>
  </div>
</section>
`
}
