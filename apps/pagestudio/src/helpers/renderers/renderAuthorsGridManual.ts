import type { RenderContext } from '../core/renderTypes'
import { renderZone } from '../core/renderZone'

export function renderAuthorsGridManual(
    props: {
        id: string
        rowCount?: number
        title?: string
    },
    ctx: RenderContext
): string {
    const rowCount = Math.max(props.rowCount || 3, 1);
    const title = props.title || "The Voices Behind OpenPress";

    let rowsHtml = '';

    for (let i = 0; i < rowCount; i++) {
        let rowSlotsHtml = '';
        for (let j = 0; j < 4; j++) {
            const slotIndex = i * 4 + j;
            const content = renderZone({
                zonePrefix: `${props.id}:author-slot-${slotIndex}`,
                ctx
            });

            if (content && content.trim() !== '') {
                rowSlotsHtml += `
                    <div class="flex-1 min-w-0">
                        ${content}
                    </div>
                 `;
            }
        }

        if (rowSlotsHtml !== '') {
            rowsHtml += `
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 w-full ${rowsHtml !== '' ? "mt-10" : ""}">
                    ${rowSlotsHtml}
                </div>
            `;
        }
    }

    return `
        <div class="op-container relative py-16">
            <!-- Background Layer - Decreased height -->
            <div class="absolute inset-0 h-[361px] bg-graph-paper -z-10"></div>
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-16 relative">
                    <h2 class="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight whitespace-pre-line">
                        ${title}
                    </h2>
                </div>
                <div class="flex flex-col w-full">
                    ${rowsHtml}
                </div>
            </div>
        </div>
    `;
}
