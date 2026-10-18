import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'

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



  const rows: TableItemProps[][] = []
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2))
  }

  // Helper function to render mobile card item
  const renderMobileItem = (item: TableItemProps): string => {
    if (item.__automaticEmpty) return '<div class="min-h-[2rem]"></div>'

    const story = item.storyId
      ? ctx.storiesById?.[item.storyId]
      : null

    const displayText = story?.title || item.text

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
    <div class="max-w-5xl mx-auto bg-white">
      <!-- Desktop: Table layout (hidden on mobile) -->
      <div class="hidden md:flex min-h-[380px] lg:min-h-[490px] items-stretch">
        <table class="w-full border-collapse border border-gray-300 h-full table-fixed">
          <tbody class="h-full">
            ${rows
      .map(
        (row) => `
                <tr class="h-1/2">
                  ${row
            .map((item) => {
              if (item.__automaticEmpty) {
                return '<td class="min-h-[2rem]"></td>'
              }

              const story = item.storyId
                ? ctx.storiesById?.[item.storyId]
                : null

              const displayText = story?.title || item.text

              const publishUrl = story?.publishUrl

              const Tag = publishUrl ? 'a' : 'div'
              const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

              return `
                        <td class="border border-dotted border-gray-500 align-middle h-auto min-h-[100px] sm:min-h-[120px] lg:h-[128px] p-0">
                          <${Tag}
                            class="p-3 sm:p-4 lg:p-6 block h-full w-full ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''
                } transition-colors"
                            ${actionAttr}
                          >
                          <div class="flex items-stretch gap-3 sm:gap-4 lg:gap-6 h-full -mt-4 sm:-mt-6 lg:-mt-8">
                            <div class="flex-shrink-0 text-4xl sm:text-5xl lg:text-7xl font-bold text-black leading-none font-[Merriweather] flex items-center">
                              ${item.number}
                            </div>
                            <div class="flex-1 flex items-center mt-2 sm:mt-2.5 lg:mt-3">
                              <p class="text-sm sm:text-base lg:text-[21px] font-light leading-snug font-lato line-clamp-3">
                                ${escapeHtml(displayText)}
                              </p>
                            </div>
                          </div>
                          </${Tag}>
                        </td>
                      `
            })
            .join('')}
                  ${row.length === 1 ? `<td class="border border-gray-300 p-2 h-full"></td>` : ''}
                </tr>
              `
      )
      .join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile: Stacked card layout (hidden on desktop) -->
      <div class="md:hidden border border-gray-300">
        ${items.map((item) => renderMobileItem(item)).join('')}
      </div>
    </div>
  `
}
