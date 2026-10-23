import type { RenderContext } from '../core/renderTypes'
import { getLatestStoriesForCategory } from '../core/storyCategory'
import { renderZone } from '../core/renderZone'
import { createAutomaticGridContext } from './automaticGridZones'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'

type RenderThumbnailGridProps = {
  id?: string
  mode?: 'manual' | 'automatic'
  className?: string
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
  const {
    id,
    mode,
    className = '',
    automaticCategory,
    autoStoryIds = [],
    thumbnailGridIndex = 0,
    thumbnailGridTotal = 1,
  } = props

  // Mobile-only column logic: 1 grid → 2x2; 2+ grids → even-index = 1-col, odd-index = 2x2
  const isMobile2x2 = thumbnailGridTotal === 1 || thumbnailGridIndex % 2 === 1
  const mobileGridCols = isMobile2x2 ? 'grid-cols-2' : 'grid-cols-1'

  // Automatic mode only applies on the home page — any other page type
  // (Blog, Section, Author, etc.) always renders manually, even if stale
  // data has an automatic mode saved on it.
  const isHomePage = ctx.pageType == null || ctx.pageType === 'Home'
  const isAutomatic = isHomePage && (mode === 'automatic' || Boolean(automaticCategory?.trim()) || (Array.isArray(autoStoryIds) && autoStoryIds.length > 0) || Object.keys(props).some(k => k.startsWith('autoTaxonomy_')))

  let automaticStoryIds: string[] = []
  if (isAutomatic) {
    if (autoStoryIds.length > 0) {
      automaticStoryIds = autoStoryIds
    } else if (Object.keys(props).some(k => k.startsWith('autoTaxonomy_'))) {
      automaticStoryIds = resolveAutoStoryIds(props as Record<string, unknown>, ctx.storiesById ?? {}, 20)
    } else if (automaticCategory) {
      automaticStoryIds = getLatestStoriesForCategory(Object.values(ctx.storiesById ?? {}), automaticCategory, 4)
        .map((s: any) => s.id)
        .filter(Boolean)
    }
  }

  const prefix = id ? `${id}:` : ''
  const zonePrefixes = [
    `${prefix}thumbnail-grid-box-0`,
    `${prefix}thumbnail-grid-box-1`,
    `${prefix}thumbnail-grid-box-2`,
    `${prefix}thumbnail-grid-box-3`,
  ]
  const renderCtx = isAutomatic
    ? createAutomaticGridContext(ctx, zonePrefixes, automaticStoryIds)
    : ctx

  const box0 = renderZone({ zonePrefix: zonePrefixes[0], ctx: renderCtx })
  const box1 = renderZone({ zonePrefix: zonePrefixes[1], ctx: renderCtx })
  const box2 = renderZone({ zonePrefix: zonePrefixes[2], ctx: renderCtx })
  const box3 = renderZone({ zonePrefix: zonePrefixes[3], ctx: renderCtx })

  const gridBox0 = box0
  const gridBox1 = box1
  const gridBox2 = box2
  const gridBox3 = box3

  const hasAny = !!(gridBox0 || gridBox1 || gridBox2 || gridBox3)
  if (!hasAny) return ''

  return `
<section
  id="${id ?? ''}"
  class="w-full bg-white pt-6 lg:pb-6 relative ${className}"
>
  <div class="op-container relative pb-0 thumbnail-grid ${isMobile2x2 ? 'thumbnail-grid-mobile-2x2' : 'thumbnail-grid-mobile-single'}">

    <!-- Mobile plus-type border (only for 2x2 layout) -->
    ${isMobile2x2 ? `
    <div class="lg:hidden absolute inset-0 pointer-events-none flex items-center justify-center">
      <div class="absolute top-0 bottom-0 left-1/2" style="border-left: 1px solid #d2d2d7;"></div>
      <div class="absolute left-0 right-0 top-1/2" style="border-top: 1px solid #d2d2d7;"></div>
      <!-- Intersection gap -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white z-10"></div>
    </div>
    ` : ''}

    <!-- Bottom rule (desktop only); the column dividers are borders on the columns themselves -->
    <div class="hidden lg:block absolute inset-0 pointer-events-none">
      <div class="mx-8 absolute left-0 right-0 -bottom-5" style="border-bottom: 1px solid gray;"></div>
    </div>

    <!-- 4-column grid: each column carries its own divider and padding, so the lines always sit between the cards -->
    <div class="grid ${mobileGridCols} lg:grid-cols-4 gap-6 lg:gap-x-0 relative">
      ${[gridBox0, gridBox1, gridBox2, gridBox3].map((box, i, all) => {
        const before = all.slice(0, i).some(Boolean)
        const after = all.slice(i + 1).some(Boolean)
        return `<div class="w-full h-full min-w-0 ${before ? 'lg:border-l lg:pl-5' : ''} ${after ? 'lg:pr-5' : ''} lg:[&_h2]:text-[21px] lg:[&_h2]:leading-[1.2] ${isMobile2x2 ? '[&_h2]:text-[1.05rem] [&_h2]:leading-[1.2] sm:[&_h2]:text-xl' : ''}" style="${before ? 'border-color:#d2d2d7' : ''}">${box}</div>`
      }).join('')}
    </div>
  </div>
</section>
`
}
