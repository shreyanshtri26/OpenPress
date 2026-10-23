import type { RenderContext } from '../core/renderTypes'
import { escapeHtml } from '../core/escapeHtml'

type HoverCardItem = {
  storyId?: string
  hoverBgColor?: string
  defaultOpenState?: 'open' | 'close'
  title?: string
  category?: string
  __automaticEmpty?: boolean
}

type HoverCardProps = {
  items?: HoverCardItem[]
  noBorder?: boolean
}

export function renderHoverCard(
  props: HoverCardProps,
  ctx: RenderContext
): string {
  const items = props.items ?? []
  const noBorder = props.noBorder ?? false
  const expandedHeight = 320
  const defaultOpenIndex = items.findIndex((item) => item.defaultOpenState === 'open')
  const containerId = `openPress-hover-cards-${Math.random().toString(36).slice(2, 10)}`

  if (!items.length) {
    return `
      <div class="p-4 text-gray-500 italic">
        No hover cards added.
      </div>
    `
  }

  return `
    <div id="${containerId}" class="max-w-xl md:max-w-3xl lg:max-w-md mx-auto px-4 lg:px-0" data-default-open-index="${defaultOpenIndex}">
      ${items
      .map((item, index) => {
        if (item.__automaticEmpty) {
          return '<div class="min-h-[2rem]"></div>'
        }

        const story = item.storyId ? ctx.storiesById[item.storyId] : null

        const title = story?.title || item.title || ''
        if (!story && !title) return ''
        const rawCategory = (story?.category ?? item.category ?? '').toString().trim()
        const category = rawCategory
        const imageUrl = story?.image || '/openpress-share.png'
        const imageAlt = story?.title || title
        const publishUrl = story?.publishUrl || ''
        const hoverBgColor = item.hoverBgColor || '#ffffff'
        const isInitiallyExpanded = index === defaultOpenIndex

        const expandedTag = publishUrl ? 'a' : 'article'
        const expandedActionAttr = publishUrl ? `href="${escapeHtml(publishUrl)}"` : ''
        const collapsedActionAttr = publishUrl ? `href="${escapeHtml(publishUrl)}"` : ''
        const collapsedTag = publishUrl ? 'a' : 'div'

        return `
            <div class="openPress-hover-card-item ${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} relative px-0 py-3 block sm:overflow-hidden h-auto ${isInitiallyExpanded ? 'sm:h-[320px]' : 'sm:h-[120px]'}" data-hover-index="${index}" style="${isInitiallyExpanded ? `height: ${expandedHeight}px;` : ''}">
              <${collapsedTag} class="openPress-hover-collapsed block ${publishUrl ? 'cursor-pointer' : ''}" ${collapsedActionAttr} style="display: ${isInitiallyExpanded ? 'none' : 'flex'}; flex-direction: column; justify-content: flex-start; ${isInitiallyExpanded ? 'opacity: 0; transform: translateY(-8px); pointer-events: none;' : ''}">
                <p class="text-[9px] sm:text-[10px] font-share text-black uppercase" style="margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(category)}
                </p>
                <h2 class="openPress-hover-title text-[1rem] sm:text-base lg:text-[17px] font-libre text-black leading-tight lg:leading-[1.15rem] ${publishUrl ? 'cursor-pointer' : ''}" style="margin: 4px 0 0 0;">
                  ${escapeHtml(title)}
                </h2>
              </${collapsedTag}>

              <${expandedTag}
                class="openPress-hover-expanded ${isInitiallyExpanded ? 'relative opacity-100' : 'absolute opacity-0 pointer-events-none'} sm:absolute sm:inset-x-0 ${index === 0 ? 'sm:top-0' : 'sm:top-[12px]'} sm:bottom-0 flex flex-col overflow-hidden block ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity duration-[350ms] ease-in-out"
                data-hover-expanded="true"
                style="background-color: ${escapeHtml(hoverBgColor)};"
                ${expandedActionAttr}
              >
                <div class="aspect-[16/10] w-full overflow-hidden flex-shrink-0">
                  <img
                    src="${escapeHtml(imageUrl)}"
                    alt="${escapeHtml(imageAlt)}"
                    class="h-full w-full object-cover transition-opacity duration-200"
                    loading="lazy"
                  />
                </div>

                <div class="flex flex-1 flex-col py-2 pl-[32px] pr-[30px] sm:p-2 recommend-card-content">
                  <p class="font-share text-[9px] sm:text-[10px] text-black line-clamp-2 uppercase pt-2 sm:pt-3 pb-0.5">
                    ${escapeHtml(category)}
                  </p>

                  <p class="font-libre text-[1.5rem] sm:text-lg lg:text-[20px] font-extrabold text-black mb-2 leading-tight lg:leading-[1.40rem]">
                    ${escapeHtml(title)}
                  </p>
                </div>
              </${expandedTag}>
            </div>
          `
      })
      .join('')}
    </div>
    <script>
      (function() {
        const container = document.getElementById('${containerId}');
        if (!container) return;

        const items = Array.from(container.querySelectorAll('.openPress-hover-card-item'));
        const defaultIndexRaw = container.getAttribute('data-default-open-index');
        const defaultIndex = defaultIndexRaw !== null ? Number(defaultIndexRaw) : -1;
        const mobileQuery = window.matchMedia('(max-width: 639px)');

        const setActive = (index) => {
          const isMobileView = mobileQuery.matches;

          items.forEach((item, i) => {
            const collapsed = item.querySelector('.openPress-hover-collapsed');
            const expanded = item.querySelector('.openPress-hover-expanded');
            const isActive = i === index;

            item.style.height = isActive ? (isMobileView ? 'auto' : '${expandedHeight}px') : (isMobileView ? 'auto' : '120px');
            item.style.overflow = isMobileView ? '' : 'hidden';
            item.style.transition = isMobileView ? '' : 'height 200ms ease-in-out';
            if (collapsed) {
              collapsed.style.display = isActive ? 'none' : 'flex';
              collapsed.style.position = isMobileView ? '' : 'absolute';
              collapsed.style.left = isMobileView ? '' : '0';
              collapsed.style.right = isMobileView ? '' : '0';
              collapsed.style.top = isMobileView ? '' : '12px';
              collapsed.style.bottom = isMobileView ? '' : '16px';
              collapsed.style.opacity = isActive ? '0' : '1';
              collapsed.style.transform = isActive ? 'translateY(-8px)' : 'translateY(0)';
              collapsed.style.pointerEvents = isActive ? 'none' : 'auto';
              collapsed.style.transition = isMobileView ? '' : 'opacity 100ms ease-out, transform 100ms ease-out';
            }
            if (expanded) {
              expanded.style.position = isMobileView ? (isActive ? 'relative' : 'absolute') : 'absolute';
              expanded.style.opacity = isActive ? '1' : '0';
              expanded.style.pointerEvents = isActive ? 'auto' : 'none';
              expanded.style.top = isMobileView ? (isActive ? '0' : '0') : (i === 0 ? '0' : '12px');
            }
          });
        };

        items.forEach((item, index) => {
          const title = item.querySelector('.openPress-hover-title');
          const expanded = item.querySelector('.openPress-hover-expanded');

          if (title) {
            title.addEventListener('mouseenter', () => {
              if (!mobileQuery.matches) setActive(index);
            });
            title.addEventListener('focus', () => {
              if (!mobileQuery.matches) setActive(index);
            });
          }

          if (expanded) {
            expanded.addEventListener('mouseenter', () => {
              if (!mobileQuery.matches) setActive(index);
            });
          }
        });

        const syncFromViewport = () => {
          setActive(defaultIndex >= 0 ? defaultIndex : -1);
        };

        if (typeof mobileQuery.addEventListener === 'function') {
          mobileQuery.addEventListener('change', syncFromViewport);
        } else if (typeof mobileQuery.addListener === 'function') {
          mobileQuery.addListener(syncFromViewport);
        }

        setActive(defaultIndex >= 0 ? defaultIndex : -1);
      })();
    </script>
  `
}
