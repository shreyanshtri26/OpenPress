import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

type BottomCardProps = {
  id?: string
  storyId?: string
  imageUrl?: string
  title?: string
  description?: string
  date?: string
  readTime?: string
}

// Utility function to format date
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Jan 12, 2025'

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Jan 12, 2025'

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()

    return `${month} ${day}, ${year}`
  } catch {
    return 'Jan 12, 2025'
  }
}

// Read Time Calculator
function calculateReadTime(text: string = ""): string {
  const words = text.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(words / 220))
  return `${minutes} min read`
}

export function renderBottomCard(props: BottomCardProps, ctx: RenderContext): string {
  // Try to find story if storyId is provided
  const story = props.storyId ? ctx.storiesById?.[props.storyId] : undefined

  // Fallbacks similar to React component
  const displayImage = story?.imageUrl || props.imageUrl || '/story-images/modi.png'
  const displayTitle = props.title || story?.headline || 'Featured story'
  const displayDescription = props.description || story?.storySummary || 'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque elit quisque faucibus.'

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
  const displayDate = formatDate(props.date || story?.proposedFilingDate || story?.publishDate || story?.publishedAt || story?.createdAt || story?.updatedAt)
  let fallbackText = '';
  if (!story?.fullDescription) {
    if (story?.storySummary && typeof story.storySummary === 'string') {
      fallbackText = story.storySummary;
    } else if (story?.summary && typeof story.summary === 'string') {
      fallbackText = story.summary;
    } else if (story?.description?.blocks && Array.isArray(story.description.blocks)) {
      fallbackText = story.description.blocks
        .filter((block: any) => block?.data?.text)
        .map((block: any) => block.data.text)
        .join(' ')
        .replace(/<[^>]+>/g, '');
    } else if (typeof story?.description === 'string') {
      fallbackText = story.description;
    } else if (typeof story?.content === 'string') {
      fallbackText = story.content;
    }
  }

  const displayReadTime = story?.readTime || story?.READ_TIME || (story?.fullDescription
    ? calculateReadTime(story.fullDescription)
    : (fallbackText ? calculateReadTime(fallbackText) : (props.readTime || '1 min read')))

  const publishUrl = story?.publishUrl;

  const Tag = publishUrl ? 'a' : 'div'
  const actionAttr = publishUrl ? `href="${publishUrl}"` : ''

  return `
    <${Tag}
      class="flex flex-col lg:flex-row gap-4 bg-white border-b border-gray-200 pb-4 block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity"
      ${actionAttr}
    >
      <!-- Image Section - Stack on mobile, Left on desktop -->
      <div class="flex-shrink-0 w-full lg:w-[250px] h-auto aspect-video lg:h-[170px] overflow-hidden">
        <img
          src="${escapeHtml(displayImage)}"
          alt="${escapeHtml(displayTitle)}"
          class="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          loading="lazy"
        />
      </div>

      <!-- Content Section - Right Side -->
      <div class="flex-1 flex flex-col justify-between py-1">
        <!-- Title -->
        <h3 class="text-[22px] font-extrabold font-libre text-black leading-tight mb-2">
          ${escapeHtml(displayTitle)}
        </h3>

        <!-- Description -->
        <p class="text-m text-gray-700 font-[Merriweather] mb-3">
          ${normalizedDescription}
        </p>

        <!-- Meta Information -->
        <div class="flex items-center gap-2 font-share text-[12px] text-black">
          <span>${escapeHtml(displayDate)}</span>
          <span>|</span>
          <span>${escapeHtml(displayReadTime)}</span>
        </div>
      </div>
    </${Tag}>
  `
}
