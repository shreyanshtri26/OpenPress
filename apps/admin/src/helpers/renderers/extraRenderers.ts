import type { RenderContext } from '../core/renderTypes';

/**
 * Lightweight HTML sanitizer
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<\/?(iframe|object|embed|form|base|meta|link)\b[^>]*>/gi, '')
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        .replace(/(href|src|action)\s*=\s*["']\s*(javascript|data):[^"']*/gi, '$1="#"');
}

/**
 * Privacy Policy Renderer
 */
export function renderPrivacyPolicy(props: any, _ctx: RenderContext): string {
    const { title = "Privacy Policy", content } = props;
    const bodyContent = sanitizeHtml(content && content.trim() ? content : "<!-- default privacy policy -->");
    return `
        <div class="font-sans text-black bg-white">
            <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div class="mb-12 border-b-2 border-black pb-8">
                    <h2 class="font-bold text-sm uppercase mb-3 tracking-[0.3em] text-gray-400">Governance</h2>
                    <h1 class="font-merriweather text-4xl md:text-6xl font-black leading-tight mb-6">${title}</h1>
                </div>
                <div class="blog-body-content text-[18px] font-merriweather leading-[1.8] text-[#222]">
                    ${bodyContent}
                </div>
            </main>
        </div>
    `;
}

/**
 * Media Council Renderer
 */
export function renderMediaCouncil(props: any, _ctx: RenderContext): string {
    const { title = "Media Council", content } = props;
    const bodyContent = sanitizeHtml(content && content.trim() ? content : "<!-- default media council -->");
    return `
        <div class="font-sans text-black bg-white">
            <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div class="mb-12 border-b-2 border-black pb-8">
                    <h2 class="font-bold text-sm uppercase mb-3 tracking-[0.3em] text-gray-400">Compliance</h2>
                    <h1 class="font-merriweather text-4xl md:text-6xl font-black leading-tight mb-6">${title}</h1>
                </div>
                <div class="blog-body-content text-[18px] font-merriweather leading-[1.8] text-[#222]">
                    ${bodyContent}
                </div>
            </main>
        </div>
    `;
}

/**
 * Authors Grid Renderer
 */
export function renderAuthorsGrid(props: { title?: string }, ctx: RenderContext): string {
    const title = props.title || 'The Voices Behind OpenPress'
    const authors = ctx.authors || []

    const authorsHtml = authors.map(author => `
    <div class="group flex flex-col items-start w-full">
        <div class="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
            <div class="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>
            <img class="w-full h-full object-cover filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0" src="${author.image}" alt="${author.name}" />
        </div>
        <div class="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
            <h3 class="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">${author.name}</h3>
        </div>
        <p class="text-m text-gray-700 font-[Merriweather] leading-relaxed max-w-2xl line-clamp-3">${author.bio || ""}</p>
    </div>
  `).join('')

    return `
    <div class="w-full relative py-16 px-4 sm:px-6 lg:px-8">
        <div class="max-w-5xl mx-auto">
            <div class="text-center mb-16 relative">
                <h2 class="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight">${title}</h2>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">${authorsHtml}</div>
        </div>
    </div>
  `
}

/**
 * Author Card Renderer
 */
export function renderAuthorCard(props: any, ctx: RenderContext): string {
    const author = props.authorId ? ctx.authors?.find(a => a.id === props.authorId) : null
    const displayName = props.name || author?.name || 'Author Name'
    const displayBio = props.bio || author?.bio || ''
    const displayImage = props.image || author?.image || '/openpress-quill-nobg-trim.png'

    return `
    <div class="group flex flex-col items-start w-full cursor-pointer">
        <div class="w-full aspect-square mb-3 overflow-hidden bg-blue-50 relative group-hover:bg-transparent transition-colors duration-500">
            <div class="absolute inset-0 bg-blue-600/60 z-10 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300"></div>
            <img class="w-full h-full object-cover filter grayscale contrast-125 group-hover:filter-none group-hover:grayscale-0" src="${displayImage}" alt="${displayName}" />
        </div>
        <div class="w-full flex justify-between items-center mb-1 border-b border-gray-100 pb-1 group-hover:border-black transition-colors duration-300">
            <h3 class="text-[18px] font-extrabold font-libre text-black leading-tight pr-2">${displayName}</h3>
        </div>
        <p class="text-m text-gray-700 font-merriweather leading-relaxed max-w-2xl line-clamp-3">${displayBio}</p>
    </div>
  `
}

/**
 * Login Form Renderer
 */
export function renderLoginForm(_props: any, _ctx: RenderContext): string {
    return `<div class="p-8 max-w-md mx-auto text-center"><!-- login form placeholder --></div>`;
}

/**
 * Account Card Renderer
 */
export function renderAccountCard(_props: any, _ctx: RenderContext): string {
    return `<div class="p-8 max-w-md mx-auto text-center"><!-- account card placeholder --></div>`;
}

/**
 * Error Card Renderer
 */
export function renderErrorCard(props: any, _ctx: RenderContext): string {
    return `<div class="p-16 text-center"><h1 class="text-4xl font-bold">${props.title || 'Error'}</h1><p>${props.description || 'Something went wrong.'}</p></div>`;
}
