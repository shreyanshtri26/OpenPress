import { useEffect } from 'react';

// Default content matches renderMediaCouncil.ts
// so preview and published output are identical when no custom content is set.
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

export type MediaCouncilProps = {
    title?: string;
    content?: string;
}

export const MediaCouncil = ({
    title = "Editorial Standards",
    content = ""
}: MediaCouncilProps) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const bodyContent = content && content.trim() ? content : DEFAULT_MEDIA_COUNCIL_CONTENT;

    return (
        <div className="font-sans text-black bg-white">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header Section */}
                <div className="mb-12 border-b-2 border-black pb-8">
                    <h2 className="font-bold text-sm uppercase mb-3 tracking-[0.3em] text-gray-400">Ethics & Standards</h2>
                    <h1 className="font-merriweather text-4xl md:text-6xl font-black leading-tight mb-4">
                        {title}
                    </h1>
                </div>

                <div
                    className="blog-body-content text-[18px] font-merriweather leading-[1.8] text-[#222]"
                    dangerouslySetInnerHTML={{ __html: bodyContent }}
                />
            </main>
        </div>
    );
};
