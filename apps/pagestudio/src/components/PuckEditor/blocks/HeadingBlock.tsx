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

  const isHomePage = typeof window !== 'undefined' && (() => {
    const { pathname, hash, search } = window.location;
    if (search) {
      const params = new URLSearchParams(search);
      const pageType = params.get('pageType') || params.get('page');
      if (pageType) return pageType.toLowerCase() === 'home';
    }
    if (hash) {
      if (hash === '#/' || hash === '#' || hash === '#/home') return true;
      if (hash.startsWith('#/published/home')) return true;
      if (hash.startsWith('#/published/')) return false;
    }
    const cleanPath = pathname.replace(/\/$/, '');
    return cleanPath === '' || cleanPath === '/home' || cleanPath === '/published/home';
  })();

  return (
    <section id={id} className="bg-white italic font-libre franklin w-full px-4 sm:px-8 lg:px-16 pt-6">
      <div className={`mx-auto w-full max-w-7xl ${isHomePage ? 'px-0 sm:px-6 lg:px-8' : 'px-4 sm:px-6 lg:px-8'}`}>
        <Tag className={`${sizeClasses[size]} ${alignClass}`}>{text}</Tag>
      </div>
    </section>
  )
}
