// src/helpers/renderers/renderMultimediaCard.ts

import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'

export function renderMultimediaCard(
  props: {
    id?: string
    storyId?: string
    imageUrl?: string
    title?: string
    description?: string
    author?: string
    duration?: string
  },
  ctx: RenderContext
): string {
  const story = props.storyId ? ctx.storiesById?.[props.storyId] : null

  const imageUrl = props.imageUrl || story?.image || '/openpress-share.png'
  const title = props.title || story?.headline || ''
  if (!story && !title) return ''
  const description =
    props.description || story?.summary || ''
  const author = props.author || story?.author || ''
  const duration = props.duration || ''
  const publishUrl = story?.publishUrl

  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
<${Tag}
  class="relative w-full overflow-hidden block flex flex-col lg:flex-row h-auto lg:h-[500px] ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
  ${actionAttr}
>

  <div class="relative w-full lg:w-[45%] h-[400px] lg:h-full overflow-hidden">
    <img
      src="${escapeHtml(imageUrl)}"
      alt="${escapeHtml(title)}"
      class="w-full h-full object-cover"
      loading="lazy"
    />
    <div class="absolute inset-0 flex items-center justify-center">
      <svg class="w-20 h-20 text-white opacity-95" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
      </svg>
    </div>
  </div>

  <div class="w-full lg:w-[55%] p-4 lg:py-0 lg:pl-8 lg:pr-8 flex flex-col h-full">
    <div class="flex flex-col gap-2 flex-grow">
      <span class="text-black font-share border-black border text-[10px] uppercase tracking-wide px-2 w-fit">
        VIDEOS
      </span>

      <h2 class="font-libre text-[20px] font-extrabold text-black mb-2 leading-[1.40rem]">
        ${escapeHtml(title)}
      </h2>

      ${description ? `<p class="text-black text-[16px] font-[Merriweather] line-clamp-5 leading-[21px]">
        ${escapeHtml(description)}
      </p>` : ''}
    </div>

    ${author || duration ? `<div class="flex items-center font-share text-sm text-black uppercase tracking-wide -mb-1">
      ${author ? `<span class="text-[14px]">AUTHOR ${escapeHtml(author)}</span>` : ''}
      ${author && duration ? '<span class="mx-1">|</span>' : ''}
      ${duration ? `<span class="lowercase text-[14px]">${escapeHtml(duration)}</span>` : ''}
    </div>` : ''}
  </div>

</${Tag}>
`
}
