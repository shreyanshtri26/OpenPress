import type { RenderContext } from '../core/renderTypes';
import { sanitizeHtml } from '../core/sanitizeHtml';

const DEFAULT_MEDIA_COUNCIL_CONTENT = `
    <section class="mb-10 space-y-6">
        <p>
            OpenPress aims to publish accurate, fair and transparent journalism. If you believe something we published is wrong or unfair, please tell us.
        </p>

        <p>
            Send complaints and correction requests in writing through our <a href="/contact-us" class="underline font-bold">Contact Us</a> page, ideally within one month of publication, and include a link to the article.
        </p>

        <p class="p-4 bg-gray-50 border border-dotted border-gray-300">
            We will review every complaint and publish a correction where one is needed.
        </p>
    </section>
`;

export function renderMediaCouncil(props: any, _ctx: RenderContext): string {
    const { title = "Editorial Standards", content } = props;

    // Use content from Puck editor if provided, otherwise fall back to default.
    // Sanitize to strip any script/event-handler payloads before static HTML output.
    const bodyContent = sanitizeHtml(content && content.trim() ? content : DEFAULT_MEDIA_COUNCIL_CONTENT);

    return `
        <div class="font-sans text-black bg-white">
            <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <!-- Header Section -->
                <div class="mb-12 border-b-2 border-black pb-8">
                    <h2 class="font-bold text-sm uppercase mb-3 tracking-[0.3em] text-gray-400">Ethics &amp; Standards</h2>
                    <h1 class="font-merriweather text-4xl md:text-6xl font-black leading-tight mb-4">
                        ${title}
                    </h1>
                </div>

                <div class="blog-body-content text-[18px] font-merriweather leading-[1.8] text-[#222]">
                    ${bodyContent}
                </div>
            </main>
        </div>
    `;
}
