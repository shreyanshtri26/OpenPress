import { escapeHtml } from '../core/escapeHtml'
 
export function renderErrorCard(
    props: {
        title?: string
        description?: string
        linkText?: string
        linkUrl?: string
        className?: string
    }
): string {
    const title = props.title || 'Page not found'
    const description = props.description || "We're sorry we seem to have lost this page."
    const linkText = props.linkText || 'GO TO HOMEPAGE'
    const linkUrl = props.linkUrl || '/'
 
    return `
    <div class="w-full min-h-[400px] flex flex-col items-center justify-center bg-white py-16 px-4 ${props.className ?? ''}">
      <h1 class="font-libre text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black text-center mb-6">
        ${escapeHtml(title)}
      </h1>
 
      <p class="font-[Merriweather] text-base sm:text-lg text-black text-center mb-8">
        ${escapeHtml(description)}
      </p>
 
      <a
        href="${escapeHtml(linkUrl)}"
        class="font-share text-[11px] sm:text-[12px] uppercase tracking-wider text-black underline underline-offset-4 hover:opacity-70 transition-opacity"
      >
        ${escapeHtml(linkText)}
      </a>
    </div>
  `
}
 
 