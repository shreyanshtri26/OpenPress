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
  if (!hasAny) return ''

  return `
<section id="${id ?? ''}" class="w-full bg-white sm:pt-6 px-4 sm:px-8 lg:px-16 ${className}">
  <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-[8%]">
      <div class="w-full lg:w-[59.5%] flex-shrink-0">${left}</div>
      <div class="w-full lg:w-[32.5%] flex-shrink-0 flex flex-col">
        <div>${rt1}</div>
        <div>${rt2}</div>
        <div>${rt3}</div>
        <div>${rb}</div>
      </div>
    </div>
  </div>
</section>
`
}

