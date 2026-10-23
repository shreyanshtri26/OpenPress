// src/helpers/renderers/renderStoryCard.ts
import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'
import { realText, realImage } from '../core/realValues'

type StoryCardProps = {
  id?: string
  storyId?: string
  imageUrl?: string
  label?: string
  title?: string
  description?: string
  __automaticEmpty?: boolean
}



export function renderStoryCard(props: StoryCardProps, ctx: RenderContext): string {
  if (props.__automaticEmpty) return '<div class="min-h-[2rem]"></div>'

  const story = props.storyId ? ctx.storiesById?.[props.storyId] : undefined

  const image = realImage(story?.image) || realImage(props.imageUrl) || '/openpress-share.png'

  const label =
    props.label ||
    story?.category ||
    'NEWS'

  const titleRaw = realText(props.title) || story?.headline || ''
  if (!story && !titleRaw) return ''

  const title = titleRaw

  const displayDescription =
    realText(props.description) ||
    realText(story?.summary) ||
    ''

  const html = displayDescription
    .split(/(<[^>]+>)/g)
    .map((part: string) =>
      part.startsWith('<')
        ? part
        : part.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>')
    )
    .join('')
  const normalizedDescription = html
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ')

  const publishUrl = story?.publishUrl

  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
<${Tag}
  class="relative w-full h-auto bg-white block ${publishUrl ? 'cursor-pointer' : ''
    } group"
  ${actionAttr}
>
  <div class="relative w-full">
    <div class="overflow-hidden bg-slate-100">
      <img
        src="${escapeHtml(image)}"
        alt="${escapeHtml(title)}"
        class="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        onerror="this.src='/openpress-share.png'"
      />
    </div>

    <div class="w-full bg-white">
      <div class="pt-3">
        <p class="text-black font-share border-black border-[0.5px] text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-[0.12em] px-1.5 py-1 w-fit">
          ${escapeHtml(label)}
        </p>

        <h2 class="text-[1.5rem] sm:text-3xl lg:text-[37px] mt-2 font-extrabold font-libre text-black leading-tight sm:leading-[2rem] lg:leading-[2.5rem] mb-2 line-clamp-4 group-hover:underline decoration-1 underline-offset-4">
          ${escapeHtml(title)}
        </h2>

        ${normalizedDescription ? `<p class="text-neutral-700 text-sm sm:text-base lg:text-[17px] leading-relaxed font-[Merriweather] line-clamp-3 text-left">
          ${normalizedDescription}
        </p>` : ''}
      </div>
    </div>
  </div>
</${Tag}>
`
}
