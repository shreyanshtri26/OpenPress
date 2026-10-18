import { ComponentRegistry } from '../registry/ComponentRegistry'
import { renderDynamicAd } from '../renderers/renderDynamicAd'
import { renderSpotlightAd } from '../renderers/renderSpotlightAd'
import type { MoreStoriesInjection, RenderContext } from './renderTypes'

export function renderZone(params: {
  zonePrefix: string
  ctx: RenderContext
}): string {
  const { zonePrefix, ctx } = params
  const items = ctx.zones?.[zonePrefix] ?? []

  // Pre-scan ALL zones on the page (not just this one) for BlogMoreStoriesCard
  // blocks with insertAfterParagraph > 0. The Puck editor's portal-based preview
  // injects the widget into the article body regardless of which zone/column it
  // was dropped in, so this must mirror that — otherwise a widget dropped into a
  // different zone than the body would be silently suppressed and never
  // re-rendered anywhere on the published page.
  const moreStoriesInjections: MoreStoriesInjection[] = Object.values(ctx.zones ?? {})
    .flat()
    .filter(
      (item) =>
        item?.type === 'BlogMoreStoriesCard' &&
        Number((item.props as any)?.insertAfterParagraph) > 0
    )
    .map((item) => ({
      insertAfterParagraph: Number((item.props as any).insertAfterParagraph),
      stories: (item.props as any)?.stories || [],
      id: (item.props as any)?.id,
      headingColor: (item.props as any)?.headingColor,
    }))

  const zoneCtx: RenderContext =
    moreStoriesInjections.length > 0
      ? { ...ctx, moreStoriesInjections }
      : ctx

  return items
    .map((item) => {
      // Suppress BlogMoreStoriesCard items that will be injected inline by body
      // renderer (page-wide, so this applies even if the widget lives in a
      // different zone than the article body).
      if (
        item.type === 'BlogMoreStoriesCard' &&
        Number((item.props as any)?.insertAfterParagraph) > 0 &&
        moreStoriesInjections.length > 0
      ) {
        return ''
      }

      let renderer = ComponentRegistry[item.type] as any

      if (!renderer && item.type.startsWith('Ad_')) {
        if (item.type.toLowerCase().includes('spotlight')) {
          // Spotlight Ad blocks need the scroll-snap interscroller renderer
          renderer = (p: any, c: any) => renderSpotlightAd(
            {
              id: p.id,
              adId: p.adId,
              linkUrl: p.linkUrl,
              altText: p.altText,
              fallbackStoryId: p.fallbackStoryId,
              fallbackAllowed: p.fallbackAllowed,
              _autoFallbackStoryId: p._autoFallbackStoryId,
              _autoFallbackTitle: p._autoFallbackTitle,
              _autoFallbackLabel: p._autoFallbackLabel,
              _autoFallbackImageUrl: p._autoFallbackImageUrl,
              _autoFallbackPublishUrl: p._autoFallbackPublishUrl,
            },
            c
          );
        } else {
          const placementName = item.type.replace('Ad_', '').replace(/_/g, ' ');
          renderer = (p: any, c: any) => renderDynamicAd({
            ...p,
            placementName: p.placementName || placementName
          }, c);
        }
      }

      if (!renderer) {
        console.warn(`No renderer registered for type: ${item.type}`)
        return ''
      }
      return renderer(item.props ?? {}, zoneCtx)
    })
    .join('')
}
