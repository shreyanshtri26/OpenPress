// Story override helper used when rendering Blog pages per-story.
// Extracted as a standalone module so non-component code (e.g.
// syncNavbarLeaderboard) can build the same `currentStory` shape that
// PuckOverrides' Blog publish handler uses.

type AnyStory = Record<string, any>;

const safeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const summariseContent = (text?: string): string | undefined => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (trimmed.length <= 200) return trimmed;
  return `${trimmed.slice(0, 197).trim()}...`;
};

const extractTextFromDescription = (description: unknown): string | undefined => {
  if (!description) return undefined;

  if (typeof description === 'string') {
    const trimmed = safeString(description);
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return extractTextFromDescription(parsed);
      }
    } catch {
      // fall through
    }
    return trimmed;
  }

  const maybeBlocks = (description as any)?.blocks;
  if (Array.isArray(maybeBlocks)) {
    const segments = maybeBlocks
      .map((block: any) => {
        if (!block || typeof block !== 'object') return '';
        const data = block.data || {};
        if (typeof data.text === 'string') return data.text;
        if (typeof data.caption === 'string') return data.caption;
        if (typeof data.content === 'string') return data.content;
        if (typeof block.text === 'string') return block.text;
        return '';
      })
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    if (segments.length > 0) return segments.join(' ');
  }
  return undefined;
};

const calculateReadTimeFromText = (text?: string): string => {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 220);
  return `${minutes} min read`;
};

// Single source of truth for story read time (mirrors OpenPress src/helpers/storyUtils.js).
export const readTimeFromDescription = (description: unknown): string =>
  calculateReadTimeFromText(extractTextFromDescription(description));

/**
 * Build the `currentStory` object expected by `renderPageFromPuckJSON` for
 * Blog page rendering. Mirrors the structure produced by PuckOverrides'
 * inline `buildStoryOverride` so HTML output stays consistent.
 */
export const buildStoryOverride = (
  storyData: AnyStory,
  resolvedSlug?: string,
  resolvedCategory?: string,
  resolvedSection?: string
) => {
  if (!storyData) return undefined;

  const idCandidates = [
    safeString(storyData.storyId),
    safeString(storyData.id),
    safeString(storyData.slug),
    safeString(resolvedSlug)?.replace(/^\//, ''),
  ];
  const storyId = idCandidates.find((c) => typeof c === 'string' && c.length > 0);
  if (!storyId) return undefined;

  const fullDescription = extractTextFromDescription(storyData.description);
  const summary = safeString(storyData.storySummary) || summariseContent(fullDescription);
  const readTime = safeString(storyData.readTime) || calculateReadTimeFromText(fullDescription);

  return {
    id: storyId,
    title: safeString(storyData.title),
    slug: safeString(storyData.slug),
    publishUrl: safeString(storyData.publishUrl) || safeString(storyData.redirectUrl),
    headline: safeString(storyData.title) || 'Untitled Story',
    summary: summary || undefined,
    fullDescription: fullDescription || undefined,
    description: storyData.description,
    category: safeString(resolvedCategory) || safeString(storyData.category) || 'General',
    section: safeString(resolvedSection) || safeString(storyData.section) || 'General',
    author:
      safeString(storyData.authorName) ||
      safeString(storyData.author) ||
      'Unknown Author',
    authorName: safeString(storyData.authorName),
    authorId: safeString(storyData.authorId),
    readTime,
    imageUrl: safeString(storyData.image) || safeString(storyData.imageUrl) || undefined,
    socialImage:
      safeString(storyData.socialImage) ||
      safeString(storyData.image) ||
      safeString(storyData.imageUrl) ||
      undefined,
    imageAlt: safeString(storyData.title) || 'Story image',
    kicker: safeString(storyData.Section),
    storySummary: safeString(storyData.storySummary),
    keywords: storyData?.keywords || [],
    byLine: storyData?.byline || [],
    altText: storyData?.mediaAltText || '',
    caption: storyData?.mediaCaption || '',
    socialHeadline: safeString(storyData.socialHeadline),
    canonicalUrl: safeString(storyData.canonicalUrl),
    imageFocalPoint: storyData?.imageFocalPoint || { x: 50, y: 50 },
    // Keep the full date fallback chain used by card/sort renderers.
    proposedFilingDate: storyData?.proposedFilingDate || storyData?.publishDate || null,
    publishDate: storyData?.proposedFilingDate || storyData?.publishDate || null,
    publishedAt: storyData?.publishedAt || null,
    createdAt: storyData?.createdAt || null,
    updatedAt: storyData?.updatedAt || null,
  };
};
