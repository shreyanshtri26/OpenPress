// Footer renderer: a compact, sleek editorial footer (logo, mission, horizontal navigation, hairline bottom bar).

type FooterProps = {
    id?: string;
    copyrightText?: string;
};

const SECTIONS: Array<[string, string]> = [
    ['News', '/news/'],
    ['Opinion', '/opinion/'],
    ['Business', '/business/'],
    ['Sports', '/sports/'],
    ['Technology', '/technology/'],
    ['Arts & Culture', '/arts-culture/'],
    ['Politics', '/politics/'],
    ['Lifestyle', '/lifestyle/'],
    ['World', '/world/'],
];

const COMPANY: Array<[string, string]> = [
    ['About us', '/about'],
    ['Our authors', '/authors'],
    ['Editorial standards', '/media-council'],
    ['Privacy policy', '/privacy-policy'],
    ['Contact us', '/contact-us'],
    ['Support us', '/support-us'],
];

export function renderFooter(props: FooterProps): string {
    const {
        id,
        copyrightText = "© 2026 OpenPress. All rights reserved."
    } = props;

    const sectionLinks = SECTIONS
        .map(([label, href]) => `<a href="${href}" class="text-xs text-[#515154] hover:text-black hover:underline transition-colors">${label.replace('&', '&amp;')}</a>`)
        .join('<span class="text-[#d2d2d7] select-none text-[10px]">•</span>');

    const companyLinks = COMPANY
        .map(([label, href]) => `<a href="${href}" class="text-xs text-[#6e6e73] hover:text-black hover:underline transition-colors">${label}</a>`)
        .join('<span class="text-[#d2d2d7] select-none text-[10px]">•</span>');

    return `
        <div class="mt-10 sm:mt-14 relative clear-both">
            <footer ${id ? `id="${id}"` : ""} class="op-footer w-full bg-[#f8f9fa] text-[#6e6e73] border-t border-[#e2e2e7]">
                <div class="op-container py-5 sm:py-6">
                    <!-- Top Compact Row: Logo, Mission, Social -->
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 pb-4 border-b border-[#e5e5ea]">
                        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 text-center sm:text-left">
                            <a href="/" aria-label="OpenPress home" class="shrink-0 flex items-center">
                                <img id="footer-logo-mark" src="/openpress-logo-full-nobg-trim.png" alt="OpenPress" class="op-footer-logo h-7 sm:h-8 w-auto object-contain" />
                            </a>
                            <span class="hidden sm:inline text-[#d2d2d7] select-none">|</span>
                            <p class="text-[12px] text-[#6e6e73] font-merriweather italic">
                                Free, independent journalism open to everyone.
                            </p>
                        </div>
                        <div class="flex items-center gap-3 shrink-0 text-xs font-share tracking-wider uppercase text-[#555]">
                            <a href="https://www.facebook.com/shreyanshtri26" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 hover:text-black transition-colors" aria-label="Facebook">
                                <svg class="w-4 h-4 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9c1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>
                                <span class="hidden md:inline text-[11px] font-semibold">Facebook</span>
                            </a>
                            <a href="https://www.linkedin.com/in/shreyanshtri26" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 hover:text-black transition-colors" aria-label="LinkedIn">
                                <svg class="w-4 h-4 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.7,3H4.3C3.582,3,3,3.582,3,4.3v15.4C3,20.418,3.582,21,4.3,21h15.4c0.718,0,1.3-0.582,1.3-1.3V4.3C21,3.582,20.418,3,19.7,3z M8.339,18.338H5.667v-8.59h2.672V18.338z M7.004,8.574c-0.857,0-1.549-0.694-1.549-1.548c0-0.855,0.691-1.548,1.549-1.548c0.854,0,1.547,0.694,1.547,1.548C8.551,7.881,7.858,8.574,7.004,8.574z M18.339,18.338h-2.669v-4.177c0-0.996-0.017-2.278-1.387-2.278c-1.389,0-1.601,1.086-1.601,2.206v4.249h-2.667v-8.59h2.559v1.174h0.037c0.356-0.675,1.227-1.387,2.526-1.387c2.703,0,3.203,1.779,3.203,4.092V18.338z"/></svg>
                                <span class="hidden md:inline text-[11px] font-semibold">LinkedIn</span>
                            </a>
                        </div>
                    </div>

                    <!-- Middle Compact Links -->
                    <div class="py-3 flex flex-col items-center md:items-start gap-2 text-center md:text-left">
                        <nav aria-label="Sections" class="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 gap-y-1 font-share uppercase tracking-wider text-[11px]">
                            <span class="font-bold text-neutral-800 text-[10px] tracking-widest mr-1">SECTIONS</span>
                            ${sectionLinks}
                        </nav>
                        <nav aria-label="OpenPress Links" class="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 gap-y-1 text-xs">
                            ${companyLinks}
                        </nav>
                    </div>

                    <!-- Bottom Hairline Bar -->
                    <div class="pt-3 border-t border-[#e5e5ea] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868b] gap-1.5 text-center sm:text-left">
                        <p>${copyrightText}</p>
                        <p class="font-medium text-[#6e6e73]">Free to read. Always.</p>
                    </div>
                </div>
            </footer>
        </div>
    `;
}
