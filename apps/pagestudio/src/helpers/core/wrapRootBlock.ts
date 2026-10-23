// Cards are made to sit inside a grid cell. Dropped straight onto the page canvas they would ignore the page container and
// run edge to edge (or hang off the sides), so top-level blocks of these types get the same container as every other section.
const WIDE = new Set(['MainCard', 'MultimediaCard', 'MostPopularTable'])
const NARROW = new Set(['ShowcaseCard', 'HoverCard', 'StoryCard', 'RecommendCard', 'StorySubCard', 'FeaturedCard', 'SidebarStoryCard'])

export function wrapRootBlock(type: string, html: string): string {
  if (!html) return html
  if (WIDE.has(type)) return `<section class="w-full bg-white py-6"><div class="op-container">${html}</div></section>`
  if (NARROW.has(type)) return `<section class="w-full bg-white py-6"><div class="op-container"><div class="mx-auto w-full max-w-3xl">${html}</div></div></section>`
  return html
}

// An ad placed directly on the page has no fallback story: the editor hides that setting outside a grid cell, because the
// fallback is drawn as a story card and only fits inside a cell. Ignore any value left in saved data so it cannot publish as
// a page-wide card.
export function rootProps<T extends Record<string, any>>(type: string, props: T): T {
  if (!/Ad(_|$)/.test(type) || !props) return props
  const { fallbackStoryId, fallbackBlock, _autoFallbackStoryId, ...rest } = props as any
  return rest as T
}
