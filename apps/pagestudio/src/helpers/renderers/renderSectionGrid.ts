import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'
import { resolveActiveSpotlightCampaign, buildSpotlightDesktopFallbackHtml } from './spotlightSidebarAd'

export function renderSectionGrid(
  props: {
    id?: string
    className?: string
  },
  ctx: RenderContext
): string {
  // Define zones matching SectionGrid.tsx structure
  // The prefix in React is `section-grid-${zoneName}`

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

  // ─── Spotlight Ad — desktop sidebar card (matches PopularBlogCard) ────────
  // The "Blog" page's single-article template actually renders through
  // SectionGrid (not BlogGrid), so this is where the desktop Spotlight
  // fallback card must live. Only shown when viewing a single story
  // (ctx.currentStory truthy) — never on Section/Home listing pages that
  // also use SectionGrid. Mobile is unaffected (cover-stack slider is
  // injected inline into the article body by renderBlogBodyCard).
  // `ctx.claimSpotlightSidebarAd()` guards against duplicate rendering when
  // more than one SectionGrid (or a SectionGrid alongside BlogGrid) appears
  // on the same page — only the first to render claims the slot.
  const { job: spotlightSidebarJob, campaign: spotlightSidebarCampaign } = (ctx?.currentStory && ctx?.claimSpotlightSidebarAd?.() !== false)
    ? resolveActiveSpotlightCampaign(ctx?.campaigns || [])
    : { job: null, campaign: null }
  const spotlightSidebarAdHtml = spotlightSidebarJob
    ? buildSpotlightDesktopFallbackHtml(spotlightSidebarJob, spotlightSidebarCampaign)
    : ''

  const hasAny = !!(leftTop1 || right1 || right2 || right3 || right4 || right5 || spotlightSidebarAdHtml)
  if (!hasAny) return ''

  return `
    <section id="${props.id ?? ''}" class="w-full bg-white lg:pt-8 pb-12 ${props.className ?? ''}">
      <div class="op-container">
        <div class="flex flex-col lg:flex-row gap-8 lg:gap-0">

          <!-- LEFT COLUMN - Only Top Bar -->
          <div class="w-full flex flex-col gap-2">
            <!-- Top bar 1 -->
            <div class="h-auto w-full min-h-[2.2rem]">
              ${leftTop1}
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="w-full lg:w-[30%] flex flex-col gap-5">

            <!-- Spotlight Ad — sticky at the top of the column at a lower top
                 offset/z-index than the sticky block below. As the user
                 scrolls, the sticky right-5 block (higher z-index, larger
                 top offset) catches up and slides over/covers it. -->
            ${spotlightSidebarAdHtml ? `<div class="relative lg:sticky lg:top-[96px] lg:self-start z-0 w-full lg:max-w-md hidden lg:block" data-ad-block="Spotlight-Sidebar">${spotlightSidebarAdHtml}</div>` : ''}

            <!-- STICKY SECTION - keeps the remaining right-column cards pinned
                 together and above the Spotlight card as the page scrolls. -->
            <div class="lg:sticky lg:top-[96px] lg:self-start bg-white z-10 flex flex-col gap-5">
              <!-- Tall block -->
              <div class="h-auto">
                ${right1}
              </div>

              <!-- Small block -->
              <div >
                <div class="h-auto">
                  ${right2}
                </div>


                <!-- Small block -->
                <div class="h-auto">
                  ${right3}
                </div>
              </div>

              <!-- Small block -->
              <div class="h-auto -mt-3 ">
                ${right4}
              </div>

              <!-- Tall bottom block -->
              <div class="h-auto">
                ${right5}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `
}
