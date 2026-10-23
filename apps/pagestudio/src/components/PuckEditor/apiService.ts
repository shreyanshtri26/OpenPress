// src/components/PuckEditor/apiService.ts

// Import Story type from storyData instead of defining it here
import type { Story } from './storyData'
import { getToken } from '../../utils/auth'

// The editor is gated behind these initializer fetches, and a request that is
// accepted but never answered (a cold function, a dropped connection) would
// otherwise leave the whole Page Studio stuck on "Loading stories…" with no
// pending request visible to retry. Every initializer below already catches
// failures and falls back to an empty list, so an abort degrades gracefully.
//
// Deliberately NOT used on publish-path requests: a publish is user-initiated,
// legitimately slow, and must never be cut off mid-write.
const REQUEST_TIMEOUT_MS = 20000

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export type ApiAuthor = {
  id?: string
  authorId?: string
  userId?: string
  name?: string
  authorName?: string
  fullName?: string
  bio?: string
  description?: string
  image?: string | { url?: string }
  profileImage?: string | { url?: string }
  avatar?: string | { url?: string }
  profilePic?: string | { url?: string }
  role?: string
  designation?: string
  email?: string
  twitter?: string
  linkedin?: string
}

export type AuthorPayload = {
  id: string
  name: string
  bio: string
  image: string
  role?: string
  email?: string
  twitter?: string
  linkedin?: string
}

export type ApiStory = {
  storyId: string
  title: string
  description?: {
    version: string
    blocks?: Array<{
      type: string
      data: {
        text?: string
        file?: { url: string }
        caption?: string
      }
      id: string
    }>
    time: number
  }
  category?: string
  authorName?: string
  authorId?: string
  section?: string
  status: string
  createdAt: string
  image?: string | null
  slug?: string | null
  updatedAt?: string   // ✅ add this
  storySummary?: string
  publishUrl?: string
  redirectUrl?: string
  proposedFilingDate?: string
  publishedAt?: string
  byline?: string[]
  mediaAltText?: string
  mediaCaption?: string
  socialImage?: string
}

function normalizeEditorText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ');
}


// Transform API response to match your Story type
function transformApiStory(apiStory: ApiStory): Story | null {
  // Validate required fields
  if (!apiStory.storyId || !apiStory.title) {
    console.warn('Story missing required fields:', apiStory)
    return null
  }

  let summary = 'No description available'
  let fullDescription = 'No description available'

  let descObj = apiStory.description;
  if (typeof descObj === 'string') {
    try {
      descObj = JSON.parse(descObj);
    } catch (e) {
      console.warn('Could not parse description string', e);
    }
  }

  if (descObj?.blocks && Array.isArray(descObj.blocks)) {
    const extractedText = descObj.blocks
      .filter((block: any) => block?.data?.text || block?.data?.caption)
      .map((block: any) => {
        const raw = block.data.text || block.data.caption || '';
        // Strip HTML tags for clean word count and summary
        return normalizeEditorText(raw.replace(/<[^>]+>/g, ''));
      })
      .join('\n\n')

    if (extractedText.trim()) {
      fullDescription = extractedText
      summary = extractedText.substring(0, 200)
    }
  }

  return {
    id: apiStory.storyId,
    headline: apiStory.title,
    summary: apiStory?.storySummary || summary,
    fullDescription: fullDescription, // Full body text
    description: apiStory.description as any, // Pass original EditorJS blocks for rendering images (cast to any for type compatibility)
    category: apiStory.section || 'General',
    taxonomyCategories: (() => {
      const raw = (apiStory as any).Category ?? (apiStory as any).category
      if (Array.isArray(raw)) {
        return raw
          .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
          .map((v: string) => v.trim())
      }
      if (typeof raw === 'string' && raw.trim()) {
        return [raw.trim()]
      }
      return []
    })(),
    taxonomyCategory: (() => {
      const raw = (apiStory as any).Category ?? (apiStory as any).category
      if (Array.isArray(raw)) {
        return raw.find((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0) ?? ''
      }
      return typeof raw === 'string' ? raw.trim() : ''
    })() || apiStory.section || 'General',
    section: apiStory.section || undefined,
    author: apiStory.authorName || 'Unknown Author',
    authorName: apiStory.authorName || 'Unknown Author',
    authorId: apiStory.authorId || '',
    readTime: '5 min read',
    imageUrl: apiStory.image || 'https://via.placeholder.com/600x400',
    imageAuthor: 'Staff Photo',
    imageAlt: apiStory.title,
    kicker: apiStory.section || undefined,
    updatedAt: apiStory.updatedAt,
    createdAt: apiStory.createdAt,
    storySummary: apiStory.storySummary || summary,
    publishUrl: apiStory.publishUrl,
    redirectUrl: apiStory.redirectUrl,
    publishDate: apiStory?.proposedFilingDate || undefined,
    publishedAt: apiStory?.publishedAt,
    byLine: apiStory?.byline || [],
    altText: apiStory?.mediaAltText || "",
    caption: apiStory?.mediaCaption || "",
    socialImage: apiStory?.socialImage || "",
  }
}

// Fetch stories from API
export async function fetchStories({
  pageType,
  section,
}: {
  pageType?: string | null;
  section?: string | null;
}): Promise<Story[]> {
  try {

    const base = import.meta.env.VITE_BACKEND_API;

    const url =
      pageType === "Section" && section
        ? `${base}/story/fetchReadyToPublish?section=${encodeURIComponent(section)}`
        : `${base}/story/fetchReadyToPublish`;

    // Use getToken() — non-redirecting. If no token and not a public page, skip the fetch.
    const token = getToken();
    if (!token && pageType !== "Home") return [];

    const response = await fetchWithTimeout(url, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized: could not fetch stories (401)');
        return [];
      }
      throw new Error(`API error: ${response.status}`)
    }

    const responseData = await response.json()
    const apiStories: ApiStory[] = responseData.data || []

    const transformedStories = apiStories
      .map(transformApiStory)
      .filter((story): story is Story => story !== null)

    return transformedStories
  } catch (error) {
    console.error('Failed to fetch stories:', error)

    // ✅ Fallback local mock data for development
    return [
      {
        id: 'mock-1',
        headline: 'Mock Story Headline',
        summary: 'This is a local fallback story for testing.',
        category: 'Technology',
        author: 'Mock Author',
        readTime: '3 min read',
        imageUrl: 'https://via.placeholder.com/600x400',
        imageAuthor: 'Placeholder',
        imageAlt: 'Mock Story Image',
      },
    ]
  }
}

