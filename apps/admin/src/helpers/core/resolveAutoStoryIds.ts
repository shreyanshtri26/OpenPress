import { getStoryTaxonomyCategory } from './storyCategory'

type StoryLike = {
  id?: string
  storyId?: string
  section?: string
  Section?: string | string[]
  category?: string
  Category?: string | string[]
  taxonomyCategory?: string
  taxonomyCategories?: string | string[]
  authorName?: string
  author?: string
  byLine?: string | string[]
  byline?: string | string[]
  publishedAt?: string
  publishDate?: string
  proposedFilingDate?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function addCandidates(set: Set<string>, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      const n = normalizeString(item)
      if (n) set.add(n)
    })
  } else {
    const n = normalizeString(value)
    if (n) set.add(n)
  }
}

function storyMatchesTaxonomy(story: StoryLike, taxonomyName: string, selectedValue: string): boolean {
  const name = normalizeString(taxonomyName)
  const val = normalizeString(selectedValue)
  if (!name || !val || val === 'all' || val.startsWith('all ')) return true

  const candidates = new Set<string>()

  if (name === 'section') {
    addCandidates(candidates, story.section)
    addCandidates(candidates, story.Section)
  } else if (name === 'category') {
    addCandidates(candidates, story.taxonomyCategories)
    addCandidates(candidates, story.Category)
    addCandidates(candidates, story.taxonomyCategory)
    addCandidates(candidates, story.category)
  } else if (['author', 'reporter', 'journalist', 'editor'].includes(name)) {
    addCandidates(candidates, story.authorName)
    addCandidates(candidates, story.author)
    addCandidates(candidates, story.byLine)
    addCandidates(candidates, story.byline)
  }

  // Generic fallback: match any prop whose key matches taxonomy name
  const normalizedKey = name.replace(/\s+/g, '')
  Object.entries(story).forEach(([k, v]) => {
    if (k.replace(/\s+/g, '').toLowerCase() === normalizedKey) {
      addCandidates(candidates, v)
    }
  })

  return candidates.has(val)
}

function getStoryTimestamp(story: StoryLike): number {
  const raw =
    story.proposedFilingDate ||
    story.publishDate ||
    story.publishedAt ||
    story.createdAt ||
    story.updatedAt ||
    ''
  const ts = new Date(raw as string).getTime()
  return Number.isFinite(ts) ? ts : 0
}

/**
 * Computes auto story IDs from `storiesById` using the taxonomy props stored
 * on a block (autoTaxonomy_*, autoRecency, autoMostRead). This mirrors the
 * Page Studio's resolveData logic so republish doesn't depend on stale stored IDs.
 */
export function resolveAutoStoryIds(
  blockProps: Record<string, unknown>,
  storiesById: Record<string, StoryLike>,
  limit = 20
): string[] {
  const pool: StoryLike[] = Object.values(storiesById)

  // Apply taxonomy filters from autoTaxonomy_* props
  const filtered = pool.filter((story) => {
    return Object.entries(blockProps).every(([key, value]) => {
      if (!key.startsWith('autoTaxonomy_')) return true
      const taxonomyName = key
        .replace(/^autoTaxonomy_/, '')
        .replace(/_/g, ' ')
        .trim()
      const selectedValue = normalizeString(value)
      if (!selectedValue || selectedValue === 'all' || selectedValue.startsWith('all ')) return true
      return storyMatchesTaxonomy(story, taxonomyName, selectedValue)
    })
  })

  // Apply legacy automaticCategory fallback (e.g. "Section::India")
  const automaticCategory = blockProps.automaticCategory as string | undefined
  let pool2 = filtered
  if (automaticCategory) {
    const [taxonomyName, ...rest] = automaticCategory.split('::')
    const taxonomyValue = rest.join('::')
    if (taxonomyValue) {
      pool2 = filtered.filter((s) => storyMatchesTaxonomy(s, taxonomyName, taxonomyValue))
    }
  }

  // Apply recency filter
  const autoRecency = blockProps.autoRecency as string | undefined
  let pool3 = pool2
  if (autoRecency && autoRecency !== 'all') {
    const now = Date.now()
    const msMap: Record<string, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }
    const msLimit = msMap[autoRecency] ?? 0
    if (msLimit > 0) {
      pool3 = pool2.filter((s) => now - getStoryTimestamp(s) <= msLimit)
    }
  }

  return pool3
    .sort((a, b) => getStoryTimestamp(b) - getStoryTimestamp(a))
    .slice(0, limit)
    .map((s) => (s.id || s.storyId || '') as string)
    .filter(Boolean)
}
