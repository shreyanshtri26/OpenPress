import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { escapeHtml } from '../core/escapeHtml'

type AdvertisementGridProps = {
  id?: string
  heading: string
  infoLabel?: string
  brandName?: string
}

export function renderAdvertisementGrid(
  props: AdvertisementGridProps,
  ctx: RenderContext
): string {
  const zoneKey = `${props.id}:advertisement-grid-items`

  const itemsHtml = renderZone({
    zonePrefix: zoneKey,
    ctx,
  })

  return `
    <section id="${props.id ?? ''}" class="mx-auto w-full max-w-[85%] px-6 py-8">

      <!-- Heading -->
      <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
        <span class="h-px flex-1 bg-slate-200"></span>
        <span>${escapeHtml(props.heading)}</span>
        ${props.infoLabel
      ? `<button
                type="button"
                class="flex h-6 w-6 rounded-full items-center justify-center border border-slate-300 font-bold text-slate-500"
                aria-label="${escapeHtml(props.infoLabel)}"
              >
                <span class="tracking-[0px]">i</span>
              </button>`
      : ''
    }
        <span class="h-px flex-1 bg-slate-200"></span>
      </div>

      <!-- Grid (zone items) -->
      <div class="mt-6">
        <div
          class="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-8
            gap-y-12
            rounded-xl
            p-6
            min-h-[200px]
          "
        >
          ${itemsHtml}
        </div>
      </div>

      <!-- Footer -->
      ${props.brandName
      ? `
          <div class="mt-6 flex flex-col items-center gap-3">
            <span class="font-jetbrains-mono text-xs font-semibold uppercase tracking-[0.45em] text-slate-700">
              ${escapeHtml(props.brandName)}
            </span>
            <span class="h-px w-full bg-slate-200"></span>
          </div>
        `
      : ''
    }

    </section>
  `
}
