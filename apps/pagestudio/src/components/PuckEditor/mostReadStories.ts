import { getToken } from '../../utils/auth'
import type { Story } from './storyData'

const API_BASE = import.meta.env.VITE_USER_DASHBOARD_API_URL?.replace(/\/$/, '') ?? ''

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function getAnalyticsDateRange(recency: string): { fromDate: string; toDate: string } {
  const now = Date.now()
  const toDate = new Date(now).toISOString().split('T')[0]
  let fromDate = '2000-01-01'

  if (recency === '24h') fromDate = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  else if (recency === '7d') fromDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  else if (recency === '30d') fromDate = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return { fromDate, toDate }
}

async function fetchTopContentSortedTitles(recency: string): Promise<string[]> {
  if (!API_BASE) return []

  const token = getToken()
  const { fromDate, toDate } = getAnalyticsDateRange(recency)

  try {
    const items: Array<{ title?: string; views?: number }> = []
    let offset: number | null = 0

    while (offset !== null) {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        offset: String(offset),
        limit: '1000',
      })
      const response = await fetch(`${API_BASE}/table/content/top-content?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) return []

      const json = await response.json()
      items.push(...(json.data ?? []))
      offset = typeof json.next_offset === 'number' ? json.next_offset : null
    }

    return items
      .sort((left, right) => (right.views ?? 0) - (left.views ?? 0))
      .map((item) => normalizeTitle(item.title ?? ''))
      .filter(Boolean)
  } catch (error) {
    console.error('Failed to fetch top content:', error)
    return []
  }
}

export async function prioritizeMostReadStories(
  filteredStories: Story[],
  count: number,
  enabled: boolean,
  recency: string = 'all'
): Promise<Story[]> {
  if (!enabled) return filteredStories.slice(0, count)

  const topTitles = await fetchTopContentSortedTitles(recency)
  if (!topTitles.length) return filteredStories.slice(0, count)

  const storiesByTitle = new Map<string, Story[]>()
  filteredStories.forEach((story) => {
    const title = normalizeTitle(story.headline ?? '')
    if (!title) return
    const matches = storiesByTitle.get(title) ?? []
    matches.push(story)
    storiesByTitle.set(title, matches)
  })

  const selected: Story[] = []
  const seenIds = new Set<string>()

  topTitles.forEach((title) => {
    if (selected.length >= count) return
    const match = storiesByTitle.get(title)?.find((story) => !seenIds.has(story.id))
    if (!match) return
    selected.push(match)
    seenIds.add(match.id)
  })

  for (const story of filteredStories) {
    if (selected.length >= count) break
    if (seenIds.has(story.id)) continue
    selected.push(story)
    seenIds.add(story.id)
  }

  return selected
}

export function filterStoriesByRecency(stories: Story[], recency: string = 'all'): Story[] {
  if (recency === 'all') return stories

  const now = Date.now()
  let limit = 0
  if (recency === '24h') limit = 24 * 60 * 60 * 1000
  else if (recency === '7d') limit = 7 * 24 * 60 * 60 * 1000
  else if (recency === '30d') limit = 30 * 24 * 60 * 60 * 1000
  if (!limit) return stories

  return stories.filter((story) => {
    const datedStory = story as Story & { proposedFilingDate?: string }
    const rawDate = datedStory.proposedFilingDate || story.publishedAt || story.createdAt || story.updatedAt || ''
    const timestamp = new Date(rawDate).getTime()
    return Number.isFinite(timestamp) && now - timestamp <= limit
  })
}
