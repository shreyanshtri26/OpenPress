import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

const recomCard = '/story-images/recomCard.svg'

export function renderStorySubCard(
  props: { id?: string; storyId?: string },
  ctx: RenderContext
): string {
  if (!props.storyId) {
    return `
      <div class="bg-gray-50 p-4 text-center">
        <p class="text-sm text-black">
          No story selected. Please choose one from the dropdown.
        </p>
      </div>
    `
  }

  const story = ctx.storiesById?.[props.storyId]
  if (!story) return ''

  const image = story.image || recomCard
  const category = story.section || 'Category'
  const title = story.title || 'Story Title'
  const publishUrl = story.publishUrl

  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <div id="${props.id ?? ''}">
      <div class="w-full">
        <${Tag}
          class="overflow-hidden border-b border-gray-400 bg-white block transition-all duration-300 ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''}"
          ${actionAttr}
        >
          <div class="flex items-center">
            <div class="flex-1 pb-4">
              <div class="font-share text-[9px] sm:text-[10px] text-black uppercase pt-4 pb-0.5">
                ${escapeHtml(category)}
              </div>
              <h2 class="font-libre text-lg sm:text-xl lg:text-[22px] font-extrabold text-black mb-2 leading-tight lg:leading-[1.60rem]">
                ${escapeHtml(title)}
              </h2>
            </div>

            <div class="ml-4 flex-shrink-0 h-16 flex items-center justify-center p-1">
              <img
                src="${image}"
                alt="${escapeHtml(story.imageAlt || 'Story image')}"
                class="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </${Tag}>
      </div>
    </div>
  `
}
