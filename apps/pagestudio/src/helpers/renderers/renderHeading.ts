import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'

type RenderHeadingProps = {
  id?: string
  text?: string
  align?: 'left' | 'center' | 'right'
  level?: '1' | '2' | '3' | '4' | '5' | '6'
  size?: 'xxxl' | 'xxl' | 'xl' | 'l' | 'm' | 's' | 'xs'
}

export function renderHeading(props: RenderHeadingProps, ctx?: RenderContext): string {
  const {
    id,
    text = 'Heading',
    align = 'left',
    level = '2',
    size = 'm',
  } = props

  const tag = `h${level}`

  const sizeClasses: Record<string, string> = {
    xxxl: 'text-6xl font-extrabold',
    xxl: 'text-5xl font-bold',
    xl: 'text-4xl font-bold',
    l: 'text-3xl font-semibold',
    m: 'text-2xl font-semibold',
    s: 'text-xl font-medium',
    xs: 'text-lg font-medium',
  }

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
      ? 'text-right'
      : 'text-left'

  const isHome = ctx?.pageType === 'Home' || (ctx?.activeSection === 'HOME' && !ctx?.currentStory && !ctx?.authorId);

  return `
    <section id="${id ?? ''}" class="bg-white italic font-libre franklin w-full px-4 sm:px-8 lg:px-16 pt-6">
      <div class="mx-auto w-full max-w-7xl ${isHome ? 'px-0 sm:px-6 lg:px-8' : 'px-4 sm:px-6 lg:px-8'}">
        <${tag} class="${sizeClasses[size]} ${alignClass}">
          ${escapeHtml(text)}
        </${tag}>
      </div>
    </section>
  `
}