function resolveMaybeUrl(value?: string): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed
  }

  const base = import.meta.env.VITE_BACKEND_API
  if (!base) return trimmed

  try {
    const origin = new URL(base).origin
    return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
  } catch {
    return trimmed
  }
}

function extractImageUrl(value?: string | { url?: string }): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return resolveMaybeUrl(value)
  return resolveMaybeUrl(value.url)
}

// Exported for the published-page renderer bundle, which maps a raw
// `/getAuthors` response with the exact same rules the editor uses.
export function transformApiAuthor(apiAuthor: ApiAuthor, index: number): AuthorPayload | null {
  const id = apiAuthor.userId || apiAuthor.id || apiAuthor.authorId || `${index + 1}`
  const name = apiAuthor.name || apiAuthor.authorName || apiAuthor.fullName

  if (!name) {
    return null
  }

  const image = extractImageUrl(apiAuthor.image)
    || extractImageUrl(apiAuthor.profileImage)
    || extractImageUrl(apiAuthor.avatar)
    || extractImageUrl(apiAuthor.profilePic)
    || 'https://via.placeholder.com/150'

  return {
    id,
    name,
    bio: apiAuthor.bio || apiAuthor.description || 'Author bio is not available.',
    image,
    role: apiAuthor.role || apiAuthor.designation,
    email: apiAuthor.email,
    twitter: apiAuthor.twitter,
    linkedin: apiAuthor.linkedin,
  }
}

function buildAuthorEndpoint(base: string): string {
  const customPath = import.meta.env.VITE_AUTHOR_FETCH_PATH
  const path = customPath || '/getAuthors'

  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function extractApiAuthors(responseData: any): ApiAuthor[] {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.authors)) return responseData.authors
  if (Array.isArray(responseData?.result)) return responseData.result

  return []
}

export async function fetchAuthors(): Promise<AuthorPayload[]> {
  // Use getToken() — non-redirecting. Return empty if no token.
  const token = getToken()
  if (!token) return []

  const base = import.meta.env.VITE_BACKEND_API
  const url = buildAuthorEndpoint(base)

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized: could not fetch authors (401)');
        return []
      }
      throw new Error(`Authors API error: ${response.status}`)
    }

    const responseData = await response.json()
    const apiAuthors = extractApiAuthors(responseData)

    return apiAuthors
      .map(transformApiAuthor)
      .filter((author): author is AuthorPayload => author !== null)
  } catch (error) {
    console.warn(`Failed to fetch authors from ${url}:`, error)
    throw error
  }
}

export type ApiCampaign = {
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  status: string;
  type?: string;
  placements: string[];
  priority: string;
  startTime?: string;
  endTime?: string;
  landingPageURL?: string;
  thirdPartyTag?: string;
  createdAt?: string;
  updatedAt?: string;
  jobs?: any[];
  frequencyCap?: {
    enabled: boolean;
    maxImpressions: number;
    per: string;
  };
  creatives: {
    [key: string]: {
      mobile?: string;
      desktop?: string;
    };
  };
};

export async function fetchCampaigns(): Promise<ApiCampaign[]> {
  // Use getToken() — non-redirecting. Return empty if no token.
  const token = getToken();
  if (!token) return [];

  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/getCampaigns`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized: could not fetch campaigns (401)');
        return [];
      }
      throw new Error(`Campaigns API error: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.campaigns || [];
  } catch (error) {
    console.warn(`Failed to fetch campaigns from ${url}:`, error);
    return [];
  }
}

