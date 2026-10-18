import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

type ShowcaseCardItem = {
  storyId?: string
  title?: string
  category?: string
  __automaticEmpty?: boolean
}

type ShowcaseCardProps = {
  items?: ShowcaseCardItem[]
  noBorder?: boolean
}



export function renderShowcaseCard(
  props: ShowcaseCardProps,
  ctx: RenderContext
): string {
  const items = props.items ?? []
  const noBorder = props.noBorder ?? false

  if (!items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No featured cards added.
      </div>
    `
  }

  return `
    <div class="max-w-xl md:max-w-3xl lg:max-w-md mx-auto px-4 lg:px-0">
      ${items
      .map((item) => {
        if (item.__automaticEmpty) {
          return '<div class="min-h-[2rem]"></div>'
        }

        const story = item.storyId
          ? ctx.storiesById[item.storyId]
          : null

        const title = story?.title || item.title || 'Untitled'

        const category =
          story?.category || item.category || 'Category'

        const publishUrl = story?.publishUrl || ''

        const Tag = publishUrl ? 'a' : 'div'
        const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

        return `
            <${Tag}
              class="${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} py-3 px-0 block ${publishUrl ? 'cursor-pointer' : ''
          } transition-colors"
              ${actionAttr}
            >
              <p class="text-[9px] sm:text-[10px] font-share text-black uppercase">
                ${escapeHtml(category)}
              </p>
              <h2 class="text-[1rem] sm:text-base lg:text-[17px] font-libre text-black leading-tight lg:leading-[1.15rem]">
                ${escapeHtml(title)}
              </h2>
            </${Tag}>
          `
      })
      .join('')}
    </div>
  `
}
