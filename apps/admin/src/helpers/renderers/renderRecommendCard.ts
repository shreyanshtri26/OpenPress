import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

export function renderRecommendCard(
  props: { storyId?: string; title?: string; label?: string; imageUrl?: string; imageAlt?: string; className?: string },
  ctx: RenderContext
): string {
  const story = props.storyId ? ctx.storiesById?.[props.storyId] : undefined
  const imageUrl = story?.imageUrl || story?.image || props.imageUrl || '/openpress-share.png'
  const imageAlt = props.imageAlt || story?.imageAlt || story?.title || story?.headline || 'Recommended article'
  const label = props.label || story?.section || story?.Section || story?.category || story?.taxonomyCategory || 'Category'
  const title = props.title || story?.headline || story?.title || 'Recommended Story'
  const publishUrl = story?.publishUrl
  const Tag = publishUrl ? 'a' : 'article'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="relative flex flex-col overflow-hidden block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity ${props.className ?? ''}"
      ${actionAttr}
    >
      <div class="aspect-[16/10] w-full overflow-hidden">
        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(imageAlt)}"
          class="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      </div>

      <div class="flex flex-1 flex-col py-2 pl-[32px] pr-[30px] sm:p-2 recommend-card-content">
        <p class="font-share text-[9px] sm:text-[10px] text-black uppercase pt-2 sm:pt-3 pb-0.5 ">
          ${escapeHtml(label)}
        </p>

        <p class="font-libre text-[1rem] sm:text-lg lg:text-[20px] font-extrabold text-black mb-1 sm:mb-2 leading-[1.2] lg:leading-[1.40rem]">
          ${escapeHtml(title)}
        </p>
      </div>
    </${Tag}>
  `
}
