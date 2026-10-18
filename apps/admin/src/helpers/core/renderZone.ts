import type { RenderContext } from './renderTypes'
import { ComponentRegistry } from '../registry/ComponentRegistry'
import { renderCampaign } from '../renderers/renderCampaign'
import { renderSpotlightAd } from '../renderers/renderSpotlightAd'

export function renderZone(params: {
  zonePrefix: string
  ctx: RenderContext
}): string {
  const { zonePrefix, ctx } = params
  const items = ctx.zones?.[zonePrefix] ?? []

  return items
    .map((item) => {
      let renderer = ComponentRegistry[item.type]

      if (!renderer && item.type.startsWith('Ad_')) {
        if (item.type.toLowerCase().includes('spotlight')) {
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
          renderer = (p: any, c: any) => renderCampaign({
            id: p.id,
            adId: p.adId,
            placementName: placementName,
            fallbackBlock: p.fallbackBlock,
            fallbackStoryId: p.fallbackStoryId,
            fallbackAllowed: p.fallbackAllowed,
            _autoFallbackStoryId: p._autoFallbackStoryId,
            _autoFallbackTitle: p._autoFallbackTitle,
            _autoFallbackLabel: p._autoFallbackLabel,
            _autoFallbackImageUrl: p._autoFallbackImageUrl,
            _autoFallbackPublishUrl: p._autoFallbackPublishUrl,
            desktopDimensions: p.desktopDimensions,
            mobileDimensions: p.mobileDimensions,
          }, c);
        }
      }

      if (!renderer) {
        console.warn(`No renderer registered for type: ${item.type}`)
        return ''
      }
      return renderer(item.props ?? {}, ctx)
    })
    .join('')
}

