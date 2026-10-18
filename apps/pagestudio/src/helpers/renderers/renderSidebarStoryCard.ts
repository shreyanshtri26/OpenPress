import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

export function renderSidebarStoryCard(
  props: {
    id?: string
    storyId: string
    isFirst?: boolean
    isLast?: boolean
  },
  ctx: RenderContext
): string {
  const story = ctx.storiesById?.[props.storyId]

  if (!story) {
    return `
      <article class="p-4 border border-slate-200 rounded">
        <p class="text-slate-500 text-sm">No story selected</p>
      </article>
    `
  }

  const publishUrl = story.publishUrl

  const Tag = publishUrl ? 'a' : 'article'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="block ${props.isFirst ? 'pt-0' : ''} ${props.isLast ? 'pb-0' : ''} ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${actionAttr}
    >
      <div class="flex overflow-hidden items-center justify-between gap-5">
        <div class="flex flex-col">
          <h3 class="font-cormorant-garamond text-xl font-semibold leading-snug text-slate-900 mb-4 px-2 py-1">
            ${escapeHtml(story.headline)}
          </h3>
          <p class="font-jetbrains-mono text-black uppercase text-[12px] font-medium">
            ${escapeHtml(story.author)}
          </p>
        </div>

        <img
          src="${escapeHtml(story.imageUrl)}"
          alt="${escapeHtml(story.imageAlt || '')}"
          class="h-20 w-50 object-cover shadow-sm md:h-20"
          loading="lazy"
        />
      </div>

      ${!props.isLast ? `<div class="w-full border-t border-slate-300 my-5"></div>` : ''}
    </${Tag}>
  `
}
