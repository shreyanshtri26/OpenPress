import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { createAutomaticGridContext } from './automaticGridZones'
import { resolveAutoStoryIds } from '../core/resolveAutoStoryIds'

export function renderMultimediaGrid(
  props: Record<string, any>,
  ctx: RenderContext
): string {
  const { id, className, mode, autoStoryIds } = props
  const base = id ?? ''
  const prefix = base ? `${base}:` : ''
  // Automatic mode only applies on the home page — other page types always
  // render manually, even if stale data has automatic mode saved on it.
  const isHomePage = ctx.pageType == null || ctx.pageType === 'Home'
  const isAutomatic = isHomePage && mode === 'automatic'
  const zonePrefixes = [
    `${prefix}multimedia-grid-left`,
    `${prefix}multimedia-grid-right-0`,
    `${prefix}multimedia-grid-right-1`,
    `${prefix}multimedia-grid-right-2`,
    `${prefix}multimedia-grid-right-3`,
  ]
  const effectiveIds: string[] = (Array.isArray(autoStoryIds) && autoStoryIds.length > 0)
    ? autoStoryIds
    : resolveAutoStoryIds(props, ctx.storiesById ?? {}, 20)
  const renderCtx = isAutomatic ? createAutomaticGridContext(ctx, zonePrefixes, effectiveIds) : ctx

  return `
<section id="${base}" class="w-full bg-white px-0 py-8 lg:pt-8 lg:px-16 lg:pb-12 relative ${className ?? ''}">
  <div class="mx-auto w-full max-w-7xl px-0 lg:px-8 relative pb-4">

    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute left-1/2 hidden lg:block" style="top:0;bottom:18px;border-left:1px solid #d2d2d7"></div>
      <div class="hidden lg:block mx-8 absolute left-0 right-0 -bottom-5" style="border-bottom:1px solid gray"></div>
    </div>

    <div class="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-12 relative">

      <div class="lg:col-span-6">
        <div class="w-full h-full bg-white overflow-hidden min-h-[300px]">
          ${renderZone({ zonePrefix: `${base}:multimedia-grid-left`, ctx: renderCtx })}
        </div>
      </div>

      <div class="lg:col-span-6 grid grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-7 relative">

        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute top-0 bottom-[52.5%] left-1/2" style="border-left:1px solid #d2d2d7"></div>
          <div class="absolute top-[52.5%] bottom-0 left-1/2" style="border-left:1px solid #d2d2d7"></div>
          <div class="absolute top-1/2 left-0 right-0" style="border-top:1px solid #d2d2d7"></div>
        </div>

        <div>${renderZone({ zonePrefix: `${base}:multimedia-grid-right-0`, ctx: renderCtx })}</div>
        <div>${renderZone({ zonePrefix: `${base}:multimedia-grid-right-1`, ctx: renderCtx })}</div>
        <div>${renderZone({ zonePrefix: `${base}:multimedia-grid-right-2`, ctx: renderCtx })}</div>
        <div>${renderZone({ zonePrefix: `${base}:multimedia-grid-right-3`, ctx: renderCtx })}</div>

      </div>
    </div>
  </div>
</section>
`
}
