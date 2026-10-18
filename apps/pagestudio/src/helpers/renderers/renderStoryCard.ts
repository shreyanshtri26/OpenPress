// src/helpers/renderers/renderStoryCard.ts
import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

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

  const image =
    story?.image ||
    props.imageUrl ||
    '/story-images/modi.png'

  const label =
    props.label ||
    story?.category ||
    'SELFIE WITH THE PM'

  const titleRaw =
    props.title ||
    story?.headline ||
    'A Government Shutdown, Weaponized'

  const title = titleRaw

  const displayDescription =
    props.description ||
    story?.summary ||
    'The president is boasting about doing things to Democrats that are bad for them and irreversible by them.'

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
  class="relative w-full h-auto min-h-[400px] sm:min-h-[500px] lg:h-[600px] bg-white overflow-hidden block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''
    } transition-opacity"
  ${actionAttr}
>
  <div class="relative w-full max-w-full xl:max-w-[750px] mx-auto aspect-video">
    <img
      src="${escapeHtml(image)}"
      alt="${escapeHtml(title)}"
      class="h-[250px] sm:h-[300px] lg:h-[400px] w-full object-cover"
      loading="lazy"
    />

    <div class="w-full h-auto xl:h-[191px] top-[200px] sm:top-[250px] lg:top-[350px] bg-white absolute p-3 sm:p-4 xl:p-0">
      <div class="py-2 sm:py-4">
        <p class="text-black font-share border-black border-[0.5px] text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-wide px-1 py-1 w-fit">
          ${escapeHtml(label)}
        </p>

        <h2 class="text-[1.5rem] sm:text-3xl lg:text-[37px] mt-2 font-extrabold font-libre text-black leading-tight sm:leading-[2rem] lg:leading-[2.5rem] mb-2">
          ${escapeHtml(title)}
        </h2>

        <p class="text-black text-sm sm:text-base lg:text-[17px] font-[Merriweather] line-clamp-3 text-left">
          ${normalizedDescription}
        </p>
      </div>
    </div>
  </div>
</${Tag}>
`
}
