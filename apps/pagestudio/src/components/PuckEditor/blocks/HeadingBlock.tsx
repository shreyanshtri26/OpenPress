import { type ElementType } from 'react'

export type HeadingProps = {
  id?: string
  text?: string
  align?: 'left' | 'center' | 'right'
  level?: '1' | '2' | '3' | '4' | '5' | '6'
  size?: 'xxxl' | 'xxl' | 'xl' | 'l' | 'm' | 's' | 'xs'
}

export function HeadingBlock({
  id,
  text = 'Heading',
  align = 'left',
  level = '2',
  size = 'm',
}: HeadingProps) {
  const Tag = (`h${level}` as string) as ElementType

  const sizeClasses = {
    xxxl: 'text-6xl font-extrabold',
    xxl: 'text-5xl font-bold',
    xl: 'text-4xl font-bold',
    l: 'text-3xl font-semibold',
    m: 'text-2xl font-semibold',
    s: 'text-xl font-medium',
    xs: 'text-lg font-medium',
  }

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'


  return (
    <section id={id} className="bg-white italic font-libre franklin w-full pt-6">
      <div className="op-container">
        <Tag className={`${sizeClasses[size]} ${alignClass}`}>{text}</Tag>
      </div>
    </section>
  )
}
