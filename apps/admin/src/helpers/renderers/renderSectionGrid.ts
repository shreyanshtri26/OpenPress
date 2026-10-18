import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'

export function renderSectionGrid(
  props: {
    id?: string
    className?: string
  },
  ctx: RenderContext
): string {
  // 1. Render the zones defined in SectionGrid.tsx
  const leftTop1 = renderZone({
    zonePrefix: `${props.id}:section-grid-left-top-1`,
    ctx,
  })

  const right1 = renderZone({
    zonePrefix: `${props.id}:section-grid-right-1`,
    ctx,
  })

  const right2 = renderZone({
    zonePrefix: `${props.id}:section-grid-right-2`,
    ctx,
  })

  const right3 = renderZone({
    zonePrefix: `${props.id}:section-grid-right-3`,
    ctx,
  })

  const right4 = renderZone({
    zonePrefix: `${props.id}:section-grid-right-4`,
    ctx,
  })

  const right5 = renderZone({
    zonePrefix: `${props.id}:section-grid-right-5`,
    ctx,
  })

  const hasContent = [leftTop1, right1, right2, right3, right4, right5].some(zone => zone && zone.trim().length > 0);
  const dynamicAttr = hasContent ? '' : 'data-dynamic-grid="section-stories"';

  return `
    <section 
      id="${props.id ?? ''}" 
      class="w-full bg-white lg:pt-8 px-4 lg:px-16 pb-12 ${props.className ?? ''}"
      ${dynamicAttr}
    >
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">

          <!-- LEFT COLUMN - Only Top Bar -->
          <div class="w-full flex flex-col gap-2" data-grid-slot="left-top-1">
            <!-- Top bar 1 -->
            <div class="h-auto w-full min-h-[2.2rem]">
              ${leftTop1}
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="w-full lg:w-[30%] flex flex-col gap-5">

            <!-- Tall block -->
            <div class="h-auto" data-grid-slot="right-1">
              ${right1}
            </div>

            <!-- Small block group -->
            <div>
              <div class="h-auto" data-grid-slot="right-2">
                ${right2}
              </div>
              <div class="h-auto" data-grid-slot="right-3">
                ${right3}
              </div>
            </div>

            <div class="h-auto -mt-3 " data-grid-slot="right-4">
              ${right4}
            </div>

            <!-- Tall bottom block -->
            <div class="h-auto" data-grid-slot="right-5">
              ${right5}
            </div>
          </div>

        </div>
      </div>
    </section>
  `
}
