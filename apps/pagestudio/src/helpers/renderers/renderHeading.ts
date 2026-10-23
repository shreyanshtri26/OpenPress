import { escapeHtml } from '../core/escapeHtml'
import type { RenderContext } from '../core/renderTypes'

type RenderHeadingProps = {
  id?: string
  text?: string
  align?: 'left' | 'center' | 'right'
  level?: '1' | '2' | '3' | '4' | '5' | '6'
  size?: 'xxxl' | 'xxl' | 'xl' | 'l' | 'm' | 's' | 'xs'
}

export function renderHeading(props: RenderHeadingProps, _ctx?: RenderContext): string {
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


  return `
    <section id="${id ?? ''}" class="bg-white italic font-libre franklin w-full pt-6">
      <div class="op-container">
        <${tag} class="${sizeClasses[size]} ${alignClass}">
          ${escapeHtml(text)}
        </${tag}>
      </div>
    </section>
  `
}
