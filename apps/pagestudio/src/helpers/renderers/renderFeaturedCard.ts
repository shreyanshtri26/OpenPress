// src/helpers/renderers/renderFeaturedCard.ts

import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

type FeaturedCardItem = {
  storyId?: string
  title?: string
  category?: string
}

type FeaturedCardProps = {
  items?: FeaturedCardItem[]
}



export function renderFeaturedCard(
  props: FeaturedCardProps,
  ctx: RenderContext
): string {
  const items = props.items ?? []

  if (!items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No featured cards added. Please add some cards in the editor.
      </div>
    `
  }

  return `
    <div class="w-full lg:max-w-md mx-auto px-4 lg:px-0">
      ${items
      .map((item) => {
        const story = item.storyId ? ctx.storiesById?.[item.storyId] : null
        const title = story?.headline || item.title || ''
        if (!story && !title) return ''
        const category = story?.category || item.category || ''
        const publishUrl = story?.publishUrl

        const Tag = publishUrl ? 'a' : 'div'
        const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

        return `
            <${Tag}
              class="border-b border-gray-400 last:border-b-0 lg:last:border-b py-3 sm:py-5 px-0 block ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''
          }"
              ${actionAttr}
            >
              ${category
            ? `<div class="text-[9px] sm:text-[10px] font-share text-black uppercase">
                      ${escapeHtml(category)}
                    </div>`
            : ''
          }
              <h2 class="text-[1.1rem] sm:text-lg lg:text-[19px] font-libre font-normal text-black leading-tight mt-1">
                ${escapeHtml(title)}
              </h2>
            </${Tag}>
          `
      })
      .join('')}
    </div>
  `
}
