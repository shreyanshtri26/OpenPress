import { escapeHtml } from '../core/escapeHtml';

export function renderBlogMoreStoriesCard(props: {
    id?: string;
    headingColor?: string;
    stories?: Array<{ id?: string; headline?: string; title?: string; publishUrl?: string; redirectUrl?: string; summary?: string; storySummary?: string }>;
}): string {
    const { id, stories = [] } = props || {};
    // "Default Color" stores '' — leave border-color unset so the Tailwind grey shows
    const headingColor = props?.headingColor || '';
    const borderStyle = headingColor ? `border-color:${escapeHtml(headingColor)};` : '';
    const accentColor = escapeHtml(headingColor || '#9ca3af');

    const itemsHtml = stories.length
        ? stories
            .map((story, idx) => {
                const headline = escapeHtml(story?.headline || story?.title || 'Untitled Story');
                const href = escapeHtml(story?.publishUrl || story?.redirectUrl || '#');
                const summaryText = story?.summary || story?.storySummary || "";
                const summarySpan = summaryText ? `<span class="font-normal text-gray-800"> ${escapeHtml(summaryText)}</span>` : "";
                return `<a key="${idx}" href="${href}" target="_blank" rel="noopener noreferrer" class="group block text-black hover:text-gray-600 underline decoration-gray-400 hover:decoration-[var(--more-stories-accent)] hover:decoration-2 underline-offset-4 transition-all">
            <p class="text-[#222] text-[16px] md:text-[18px] leading-[1.6] inline">
              <strong class="font-bold text-black">${headline}</strong>${summarySpan}
            </p>
          </a>`;
            })
            .join('')
        : `<p class="font-sans text-gray-500 text-[14px]">No stories selected.</p>`;

    return `
    <div id="${id || ''}" class="relative w-full my-8 clear-both font-sans">
      <div class="absolute left-1/2 transform -translate-x-1/2 -top-[14px] bg-white border text-black font-bold text-[12px] px-3 py-1 tracking-widest uppercase z-10" style="${borderStyle}">
        More Reading
      </div>
      <div class="border bg-white p-6 pt-8 flex flex-col gap-5 max-w-[800px] mx-auto" style="${borderStyle} --more-stories-accent:${accentColor};">
        ${itemsHtml}
      </div>
    </div>
  `;
}
