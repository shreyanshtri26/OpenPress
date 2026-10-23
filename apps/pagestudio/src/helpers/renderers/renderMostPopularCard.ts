import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'
import { realText } from '../core/realValues'

type TableItemProps = {
  number: number
  text: string
  storyId?: string
  __automaticEmpty?: boolean
}

export function renderMostPopularCard(
  props: {
    id?: string
    items?: TableItemProps[]
  },
  ctx: RenderContext
): string {
  const items = props.items ?? []



  // Helper function to render mobile card item
  const renderMobileItem = (item: TableItemProps): string => {
    if (item.__automaticEmpty) return '<div class="min-h-[2rem]"></div>'

    const story = item.storyId
      ? ctx.storiesById?.[item.storyId]
      : null

    const displayText = story?.title || realText(item.text)
    if (!displayText) return ''

    const publishUrl = story?.publishUrl

    const Tag = publishUrl ? 'a' : 'div'
    const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

    return `
      <${Tag}
        class="border-b border-dotted border-gray-500 p-4 block ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors"
        ${actionAttr}
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 text-4xl font-bold text-black leading-none font-[Merriweather] pt-1">
            ${item.number}
          </div>
          <div class="flex-1">
            <p class="text-[1.10rem] font-light leading-tight font-lato line-clamp-3">
              ${escapeHtml(displayText)}
            </p>
          </div>
        </div>
      </${Tag}>
    `
  }

  return `
    <div class="w-full bg-white">
      <!-- Desktop: two-column grid (hidden on mobile) -->
      <div class="mp-list hidden md:grid grid-cols-2 border-t border-l border-gray-300">
        ${items
          .map((item) => {
            if (item.__automaticEmpty) return '<div class="border-b border-r border-gray-300 min-h-[104px]"></div>'
            const story = item.storyId ? ctx.storiesById?.[item.storyId] : null
            const displayText = story?.title || realText(item.text)
            if (!displayText) return '<div class="border-b border-r border-gray-300 min-h-[104px]"></div>'
            const publishUrl = story?.publishUrl
            const Tag = publishUrl ? 'a' : 'div'
            const actionAttr = publishUrl ? `href="${publishUrl}"` : ''
            return `<${Tag} class="border-b border-r border-gray-300 flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-5 min-h-[104px] lg:min-h-[120px] ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors" ${actionAttr}>
              <div class="w-12 lg:w-16 flex-none text-center text-4xl lg:text-6xl font-bold text-black leading-none font-[Merriweather]">${item.number}</div>
              <p class="min-w-0 flex-1 text-base lg:text-[20px] font-normal leading-snug font-lato line-clamp-3">${escapeHtml(displayText)}</p>
            </${Tag}>`
          })
          .join('')}
        ${items.length % 2 === 1 ? '<div class="border-b border-r border-gray-300"></div>' : ''}
      </div>

      <!-- Mobile: Stacked card layout (hidden on desktop) -->
      <div class="md:hidden border border-gray-300">
        ${items.map((item) => renderMobileItem(item)).join('')}
      </div>
    </div>
  `
}
