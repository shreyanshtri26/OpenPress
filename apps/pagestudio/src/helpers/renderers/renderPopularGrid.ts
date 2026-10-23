// src/helpers/renderers/renderPopularGrid.ts

import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { createAutomaticGridContext } from './automaticGridZones'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'

export function renderPopularGrid(
  props: { id?: string; className?: string; mode?: string; autoStoryIds?: string[]; [key: string]: unknown },
  ctx: RenderContext
): string {
  const { id, className = '', mode, autoStoryIds = [] } = props
  // Automatic mode only applies on the home page — other page types always
  // render manually, even if stale data has automatic mode saved on it.
  const isHomePage = ctx.pageType == null || ctx.pageType === 'Home'
  const isAutomatic = isHomePage && mode === 'automatic'

  const prefix = id ? `${id}:` : ''
  const zonePrefixes = [
    `${prefix}popular-grid-left`,
    `${prefix}popular-grid-right-1`,
    `${prefix}popular-grid-right-2`,
  ]
  const effectiveIds: string[] = (Array.isArray(autoStoryIds) && autoStoryIds.length > 0)
    ? autoStoryIds
    : resolveAutoStoryIds(props as Record<string, unknown>, ctx.storiesById ?? {}, 20)

  const renderCtx = isAutomatic ? createAutomaticGridContext(ctx, zonePrefixes, effectiveIds) : ctx

  const leftContent = renderZone({ zonePrefix: zonePrefixes[0], ctx: renderCtx })
  const right1 = renderZone({ zonePrefix: zonePrefixes[1], ctx: renderCtx })
  const right2 = renderZone({ zonePrefix: zonePrefixes[2], ctx: renderCtx })

  const hasAny = !!(leftContent || right1 || right2)
  // The right-hand rail (ads or extra stories) only takes space when it has something in it.
  const hasRail = !!(right1 || right2)
  if (!hasAny) return ''

  return `
<section id="${id ?? ''}" class="w-full bg-white lg:pt-6 pb-10 relative ${className}">
  <div class="relative op-container pb-4">
    <div class="absolute inset-0 pointer-events-none">
      <div class="hidden lg:block mx-8 absolute left-0 right-0 -bottom-5" style="border-bottom: 1px solid gray;"></div>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-12 lg:items-start">
      <div class="min-w-0 ${hasRail ? 'lg:col-span-9' : 'lg:col-span-12'}">
        <div class="w-full h-auto overflow-hidden rounded">${leftContent}</div>
      </div>
      ${hasRail ? `<div class="min-w-0 lg:col-span-3 flex flex-col gap-4">
        ${right1 ? `<div>${right1}</div>` : ''}
        ${right2 ? `<div>${right2}</div>` : ''}
      </div>` : ''}
    </div>
  </div>
</section>
`
}

