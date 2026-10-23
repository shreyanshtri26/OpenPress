import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

type ShowcaseCardItem = {
  storyId?: string
  title?: string
  category?: string
  __automaticEmpty?: boolean
}

type ShowcaseCardProps = {
  items?: ShowcaseCardItem[]
  noBorder?: boolean
}



export function renderShowcaseCard(
  props: ShowcaseCardProps,
  ctx: RenderContext
): string {
  const items = props.items ?? []
  const noBorder = props.noBorder ?? false

  if (!items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No featured cards added.
      </div>
    `
  }

  return `
    <div class="w-full">
      ${items
      .map((item) => {
        if (item.__automaticEmpty) {
          return '<div class="min-h-[2rem]"></div>'
        }

        const story = item.storyId
          ? ctx.storiesById[item.storyId]
          : null

        const title = story?.title || item.title || ''
        if (!story && !title) return ''

        const category =
          story?.category || item.category || ''

        const image = story?.image || story?.imageUrl || ''
        const author = story?.author && story.author !== 'Unknown Author' ? story.author : ''
        const publishUrl = story?.publishUrl || ''

        const Tag = publishUrl ? 'a' : 'div'
        const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

        // Text on the left, a small square-ish thumbnail on the right (when the story has an image): the row reads as a
        // headline list but each story still has a picture to catch the eye. The thumbnail has a fixed size so rows align.
        return `
            <${Tag}
              class="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 ${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} py-4 ${publishUrl ? 'cursor-pointer' : ''}"
              ${actionAttr}
            >
              <div class="min-w-0">
                ${category ? `<p class="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-share text-black uppercase tracking-wide">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-black" aria-hidden="true"></span>${escapeHtml(category)}
                </p>` : ''}
                <h2 class="mt-1.5 line-clamp-3 text-[1.05rem] sm:text-[1.1rem] lg:text-[18px] font-libre font-bold text-black leading-snug group-hover:underline">
                  ${escapeHtml(title)}
                </h2>
                ${author ? `<p class="mt-2 text-[10px] font-share text-black uppercase tracking-wide opacity-70">${escapeHtml(author)}</p>` : ''}
              </div>
              ${image ? `<img
                src="${escapeHtml(image)}"
                alt=""
                class="h-[72px] w-[96px] flex-none rounded-[10px] object-cover"
                loading="lazy"
                onerror="this.style.display='none'"
              />` : ''}
            </${Tag}>
          `
      })
      .join('')}
    </div>
  `
}
