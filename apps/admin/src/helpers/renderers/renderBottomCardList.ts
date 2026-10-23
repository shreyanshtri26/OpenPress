import type { RenderContext } from '../core/renderTypes'
import { renderBottomCard } from './renderBottomCard'

type BottomCardListProps = {
  id?: string
}

export function renderBottomCardList(props: BottomCardListProps, ctx: RenderContext): string {
  // Get stories from context
  const rawStories = ctx.storiesById ? Object.values(ctx.storiesById) : []

  // Filter by active section if we are in a section context
  // Only filter if the activeSection is a valid taxonomy section (present in ctx.sections)
  const isTaxonomySection = ctx.sections?.some(s => s.toUpperCase() === ctx.activeSection?.toUpperCase());

  const filterByAuthor = ctx.authorId || ctx.authorName;

  const filteredStories = filterByAuthor
    ? rawStories.filter((s: any) => {
      // Match ONLY by normalized name in byLine array
      const expectedName = String(ctx.authorName || '').trim().toLowerCase();
      if (expectedName === '') return false;

      const bylineEntries = Array.isArray(s.byLine)
        ? s.byLine
        : Array.isArray(s.byline)
          ? s.byline
          : [];

      // Filter by exact byline membership (case-insensitive)
      return bylineEntries.some((name: string) => {
        const normalizedBylineName = String(name || '').trim().toLowerCase();
        return normalizedBylineName !== '' && normalizedBylineName === expectedName;
      }) || false;
    })
    : (isTaxonomySection && ctx.activeSection && ctx.activeSection !== 'HOME'
      ? rawStories.filter((s: any) =>
        (s.kicker?.toUpperCase() === ctx.activeSection?.toUpperCase()) ||
        (s.category?.toUpperCase() === ctx.activeSection?.toUpperCase()) ||
        (s.section?.toUpperCase() === ctx.activeSection?.toUpperCase())
      )
      : rawStories);

  // Sort by proposedFilingDate (newest to oldest) - Synced with Page Studio
  const sortedStories = [...filteredStories].sort((a, b: any) => {
    const dateA = new Date(a.proposedFilingDate || a.publishDate || a.publishedAt || a.createdAt || a.updatedAt || 0).getTime()
    const dateB = new Date(b.proposedFilingDate || b.publishDate || b.publishedAt || b.createdAt || b.updatedAt || 0).getTime()
    return dateB - dateA
  })

  // Generate a unique ID for this instance to scope the script
  const instanceId = `bottom-card-list-${Math.random().toString(36).substr(2, 9)}`
  const initialVisibleCount = 10
  const hasMore = sortedStories.length > initialVisibleCount

  const cardsHtml = sortedStories.map((story, index) => {
    const isHidden = index >= initialVisibleCount
    // We wrap in a div that controls visibility
    return `
      <div 
        class="${isHidden ? 'hidden-story' : ''}" 
        style="${isHidden ? 'display: none;' : ''}"
        data-story-id="${story.id}"
      >
        ${renderBottomCard({ storyId: story.id }, ctx)}
      </div>
    `
  }).join('')

  return `
    <div id="${props.id ?? instanceId}" class="flex flex-col gap-6 relative">
      <div id="${instanceId}-container" class="flex flex-col gap-6">
        ${cardsHtml}
      </div>
      
      ${hasMore ? `
        <button
          id="${instanceId}-btn"
          class="mt-1 px-4 h-[25px] font-share border border-gray-700 text-gray-700 font-semibold transition-colors duration-200 self-center hover:bg-gray-100"
        >
          LOAD MORE
        </button>

        <script>
          (function() {
            var container = document.getElementById('${instanceId}-container');
            var btn = document.getElementById('${instanceId}-btn');
            
            if (container && btn) {
              btn.addEventListener('click', function() {
                var hiddenItems = container.querySelectorAll('.hidden-story');
                var count = 0;
                
                for (var i = 0; i < hiddenItems.length; i++) {
                  if (count >= 10) break;
                  hiddenItems[i].style.display = 'block';
                  hiddenItems[i].classList.remove('hidden-story');
                  count++;
                }
                
                // Check if any hidden items remain
                var remainingHidden = container.querySelectorAll('.hidden-story').length;
                if (remainingHidden === 0) {
                  btn.style.display = 'none';
                }
              });
            }
          })();
        </script>
      ` : ''}
    </div>
  `
}
