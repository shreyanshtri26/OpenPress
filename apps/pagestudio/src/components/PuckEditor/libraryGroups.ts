// Component library grouping: every block the page's config offers lands in exactly one named group.
// Unknown keys fall into "Other" so a newly added block never disappears from the library.
export type LibraryGroup = { title: string; keys: string[]; match?: (key: string) => boolean; defaultExpanded?: boolean }

export const LIBRARY_GROUPS: LibraryGroup[] = [
  { title: 'Placements', keys: [], match: (k) => k.startsWith('Ad_'), defaultExpanded: true },
  { title: 'Advertising', keys: ['LeaderboardAd', 'PopupAd', 'InStoryAd', 'SidebarAd', 'SpotlightAd', 'AdvertisementGrid', 'AdCard'], defaultExpanded: true },
  { title: 'Editorial layouts', keys: ['HeroGrid', 'PopularGrid', 'ThumbnailGrid', 'MultimediaGrid', 'AllStoriesGrid', 'SectionGrid', 'SectionBottomCard', 'AuthorsGrid', 'AuthorsGridManual', 'BlogGrid', 'VideoGrid'], defaultExpanded: true },
  { title: 'Navigation and structure', keys: ['AtlanticNavbar', 'Footer', 'Heading', 'Border', 'BlogHeading'], defaultExpanded: true },
  { title: 'Story cards', keys: ['StoryCard', 'MainCard', 'HoverCard', 'ShowcaseCard', 'RecommendCard', 'StorySubCard', 'FeaturedCard', 'SidebarStoryCard', 'MultimediaCard', 'MostPopularTable', 'ErrorCard'] },
  { title: 'People', keys: ['AuthorProfile', 'AuthorCard'] },
  { title: 'Fixed pages', keys: ['AboutUs', 'SupportUs', 'PrivacyPolicy', 'MediaCouncil', 'ContactUs'] },
  { title: 'Blog and video', keys: [], match: (k) => /^(Blog|Popular|Video)/.test(k) },
]

export type LibraryCategories = Record<string, { title: string; components: string[]; defaultExpanded?: boolean }>

/** Puck `categories` for the given component keys, in group order, with empty groups dropped. */
export function buildLibraryCategories(componentKeys: string[]): LibraryCategories {
  const claimed = new Set<string>()
  const claim = (keys: string[]) => keys.filter((k) => !claimed.has(k)).map((k) => (claimed.add(k), k))

  // Explicit key lists claim their blocks first so a loose `match` (e.g. /^Popular/) cannot steal PopularGrid.
  const explicit = new Map<LibraryGroup, string[]>()
  for (const g of LIBRARY_GROUPS) explicit.set(g, claim(componentKeys.filter((k) => g.keys.includes(k))))

  const out: LibraryCategories = {}
  for (const g of LIBRARY_GROUPS) {
    const byMatch = g.match ? claim(componentKeys.filter((k) => g.match!(k))) : []
    const components = [...(explicit.get(g) ?? []), ...byMatch]
    if (components.length) out[g.title] = { title: g.title, components, defaultExpanded: g.defaultExpanded }
  }
  const rest = componentKeys.filter((k) => !claimed.has(k))
  if (rest.length) out['Other'] = { title: 'Other', components: rest }
  return out
}

/** Case-insensitive match on a block's key or its human label, ignoring spaces, dashes and underscores. */
export const matchesLibraryQuery = (query: string, key: string, label?: string): boolean => {
  const squash = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
  const q = squash(query)
  if (!q) return true
  return squash(key).includes(q) || squash(label ?? '').includes(q)
}
