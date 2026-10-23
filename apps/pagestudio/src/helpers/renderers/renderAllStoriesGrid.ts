// src/helpers/renderers/renderAllStoriesGrid.ts

import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { createAutomaticGridContext } from './automaticGridZones'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'

export function renderAllStoriesGrid(
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
    `${prefix}all-stories-grid-left`,
    `${prefix}all-stories-grid-right-top-1`,
    `${prefix}all-stories-grid-right-top-2`,
    `${prefix}all-stories-grid-right-top-3`,
    `${prefix}all-stories-grid-right-bottom`,
  ]
  const effectiveIds: string[] = (Array.isArray(autoStoryIds) && autoStoryIds.length > 0)
    ? autoStoryIds
    : resolveAutoStoryIds(props as Record<string, unknown>, ctx.storiesById ?? {}, 20)

  const renderCtx = isAutomatic ? createAutomaticGridContext(ctx, zonePrefixes, effectiveIds) : ctx

  const left = renderZone({ zonePrefix: zonePrefixes[0], ctx: renderCtx })
  const rt1 = renderZone({ zonePrefix: zonePrefixes[1], ctx: renderCtx })
  const rt2 = renderZone({ zonePrefix: zonePrefixes[2], ctx: renderCtx })
  const rt3 = renderZone({ zonePrefix: zonePrefixes[3], ctx: renderCtx })
  const rb = renderZone({ zonePrefix: zonePrefixes[4], ctx: renderCtx })

  const hasAny = !!(left || rt1 || rt2 || rt3 || rb)
  const hasRight = !!(rt1 || rt2 || rt3 || rb)
  if (!hasAny) return ''

  return `
<section id="${id ?? ''}" class="w-full bg-white sm:pt-6 ${className}">
  <div class="op-container">
    <div class="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-stretch">
      <div class="min-w-0 w-full ${hasRight ? 'lg:flex-[1.85]' : 'lg:flex-1'} lg:flex lg:flex-col lg:[&>a]:flex lg:[&>a]:flex-1 lg:[&>a]:flex-col lg:[&_img]:flex-1 lg:[&_img]:min-h-[18rem] lg:[&_img]:aspect-auto">${left}</div>
      ${hasRight ? `<div class="min-w-0 w-full lg:flex-1 flex flex-col gap-6 lg:divide-y lg:divide-[#d2d2d7] lg:[&>div]:pt-6 lg:[&>div:first-child]:pt-0 lg:[&_h2]:text-[21px] lg:[&_h2]:leading-[1.2] lg:[&_a>div]:grid lg:[&_a>div]:grid-cols-[9rem_minmax(0,1fr)] lg:[&_a>div]:items-start lg:[&_a>div]:gap-4 lg:[&_img]:aspect-[4/3] lg:[&_img]:w-full">
        ${[rt1, rt2, rt3, rb].filter(Boolean).map((card) => `<div>${card}</div>`).join('')}
      </div>` : ''}
    </div>
  </div>
</section>
`
}

