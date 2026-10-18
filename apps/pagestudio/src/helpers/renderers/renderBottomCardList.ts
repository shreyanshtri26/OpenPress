import type { RenderContext } from '../core/renderTypes'
import { getStories } from '../../components/PuckEditor/storyData'
import { renderBottomCard } from './renderBottomCard'

type BottomCardListProps = {
  id?: string
}

export function renderBottomCardList(props: BottomCardListProps, _ctx?: RenderContext): string {
  // Get stories from context
  const contextStories = _ctx?.storiesById ? Object.values(_ctx.storiesById) : []
  const rawStories = contextStories.length > 0 ? contextStories : getStories()

  // Filter by active section if we are in a section context
  // Only filter if the activeSection is a valid taxonomy section (present in ctx.sections)
  const isTaxonomySection = _ctx?.sections?.some(s => s.toUpperCase() === _ctx.activeSection?.toUpperCase());

  const filterByAuthor = _ctx?.authorId || _ctx?.authorName;

  const filteredStories = filterByAuthor
    ? rawStories.filter((s: any) => {
      // Match by authorId, plain author/authorName field, or byLine array — same rule as OpenPress/lib/helpers/renderFunctions.js
      const sAuthorId = String(s.authorId || '').trim().toLowerCase();
      const expectedId = String(_ctx?.authorId || '').trim().toLowerCase();
      const matchedById = sAuthorId !== '' && expectedId !== '' && sAuthorId === expectedId;

      const expectedName = String(_ctx?.authorName || '').trim().toLowerCase();
      const sAuthorName = String(s.authorName || s.author || '').trim().toLowerCase();
      const matchedByName = expectedName !== '' && sAuthorName === expectedName;

      const bylineEntries = Array.isArray(s.byLine)
        ? s.byLine
        : Array.isArray(s.byline)
          ? s.byline
          : [];

      const matchedByLine = expectedName !== '' && bylineEntries.some((name: string) => {
        const normalizedBylineName = String(name || '').trim().toLowerCase();
        return normalizedBylineName !== '' && normalizedBylineName === expectedName;
      });

      return matchedById || matchedByName || matchedByLine;
    })
    : (isTaxonomySection && _ctx?.activeSection && _ctx.activeSection !== 'HOME'
      ? rawStories.filter((s: any) =>
        (s.kicker?.toUpperCase() === _ctx.activeSection?.toUpperCase()) ||
        (s.category?.toUpperCase() === _ctx.activeSection?.toUpperCase()) ||
        (s.section?.toUpperCase() === _ctx.activeSection?.toUpperCase())
      )
      : rawStories);

  // Sort by createdAt (newest to oldest)
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
      >
        ${renderBottomCard({ storyId: story.id }, _ctx)}
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
