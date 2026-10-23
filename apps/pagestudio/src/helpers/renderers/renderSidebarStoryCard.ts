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

  // Nothing chosen (or the story is gone): draw nothing rather than an editor hint on the live page.
  if (!story) return ''

  const publishUrl = story.publishUrl

  const Tag = publishUrl ? 'a' : 'article'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="block ${props.isFirst ? 'pt-0' : ''} ${props.isLast ? 'pb-0' : ''} ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${actionAttr}
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          ${story.category ? `<span class="font-share text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">${escapeHtml(story.category)}</span>` : ''}
          <h3 class="font-libre text-[17px] font-bold leading-snug text-slate-900 line-clamp-3">
            ${escapeHtml(story.headline)}
          </h3>
          ${story.author ? `<p class="font-share text-slate-600 uppercase text-[11px] tracking-wide">${escapeHtml(story.author)}</p>` : ''}
        </div>

        <img
          src="${escapeHtml(story.imageUrl || story.image || '/openpress-share.png')}"
          alt="${escapeHtml(story.imageAlt || '')}"
          class="h-[72px] w-24 flex-none rounded-sm object-cover"
          loading="lazy"
          onerror="this.style.display='none'"
        />
      </div>

      ${!props.isLast ? `<div class="w-full border-t border-slate-200 my-5"></div>` : ''}
    </${Tag}>
  `
}
