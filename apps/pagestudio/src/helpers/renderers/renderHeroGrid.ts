import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { renderDynamicAd } from './renderDynamicAd'
import { resolveAd } from '../core/adResolver'
import { createAutomaticGridContext } from './automaticGridZones'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'

export function renderHeroGrid(
  props: {
    id?: string
    className?: string
    mode?: string
    autoStoryIds?: string[]
    [key: string]: unknown
  },
  ctx: RenderContext
): string {
  const { mode, autoStoryIds = [] } = props
  const id = props.id ?? ''
  // Automatic mode only applies on the home page — other page types always
  // render manually, even if stale data has automatic mode saved on it.
  const isHomePage = ctx.pageType == null || ctx.pageType === 'Home'
  const isAutomatic = isHomePage && mode === 'automatic'

  const prefix = id ? `${id}:` : ''
  const zonePrefixes = [
    `${prefix}hero-grid-left-0`,
    `${prefix}hero-grid-left-1`,
    `${prefix}hero-grid-center-0`,
    `${prefix}hero-grid-right-0`,
    `${prefix}hero-grid-right-1`,
  ]

  const effectiveIds: string[] = (Array.isArray(autoStoryIds) && autoStoryIds.length > 0)
    ? autoStoryIds
    : resolveAutoStoryIds(props as Record<string, unknown>, ctx.storiesById ?? {}, 20)

  const automaticCtx = createAutomaticGridContext(ctx, zonePrefixes, effectiveIds)

  const autoZone = (zonePrefix: string): string => {
    return renderZone({ zonePrefix, ctx: isAutomatic ? automaticCtx : ctx })
  }

  const leftTop = isAutomatic
    ? autoZone(`${prefix}hero-grid-left-0`)
    : renderZone({ zonePrefix: `${prefix}hero-grid-left-0`, ctx })
  const leftBottom = isAutomatic
    ? autoZone(`${prefix}hero-grid-left-1`)
    : renderZone({ zonePrefix: `${prefix}hero-grid-left-1`, ctx })
  const center = isAutomatic
    ? autoZone(`${prefix}hero-grid-center-0`)
    : renderZone({ zonePrefix: `${prefix}hero-grid-center-0`, ctx })

  const rightTopContent = isAutomatic
    ? autoZone(`${prefix}hero-grid-right-0`)
    : renderZone({ zonePrefix: `${prefix}hero-grid-right-0`, ctx })

  // Fall back to sidebar-rectangle ad only in manual mode when zone is empty
  const rightTop = rightTopContent || (!isAutomatic ? renderDynamicAd({
    placementName: 'sidebar-rectangle',
    id: 'hero-grid-sidebar-ad',
  }, ctx) : '')

  const rightBottom = isAutomatic
    ? autoZone(`${prefix}hero-grid-right-1`)
    : renderZone({ zonePrefix: `${prefix}hero-grid-right-1`, ctx })

  const hasLeft = !!(leftTop || leftBottom)
  const hasCenter = !!center
  const adResolved = resolveAd(
    { id: 'hero-grid-sidebar-ad' },
    ctx,
    'sidebar-rectangle',
    [],
    'sidebar-rectangle'
  )
  const isAdActive = !!adResolved.activeCampaign
  // Only factor in the sidebar ad for hasRight when in manual mode
  const hasRight = !!(rightTopContent || rightBottom || (!isAutomatic && isAdActive))
  const hasAny = hasLeft || hasCenter || hasRight

  if (!hasAny) return ''

  return `
<section id="${id}" class="w-full bg-white lg:pt-12 pt-4 px-0 lg:px-16 pb-0 mb-0 ${props.className ?? ''}">
  <div class="relative mx-auto w-full max-w-7xl px-4 lg:px-8 pb-4">

    <!-- Vertical dotted lines -->
    <div class="absolute inset-0 pointer-events-none">
      ${hasLeft && hasCenter ? `
      <div
        class="hidden lg:block absolute top-0 bottom-[1rem] left-[calc((25%)+0.75rem)]"
        style="border-left:1px solid #d2d2d7"
      ></div>
      ` : ''}
      ${hasCenter && hasRight ? `
      <div
        class="hidden lg:block absolute top-0 bottom-[1rem] left-[calc((75%)-0.75rem)]"
        style="border-left:1px solid #d2d2d7"
      ></div>
      ` : ''}
    </div>

    <!-- Grid -->
    <div class="relative z-10 grid grid-cols-1 gap-4 sm:gap-5 lg:gap-x-6 gap-y-2 lg:grid-cols-12">

      <!-- Left column -->
      <div class="order-2 lg:order-1 lg:col-span-3 flex flex-col gap-3">
        ${leftTop ? `<div class="order-1 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">${leftTop}</div>` : ''}
        ${leftTop && leftBottom ? `<hr class="border-t border-dotted border-black mb-3 order-2 lg:order-none" />` : ''}
        ${leftBottom ? `<div class="order-3 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">${leftBottom}</div>` : ''}
      </div>

      <!-- Center column -->
      <div class="order-1 lg:order-2 lg:col-span-6 px-0 lg:px-2">
        ${center ? `<div>${center}</div>` : ''}
        ${hasCenter && (hasRight || hasLeft) ? `<hr class="border-t border-dotted border-black my-4 lg:hidden" />` : ''}
      </div>

      <!-- Right column -->
      <div class="order-3 lg:order-3 lg:col-span-3 flex flex-col gap-3">
        ${rightTop ? `<div class="order-1 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">${rightTop}</div>` : ''}
        ${rightTop && rightBottom ? `<hr class="border-t border-dotted border-black mb-3 order-2 lg:order-none" />` : ''}
        ${rightBottom ? `<div class="order-3 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">${rightBottom}</div>` : ''}
        ${hasRight && hasLeft ? `<hr class="border-t border-dotted border-black my-4 lg:hidden order-4" />` : ''}
      </div>

    </div>
  </div>

</section>
`
}
