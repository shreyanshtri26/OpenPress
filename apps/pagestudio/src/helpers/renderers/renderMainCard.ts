import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'



export function renderMainCard(
  props: {
    storyId?: string
    imageUrl?: string
    label?: string
    title?: string
    description?: string
    __automaticEmpty?: boolean
  },
  ctx: RenderContext
): string {
  if (props.__automaticEmpty) return '<div class="min-h-[2rem]"></div>'

  const story = props.storyId ? ctx.storiesById?.[props.storyId] : null

  const displayImage = props.imageUrl || story?.imageUrl || story?.image || ''
  const displayLabel = props.label || story?.category || ''
  const displayTitle = props.title || story?.headline || ''
  const displayDescription = props.description || story?.summary || ''

  const html = (displayDescription || '')
    .split(/(<[^>]+>)/g) // keep tags intact
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
  class="relative w-full block bg-white ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''}"
  ${actionAttr}
>
  <img
    src="${escapeHtml(displayImage)}"
    alt="${escapeHtml(displayTitle)}"
    class="aspect-[3/2] w-full object-cover"
    loading="lazy"
  />

  <div class="w-full bg-white">
    <div class="pt-3">
      ${displayLabel
      ? `<p class="text-black font-share border-black border-[0.5px] text-[9px] sm:text-[10px]
                      lg:text-[11px] uppercase tracking-wide px-1 py-1 w-fit">
               ${escapeHtml(displayLabel)}
             </p>`
      : ''
    }

      <h2 class="text-[1.8rem] sm:text-3xl lg:text-[37px] mt-2 font-extrabold font-libre
                 text-black leading-[1.10] sm:leading-[2rem] lg:leading-[2.5rem] mb-2">
        ${escapeHtml(displayTitle)}
      </h2>

      <p class="text-black text-sm sm:text-base lg:text-[17px] font-[Merriweather]
                 text-left ">
        ${normalizedDescription}
      </p>
    </div>
  </div>
</${Tag}>
`
}
