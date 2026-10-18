import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { renderBottomCardList } from './renderBottomCardList'

export function renderSectionBottomGrid(
  props: {
    id?: string
    className?: string
  },
  ctx: RenderContext
): string {

  // Render the drop zone: section-bottom-left-top-1
  const leftTop1 = renderZone({
    zonePrefix: `${props.id}:section-bottom-left-top-1`,
    ctx,
  })

  // Fallback logic: if no components in the zone, render the standard BottomCardList
  const content = leftTop1 && leftTop1.trim().length > 0
    ? leftTop1
    : renderBottomCardList({ id: 'bottom-card-list' }, ctx)

  return `
    <section id="${props.id ?? ''}" class="w-full bg-white pt-8 lg:pr-24 pb-12 ${props.className ?? ''}">
        <div class="mx-auto w-full max-w-7xl">
            <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">
                <div class="w-full flex flex-col gap-2">
                    <div class="h-auto w-full min-h-[2.2rem]">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
    </section>
  `
}