export type ApiPlacement = {
  placementId: string;
  name: string;
  type: string;
  desktopDimensions?: string;
  mobileDimensions?: string;
  status: string;
};

export async function fetchPlacements(): Promise<ApiPlacement[]> {
  // Use getToken() — non-redirecting. Return empty if no token.
  const token = getToken();
  if (!token) return [];

  const base = import.meta.env.VITE_BACKEND_API;
  const url = `${base}/placements`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Placements API error: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.placements || [];
  } catch (error) {
    console.warn(`Failed to fetch placements from ${url}:`, error);
    return [];
  }
}

export async function fetchTaxonomies(): Promise<string[]> {
  const token = getToken();
  const base = import.meta.env.VITE_BACKEND_API;
  if (!base) return [];

  try {
    const response = await fetchWithTimeout(`${base}/taxonomies`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Taxonomies API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const categoryTaxonomy = data.taxonomies?.find((t: any) => t.name.toLowerCase() === 'category');
    if (categoryTaxonomy && Array.isArray(categoryTaxonomy.values)) {
      return categoryTaxonomy.values;
    }
    return [];
  } catch (error) {
    console.warn('Failed to fetch taxonomies:', error);
    return [];
  }
}

export type TaxonomyGroup = {
  taxonomyId?: string;
  name?: string;
  values?: unknown[];
  permissions?: Record<string, unknown>;
  isMendatory?: boolean;
  isMandatory?: boolean;
};

export type MoreStoryTaxonomyOption = {
  taxonomyName: string;
  taxonomyValue: string;
};

function isMoreStoryCardEnabled(permissions: Record<string, unknown> | undefined): boolean {
  if (!permissions || typeof permissions !== 'object') return false;

  const isTruthy = (value: unknown): boolean => {
    if (value === true) return true;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    return false;
  };

  const entries = Object.entries(permissions);
  for (const [key, rawValue] of entries) {
    const normalizedCompactKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
    const looksLikeFilterPermission =
      normalizedCompactKey === 'morestorycard' ||
      normalizedCompactKey === 'morestoriescard' ||
      normalizedCompactKey === 'thumbnailgrid' ||
      normalizedCompactKey === 'automaticfilter' ||
      normalizedCompactKey === 'pagebuilderfilter' ||
      (normalizedCompactKey.includes('more') && normalizedCompactKey.includes('story') && normalizedCompactKey.includes('card'));

    if (looksLikeFilterPermission) {
      if (isTruthy(rawValue)) return true;
    }
  }
  return false;
}

function hasMoreStoryCardKey(permissions: Record<string, unknown> | undefined): boolean {
  if (!permissions || typeof permissions !== 'object') return false;

  for (const key of Object.keys(permissions)) {
    const normalizedCompactKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (
      normalizedCompactKey === 'morestorycard' ||
      normalizedCompactKey === 'morestoriescard' ||
      normalizedCompactKey === 'thumbnailgrid' ||
      normalizedCompactKey === 'automaticfilter' ||
      normalizedCompactKey === 'pagebuilderfilter' ||
      (normalizedCompactKey.includes('more') && normalizedCompactKey.includes('story') && normalizedCompactKey.includes('card'))
    ) {
      return true;
    }
  }

  return false;
}

export async function fetchMoreStoryCardTaxonomyOptions(): Promise<MoreStoryTaxonomyOption[]> {
  const token = getToken();
  const base = import.meta.env.VITE_BACKEND_API;
  if (!base) return [];

  try {
    const response = await fetchWithTimeout(`${base}/taxonomies`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Taxonomies API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const taxonomies: TaxonomyGroup[] = Array.isArray(data?.taxonomies)
      ? data.taxonomies
      : Array.isArray(data?.data?.taxonomies)
        ? data.data.taxonomies
        : Array.isArray(data?.data)
          ? data.data
          : [];

    const options: MoreStoryTaxonomyOption[] = [];
    for (const group of taxonomies) {
      const groupName = (group.name || '').trim();

      const hasKey = hasMoreStoryCardKey(group.permissions);
      const isMandatoryGroup = group.isMendatory === true || group.isMandatory === true;
      const isEnabled = isMoreStoryCardEnabled(group.permissions) || (isMandatoryGroup && !hasKey);

      if (!groupName || !isEnabled) continue;

      const rawValues = Array.isArray(group.values) ? group.values : [];
      const validValues = rawValues
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);

      if (validValues.length === 0) {
        options.push({
          taxonomyName: groupName,
          taxonomyValue: '',
        });
      } else {
        for (const value of validValues) {
          options.push({
            taxonomyName: groupName,
            taxonomyValue: value,
          });
        }
      }
    }

    return options;
  } catch (error) {
    console.warn('Failed to fetch taxonomy filter options:', error);
    return [];
  }
}

export const fetchThumbnailGridTaxonomyOptions = fetchMoreStoryCardTaxonomyOptions;

