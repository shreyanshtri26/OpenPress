export type CategoryStoryLike = {
  category?: string
  taxonomyCategory?: string
  section?: string
  Category?: string | string[]
  Section?: string | string[]
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  publishDate?: string
  proposedFilingDate?: string
}

function normalizeCategoryValue(value?: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function getFirstCategoryValue(value?: string | string[] | null): string {
  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)?.trim() ?? ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function getStoryTimestamp(story: CategoryStoryLike): number {
  const rawDate =
    story.proposedFilingDate ||
    story.publishDate ||
    story.publishedAt ||
    story.createdAt ||
    story.updatedAt ||
    ''

  const timestamp = new Date(rawDate).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function getStoryTaxonomyCategory(story: CategoryStoryLike): string {
  return (
    story.taxonomyCategory ||
    getFirstCategoryValue(story.Category) ||
    story.category ||
    getFirstCategoryValue(story.Section) ||
    story.section ||
    ''
  ).trim()
}

export function getLatestStoriesForCategory<T extends CategoryStoryLike>(
  stories: T[],
  category: string,
  limit = 4
): T[] {
  const normalizedCategory = normalizeCategoryValue(category)
  if (!normalizedCategory) return []

  return [...stories]
    .filter((story) => normalizeCategoryValue(getStoryTaxonomyCategory(story)) === normalizedCategory)
    .sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left))
    .slice(0, limit)
}
