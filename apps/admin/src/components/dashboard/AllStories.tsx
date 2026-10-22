// src/components/dashboard/AllStories.tsx
import { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { UserContext } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { useRouter } from '@/hooks/useRouter';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import { extractTextFromDescription as extractStoryText, calculateReadTimeFromText as storyReadTime } from '../../helpers/storyUtils';
import StoryReviewDialog from './StoryReviewDialog';
import SuggestStoryModal from '../common/SuggestStoryModal';
import { Story } from '../../context/KanbanContext';
import {
  STATUS_BADGE_LOOKUP,
  STATE_BADGE_LOOKUP,
  STORY_STATE_FILTERS,
} from './all-stories/constants';
import {
  GridStory,
  StoryFilterKey,
  StoryState,
  StorySummary,
} from './all-stories/types';
import { AllStoriesHeader } from './all-stories/AllStoriesHeader';
import { StoryFilters } from './all-stories/StoryFilters';
import { StoriesTable } from './all-stories/StoriesTable';
import { AllStoriesEmptyState } from './all-stories/AllStoriesEmptyState';
import { AllStoriesLoading } from './all-stories/AllStoriesLoading';
import CustomButton from '../common/CustomButton';
import ConfirmationModal from '../common/ConfirmationModal';
import { renderPageFromPuckJSON } from '../../../lib/renderBlogPage';
import { getPublishableData } from '../../helpers/publishedSnapshot';
import { fetchReadyToPublishStories } from '../../../lib/api/storyService';
import { Loader2, Trash2 } from 'lucide-react';
import { mapBackendCampaignToFrontend } from '@/helpers/campaignMapper';
import { removeStoryFromCache } from '../../utils/storiesCache';

interface AllStoriesProps {
  onBack: () => void;
  handleEditStory: (story: Story) => void;
}

interface FetchStoriesResponse {
  data?: StorySummary[];
  count?: number; // ✅ Total count from backend
}

const ITEMS_PER_PAGE = 50; // ✅ Load 50 stories at a time

const normaliseValue = (value?: string | null) =>
  (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const normaliseWorkflowStateKey = (state?: string | null) => {
  const key = normaliseValue(state);
  if (key === 'hold' || key === 'onhold') {
    return 'on_hold';
  }
  if (key === 'decline') {
    return 'rejected';
  }
  return key;
};

const normaliseStatusKey = (status?: string | null) => {
  const key = normaliseValue(status);
  if (key === 'drafts') {
    return 'draft';
  }
  if (key === 'hold' || key === 'onhold') {
    return 'on_hold';
  }
  if (key === 'decline') {
    return 'rejected';
  }
  return key;
};

const formatWorkflowState = (state?: string | null) => {
  if (!state) {
    return '—';
  }

  const normalised = state
    .toString()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalised) {
    return '—';
  }

  return normalised
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const getStateBadge = (state?: string | null) => {
  const stateKey = normaliseWorkflowStateKey(state);
  return (
    STATE_BADGE_LOOKUP[stateKey] ?? {
      label: formatWorkflowState(state),
      tone: 'default',
    }
  );
};

const getStatusBadge = (status?: string | null) => {
  const statusKey = normaliseStatusKey(status);
  return (
    STATUS_BADGE_LOOKUP[statusKey] ?? {
      label: formatWorkflowState(status),
      tone: 'default',
    }
  );
};

// --- Publishing Utilities ---

const safeString = (value: any) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractTextFromDescription = (description: any): string | undefined => {
  if (!description) return undefined;

  if (typeof description === "string") {
    const trimmed = safeString(description);
    if (!trimmed) return undefined;

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return extractTextFromDescription(parsed);
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
    return trimmed;
  }

  const maybeBlocks = description?.blocks;
  if (Array.isArray(maybeBlocks)) {
    const segments = maybeBlocks
      .map((block) => {
        if (!block || typeof block !== "object") return "";
        const data = block.data || {};
        if (block.type === "image") {
          const imgUrl = data.file?.url || data.url || "";
          return `<div class="w-full"><img src="${imgUrl}" alt="${data.caption || ""}" style="display: block; max-width: 100%; width: auto; height: auto; object-fit: contain;" loading="lazy" /></div>`;
        }
        else if (block.type === "caption") {
          const trimmedText = (data.text || "").trim();
          if (!trimmedText) return "";
          return `<div class="story-caption" style="text-align: left; width: 100%; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedText}</div>`;
        }
        else if (block.type === "paragraph" && typeof data.text === "string") {
          return `<p>${data.text}</p>`;
        }
        else if (block.type === "header") {
          const level = data.level || 2;
          return `<h${level}>${data.text || ""}</h${level}>`;
        }
        else if (block.type === "list") {
          const isOrdered = data.style === "ordered";
          const tag = isOrdered ? "ol" : "ul";
          const listStyleType = isOrdered ? "decimal" : "disc";
          const items = Array.isArray(data.items) 
            ? data.items.map((item: any) => `<li style="margin-bottom: 0.25rem;">${typeof item === 'string' ? item : item.content || ""}</li>`).join("") 
            : "";
          return `<${tag} style="list-style-type: ${listStyleType}; padding-left: 1.5rem; margin-bottom: 1rem;">${items}</${tag}>`;
        }
        else if (block.type === "quote") {
          const text = data.text || "";
          const alignment = data.alignment || "left";
          const caption = data.caption ? `<cite>${data.caption}</cite>` : "";
          return `<blockquote style="text-align: ${alignment};">${text}${caption}</blockquote>`;
        }
        else if (block.type === "embed" || block.type === "youtube" || block.type === "instagram" || block.type === "soundcloud") {
          const embedUrl = data.embed || data.source;
          if (embedUrl) {
            let captionMaxWidth = '800px';
            if (data.service === 'instagram' || block.type === 'instagram') {
              captionMaxWidth = '550px';
            }
            const trimmedCaption = (data.caption || "").trim();
            const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: ${captionMaxWidth}; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
            let style = 'width: 100%; border: none; margin: 0 auto; display: block;';
            let height = data.height || 400;
            let width = data.width || '100%';
            
            if (data.service === 'instagram') {
              style += ' max-width: 550px; height: 700px;';
            } else if (data.service === 'soundcloud') {
              style += ' height: 300px;';
            } else if (data.service === 'youtube') {
              style += ' aspect-ratio: 16/9; max-width: 800px;';
            }
            
            return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${embedUrl}" style="${style}" height="${height}" width="${width}" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
          }
          return "";
        }
        else if (block.type === "facebook") {
          const embedUrl = data.url || data.embed || data.source;
          if (embedUrl) {
            const trimmedCaption = (data.caption || "").trim();
            const embedCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 800px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
            const encodedUrl = encodeURIComponent(embedUrl);
            const fbSrc = `https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=false&width=500`;
            return `<div class="embed-wrapper mb-2" style="width: 100%; display: flex; flex-direction: column; align-items: center;"><iframe class="embed-tool__content" src="${fbSrc}" style="width: 100%; border: none; margin: 0 auto; display: block;" height="497" width="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media"></iframe>${embedCaption}</div>`;
          }
          return "";
        }
        else if (block.type === "twitter") {
          const tweetHtml = (data.html || '').replace(/\n/g, '');
          const trimmedCaption = (data.caption || "").trim();
          const tweetCaption = trimmedCaption ? `<div class="story-caption" style="text-align: left; width: 100%; max-width: 550px; font-size: 16px; font-family: 'Lato', sans-serif; font-weight: 500; color: #716d6d; margin-top: 0.75rem; margin-bottom: 0.75rem; line-height: 1.375;">${trimmedCaption}</div>` : '';
          return `<div class="twitter-embed-wrapper mb-2 w-full flex flex-col items-center">${tweetHtml}${tweetCaption}</div>`;
        }
        else if (typeof data.text === "string") return data.text;
        else if (typeof data.caption === "string") return data.caption;
        else if (typeof data.content === "string") return data.content;
        else if (typeof block.text === "string") return block.text;
        else return "";
      })
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (segments.length > 0) {
      return segments.join("");
    }
  }

  return undefined;
};

const summariseContent = (text: string | undefined) => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (trimmed.length <= 200) {
    return trimmed;
  }
  return `${trimmed.slice(0, 197).trim()}...`;
};

const generateSlugFromTitle = (title: string | undefined): string => {
  if (!title || typeof title !== 'string') return "";
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
  return cleanTitle ? `/${cleanTitle}` : "";
};

const getBestSocialImage = (storyData: any, cleanStory?: any) => {
  const socialImage = safeString(storyData?.socialImage) || safeString(cleanStory?.socialImage);
  const mainImage = safeString(storyData?.image) || safeString(storyData?.imageUrl) || safeString(cleanStory?.imageUrl);

  // LOGIC: 
  // 1. If we have a unique social image (contains '_' or '-' suffix from our new naming scheme), use it.
  // 2. If social image is generic (social_preview.jpg), an "edited" version that is often small/stale, 
  //    or missing, prefer mainImage (Featured) as it's more likely to be the correct unique asset.
  // 3. Final fallback to whatever is available.

  const isUniqueSocial = socialImage && (socialImage.includes('social_preview_') || socialImage.includes('social_preview-'));

  let rawImage = "";
  if (isUniqueSocial) {
    rawImage = socialImage;
  } else if (mainImage) {
    rawImage = mainImage;
  } else {
    rawImage = socialImage || "";
  }

  if (!rawImage || /^data:/i.test(rawImage) || /^blob:/i.test(rawImage)) {
    return "";
  }

  if (/^https?:\/\//i.test(rawImage)) {
    return rawImage;
  }

  if (typeof window !== "undefined" && rawImage.startsWith("/")) {
    return `${window.location.origin}${rawImage}`;
  }

  return rawImage;
};

const buildStoryOverride = (storyData: any, resolvedSlug: string, resolvedCategory: string, resolvedSection: string) => {
  if (!storyData) return undefined;

  const idCandidates = [
    safeString(storyData.storyId),
    safeString(storyData.id),
    safeString(storyData.slug),
    safeString(storyData.storySlug),
    safeString(resolvedSlug)?.replace(/^\//, ""),
  ];

  const storyId = idCandidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
  if (!storyId) return undefined;

  const fullDescription = extractTextFromDescription(storyData.description);
  const summary = safeString(storyData.summary) || summariseContent(fullDescription);

  const readTime =
    safeString(storyData.readTime) ||
    safeString(storyData.read_time) ||
    storyReadTime(extractStoryText(storyData.description));

  return {
    id: storyId,
    headline: safeString(storyData.title) || safeString(storyData.headline) || "Untitled Story",
    summary: summary || undefined,
    fullDescription: fullDescription || undefined,
    category: safeString(resolvedCategory) || safeString(storyData.category) || "General",
    section: safeString(resolvedSection) || safeString(storyData.section) || "General",
    author: safeString(storyData.authorName) || safeString(storyData.author) || "Unknown Author",
    readTime,
    imageUrl: safeString(storyData.image) || safeString(storyData.imageUrl) || undefined,
    imageAuthor: safeString(storyData.authorName) || safeString(storyData.author) || "Staff Photo",
    imageAlt: safeString(storyData.title) || "Story image",
    kicker: safeString(storyData.section || storyData.Section),
    storySummary: safeString(storyData.storySummary),
    keywords: storyData?.keywords || [],
    byLine: storyData?.byline || [],
    altText: storyData?.mediaAltText || "",
    caption: storyData?.mediaCaption || "",
    imageFocalPoint: storyData?.imageFocalPoint || { x: 50, y: 50 },
    publishDate: storyData?.proposedFilingDate || storyData?.publishDate || null,
    socialImage: safeString(storyData.socialImage),
    socialHeadline: safeString(storyData.socialHeadline),
    canonicalUrl: safeString(storyData.canonicalUrl),
  };
};

export default function AllStories({ onBack, handleEditStory }: AllStoriesProps) {
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const isUserLoading = userContext?.loading ?? true;
  const router = useRouter();
  const API = `${env.backendApi}`;

  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // ✅ Separate state for filter searches (no full-page replace)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [activeType, setActiveType] = useState<StoryFilterKey>('all');
  const [serverFilters, setServerFilters] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogData, setReviewDialogData] = useState<StorySummary | null>(null);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestModalData, setSuggestModalData] = useState<StorySummary | null>(null);

  // --- Publishing States ---
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishTotal, setPublishTotal] = useState(0);
  const [publishStatus, setPublishStatus] = useState("");
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [storiesToPublish, setStoriesToPublish] = useState<StorySummary[]>([]);

  // --- Deletion States ---
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    storiesToDelete: GridStory[];
    title: string;
    message: string;
  }>({
    isOpen: false,
    storiesToDelete: [],
    title: '',
    message: '',
  });

  const canDeleteStory = useCallback((story: StorySummary | GridStory): boolean => {
    if (!story || !user) return false;
    const isSuperUser = user.role?.toLowerCase() === 'super user';
    const isAssignedReporter = story.authorId === user.userId;
    return isSuperUser || isAssignedReporter;
  }, [user]);

  const promptDeleteSingle = useCallback((story: GridStory) => {
    if (!canDeleteStory(story)) {
      toast.error('Only a Super User or the story creator can delete this story.');
      return;
    }
    setDeleteModalState({
      isOpen: true,
      storiesToDelete: [story],
      title: 'Delete Story',
      message: `Are you sure you want to permanently delete "${story.title || 'Untitled Draft'}"? This action cannot be undone.`,
    });
  }, [canDeleteStory]);

  const executeDelete = async () => {
    const { storiesToDelete } = deleteModalState;
    if (storiesToDelete.length === 0) return;

    setIsDeleting(true);
    setDeleteModalState((prev) => ({ ...prev, isOpen: false }));

    const toastId = toast.loading(`Deleting ${storiesToDelete.length} ${storiesToDelete.length === 1 ? 'story' : 'stories'}...`);

    const deletedIds: string[] = [];
    const failedIds: string[] = [];

    await Promise.allSettled(
      storiesToDelete.map(async (story) => {
        try {
          const res = await apiFetch(
            `${env.backendApi}/api/deleteStoryPermanent?storyId=${encodeURIComponent(story.storyId)}`,
            {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(user?.token && { Authorization: `Bearer ${user.token}` }),
              },
            }
          );
          if (res.ok) {
            deletedIds.push(story.storyId);
            removeStoryFromCache(story.storyId);
          } else {
            failedIds.push(story.storyId);
          }
        } catch (err) {
          console.error(`Failed to delete story ${story.storyId}:`, err);
          failedIds.push(story.storyId);
        }
      })
    );

    if (deletedIds.length > 0) {
      setStories((prev) => prev.filter((s) => !deletedIds.includes(s.storyId)));
      setSelectedStoryIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
      setTotalCount((prev) => Math.max(0, prev - deletedIds.length));
    }

    setIsDeleting(false);
    toast.dismiss(toastId);

    if (deletedIds.length > 0 && failedIds.length === 0) {
      toast.success(
        deletedIds.length === 1
          ? 'Story deleted successfully.'
          : `Successfully deleted ${deletedIds.length} stories.`
      );
    } else if (deletedIds.length > 0 && failedIds.length > 0) {
      toast.success(`Deleted ${deletedIds.length} stories. ${failedIds.length} failed.`);
    } else {
      toast.error('Failed to delete selected stories.');
    }
  };

  // ✅ Helper to parse DevExpress filters into API query params
  const parseDataGridFilter = useCallback((filter: any) => {
    const result: any = {};
    if (!filter) return result;

    const processFilter = (subFilter: any) => {
      if (!Array.isArray(subFilter)) return;

      if (typeof subFilter[0] === 'string') {
        const [field, , value] = subFilter;
        const fieldMapping: Record<string, string> = {
          title: 'title',
          authorDisplay: 'authorName',
          storySection: 'section',
          workflowStateValue: 'state',
          statusValue: 'status',
          createdAt: 'createdAt',
        };

        const apiField = fieldMapping[field];
        if (apiField && value !== undefined && value !== null && value !== '') {
          if (apiField === 'createdAt' && value instanceof Date) {
            result[apiField] = value.toISOString().split('T')[0];
          } else if (apiField === 'createdAt' && typeof value === 'string') {
            result[apiField] = value.split('T')[0];
          } else {
            result[apiField] = value;
          }
        }
      } else {
        subFilter.forEach((item) => {
          if (Array.isArray(item)) {
            processFilter(item);
          }
        });
      }
    };

    processFilter(filter);
    return result;
  }, []);

  // ✅ Initial fetch on mount (no filters)

  const fetchUserStories = useCallback(async () => {
    if (!user || !user.userId) {
      setStoriesLoading(false);
      return;
    }

    setStoriesLoading(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
      };

      const workflowStates: StoryState[] = [
        'on_hold',
        'rejected',
        'decision_awaited',
        'approved',
        'draft',
      ];

      // ✅ Single API call with pagination
      const params = new URLSearchParams();
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', '0');
      params.set('state', workflowStates.join(','));

      if (user.role === 'journalist') {
        params.set('authorId', user.userId);
      }

      const response = await apiFetch(
        `${API}/api/fetchStory?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const data: FetchStoriesResponse = await response.json();
      const fetchedStories = data?.data ?? [];
      const total = data?.count ?? 0;

      setStories(fetchedStories);
      setCurrentOffset(fetchedStories.length);
      setTotalCount(total);
      setHasMore(fetchedStories.length < total);
      setServerFilters({}); // ✅ Clear server filters when reloading normal data

      console.log(`✅ Loaded ${fetchedStories.length} stories (total: ${total})`);
    } catch (err) {
      console.error('Error fetching stories:', err);
      toast.error('Failed to fetch stories');
    } finally {
      setStoriesLoading(false);
    }
  }, [user, API]);


  // ✅ Separate function for server-side filter search — uses isSearching, not storiesLoading
  // Accepts a plain {apiField: value} map built directly by StoriesTable.
  const fetchFilteredStories = useCallback(async (apiParams: Record<string, string>) => {
    if (!user || !user.userId) return;

    console.log('🔍 [AllStories] fetchFilteredStories called with apiParams:', apiParams);

    if (Object.keys(apiParams).length === 0) {
      // No filters — reload normal data
      setServerFilters({});
      fetchUserStories();
      return;
    }

    setIsSearching(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
      };

      const params = new URLSearchParams();
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', '0');

      // ✅ apiParams already has the correct API field names (title, authorName, section, etc.)
      Object.entries(apiParams).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      if (user.role === 'journalist') {
        params.set('authorId', user.userId);
      }

      // ✅ Tell the backend this is a filtered search, not a normal paginated fetch
      params.set('isFiltering', 'true');

      console.log('🚀 [AllStories] Filter API URL:', `${API}/api/fetchStory?${params.toString()}`);

      const response = await apiFetch(
        `${API}/api/fetchStory?${params.toString()}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to fetch filtered stories');

      const data: FetchStoriesResponse = await response.json();
      const fetchedStories = data?.data ?? [];
      const total = data?.count ?? 0;

      setStories(fetchedStories);
      setCurrentOffset(fetchedStories.length);
      setTotalCount(total);
      setHasMore(fetchedStories.length < total);
      setServerFilters(apiParams); // ✅ Store the plain params for loadMore

      console.log(`✅ Filter results: ${fetchedStories.length} stories (total: ${total})`);
      toast.success(`Found ${fetchedStories.length} matching stories`);
    } catch (err) {
      console.error('Error fetching filtered stories:', err);
      toast.error('Failed to search stories');
    } finally {
      setIsSearching(false);
    }
  }, [user, API, fetchUserStories]);

  // ✅ Called by StoriesTable when user presses Enter in a filter row
  const handleApplyServerFilter = (apiParams: Record<string, string>) => {
    console.log('🚀 handleApplyServerFilter called with:', apiParams);
    const newParams = { ...apiParams };
    if (newParams.state) {
      setActiveType(newParams.state as StoryFilterKey);
    } else if (activeType !== 'all') {
      newParams.state = activeType;
    }
    fetchFilteredStories(newParams);
  };


  // ✅ Load more stories
  const loadMoreStories = async () => {
    if (isLoadingMore || !hasMore || !user) return;

    console.log(`🔄 Loading more stories... (offset: ${currentOffset})`);
    setIsLoadingMore(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        // ...(user?.role && { 'x-user-role': user.role }),
        // ...(user?.id && { 'x-user-id': user.id }),
      };

      const workflowStates: StoryState[] = [
        'on_hold',
        'rejected',
        'decision_awaited',
        'approved',
        'draft',
      ];

      const params = new URLSearchParams();
      params.set('limit', String(ITEMS_PER_PAGE));
      params.set('offset', String(currentOffset));

      // ✅ Include filters in load more (serverFilters is now a plain apiParams map)
      if (serverFilters && Object.keys(serverFilters).length > 0) {
        Object.entries(serverFilters).forEach(([key, value]) => {
          params.set(key, String(value));
        });
        params.set('isFiltering', 'true'); // ✅ Also in load-more when filters are active
      } else {
        params.set('state', workflowStates.join(','));
      }

      if (user.role === 'journalist') {
        params.set('authorId', user.userId);
      }

      const response = await apiFetch(
        `${API}/api/fetchStory?${params.toString()}`,
        { headers, method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch more stories');
      }

      const data: FetchStoriesResponse = await response.json();
      const fetchedStories = data?.data ?? [];
      const total = data?.count ?? 0;

      if (fetchedStories.length > 0) {
        setStories((prev) => [...prev, ...fetchedStories]);
        setCurrentOffset((prev) => prev + fetchedStories.length);
        setTotalCount(total);
        setHasMore(currentOffset + fetchedStories.length < total);

        console.log(`✅ Loaded ${fetchedStories.length} more stories`);
        toast.success(`Loaded ${fetchedStories.length} more stories`);
      } else {
        setHasMore(false);
        toast.success('No more stories to load');
      }
    } catch (err) {
      console.error('Error loading more stories:', err);
      toast.error('Failed to load more stories');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isUserLoading) return;

    if (user?.userId) {
      fetchUserStories();
    } else {
      setStories([]);
      setStoriesLoading(false);
    }
  }, [isUserLoading, user?.userId, fetchUserStories]);

  const handleStoryClick = (story: StorySummary) => {
    console.log("story clicked ....,", story);
    handleEditStory(story as unknown as Story);
    console.log("story clicked ended ...");
  };

  const gridData: GridStory[] = useMemo(
    () =>
      stories.map((story) => {
        const stateBadge = getStateBadge(story.state ?? story.status);
        const statusBadge = getStatusBadge(story.status);
        const assignedEditorName = Array.isArray(story.assignedToName)
          ? story.assignedToName[0]
          : story.assignedToName ?? '—';
        return {
          ...story,
          createdAt: story.createdAt ? new Date(story.createdAt) : undefined,
          updatedAt: story.updatedAt ? new Date(story.updatedAt) : undefined,
          proposedFilingDate: story.proposedFilingDate ? new Date(story.proposedFilingDate) : undefined,
          publishedAt: story.publishedAt ? new Date(story.publishedAt) : undefined,
          statusLabel: statusBadge.label,
          statusTone: statusBadge.tone,
          workflowStateLabel: stateBadge.label,
          workflowStateTone: stateBadge.tone,
          statusValue: normaliseStatusKey(story.status),
          workflowStateValue: normaliseWorkflowStateKey(story.state ?? story.status),
          authorDisplay: story.authorName ?? '—',
          assignedToDisplay: assignedEditorName ?? '—',
          storySection: story.Section ?? '—',
        };
      }),
    [stories],
  );

  const promptDeleteMultiple = useCallback(() => {
    if (selectedStoryIds.length === 0) return;
    const targets = gridData.filter((s) => selectedStoryIds.includes(s.storyId));
    const deletable = targets.filter(canDeleteStory);

    if (deletable.length === 0) {
      toast.error('You do not have permission to delete any of the selected stories.');
      return;
    }

    const nonDeletableCount = targets.length - deletable.length;
    let message = `Are you sure you want to permanently delete ${deletable.length} selected ${deletable.length === 1 ? 'story' : 'stories'}? This action cannot be undone.`;
    if (nonDeletableCount > 0) {
      message += ` (${nonDeletableCount} ${nonDeletableCount === 1 ? 'story was' : 'stories were'} excluded due to insufficient permissions)`;
    }

    setDeleteModalState({
      isOpen: true,
      storiesToDelete: deletable,
      title: `Delete ${deletable.length} Stories`,
      message,
    });
  }, [selectedStoryIds, gridData, canDeleteStory]);

  const fetchBlogPageJson = async () => {
    try {
      const res = await apiFetch(`${env.backendApi}/pagestudio/page?id=9c785fd3-5416-4631-860a-f66def8e3b15&pageType=Blog`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error fetching Blog page:", error);
      return null;
    }
  };

  const republishStory = async (
    storySummary: StorySummary,
    freshPageJson: any,
    sectionsList: string[],
    combinedStoriesById: any,
    campaigns: any[] = [],
    authorsList: any[] = []
  ) => {
    const currentStoryId = storySummary.storyId;
    try {
      // 1. Fetch fresh story data
      const storyResponse = await apiFetch(
        `${env.backendApi}/api/storyById?storyId=${currentStoryId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        }
      );

      if (!storyResponse.ok) throw new Error("Failed to fetch story data");
      const storyResult = await storyResponse.json();
      const freshStoryData = storyResult?.data || storyResult;

      // 2. Resolve slug and metadata
      const isAlreadyPublished =
        freshStoryData?.status?.toLowerCase() === 'published' ||
        storySummary?.status?.toLowerCase() === 'published' ||
        !!freshStoryData?.publishUrl ||
        !!freshStoryData?.publishedUrl ||
        !!freshStoryData?.published_url ||
        !!freshStoryData?.publishedAt;

      let resolvedSlug = "";
      if (isAlreadyPublished) {
        const slugFromStory = freshStoryData?.slug || freshStoryData?.storySlug || storySummary?.slug;
        resolvedSlug = slugFromStory || generateSlugFromTitle(freshStoryData?.title || storySummary?.title);
      } else {
        const currentTitle = freshStoryData?.title || storySummary?.title || "";
        const generatedSlug = generateSlugFromTitle(currentTitle);
        resolvedSlug =
          generatedSlug ||
          freshStoryData?.slug ||
          freshStoryData?.storySlug ||
          (freshStoryData?.storyId ? `/${String(freshStoryData.storyId).trim()}` : "");
      }

      const resolvedSection = freshStoryData.section || freshStoryData.Section || "General";
      const resolvedCategory = freshStoryData.category || freshStoryData.Category || resolvedSection || "General";

      if (!resolvedSlug || !resolvedCategory) {
        throw new Error(`Missing ${!resolvedSlug ? 'slug' : 'category'} for story ${currentStoryId}`);
      }

      // 3. Build override data
      const cleanStory = buildStoryOverride(freshStoryData, resolvedSlug, resolvedCategory, resolvedSection);
      if (!cleanStory) throw new Error("Failed to build story override");
      localStorage.setItem("currentStory", JSON.stringify(cleanStory));


      // 4. Render HTML
      const htmlCode = renderPageFromPuckJSON({
        ...freshPageJson,
        data: getPublishableData(freshPageJson?.data),
        storiesById: combinedStoriesById
      }, {
        sections: sectionsList,
        ogDescription: freshStoryData.storySummary || cleanStory.summary || "",
        ogImage: getBestSocialImage(freshStoryData, cleanStory),
        ogTitle: freshStoryData.socialHeadline || cleanStory.socialHeadline || cleanStory.headline || "",
        keywords: cleanStory.keywords || [],
        authors: authorsList,
        currentStory: cleanStory,
        campaigns: campaigns
      } as any);

      console.log("html code >>>>", htmlCode);

      // 5. Save HTML
      const payload = {
        htmlContent: htmlCode,
        slug: resolvedSlug,
        section: resolvedSection,
        socialImage: getBestSocialImage(freshStoryData, cleanStory),
      };

      const saveRes = await apiFetch(`${env.backendApi}/pagestudio/saveHtml`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token && { Authorization: `Bearer ${user.token}` })
        },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) throw new Error("Failed to upload HTML");
      const saveResult = await saveRes.json();
      const finalUrl = saveResult?.data?.url;

      // 6. Update status in backend
      const resolvedSocialImage = getBestSocialImage(freshStoryData, cleanStory);
      const updatePayload = {
        status: "published",
        publishUrl: finalUrl,
        socialImage: resolvedSocialImage,
        socialHeadline: cleanStory.socialHeadline || cleanStory.headline || "",
        canonicalUrl: cleanStory.canonicalUrl || ""
      };

      const updateRes = await apiFetch(`${env.backendApi}/api/updateStory?storyId=${currentStoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateRes.ok) throw new Error("Failed to update story status");

      return true;
    } catch (error: any) {
      console.error(`Error republishing story ${currentStoryId}:`, error);
      return false;
    }
  };

  const handlePublishAll = async () => {
    setIsPublishingAll(true); // Temporarily set to true to show loading state if needed, or manage separate loading
    setPublishStatus("Fetching initial data...");

    try {
      // 1. Fetch all published stories from backend
      const params = new URLSearchParams();
      params.set('status', 'published');
      params.set('limit', '1000'); // Fetch a large number to cover all

      const storiesRes = await apiFetch(`${env.backendApi}/api/fetchStory?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        }
      });

      if (!storiesRes.ok) throw new Error("Failed to fetch all published stories");
      const storiesData = await storiesRes.json();
      const allPublishedStories: StorySummary[] = storiesData?.data ?? [];

      if (allPublishedStories.length === 0) {
        toast.error("No published stories found to re-publish.");
        setIsPublishingAll(false);
        setPublishStatus("");
        return;
      }

      // Open Modal instead of confirm
      setStoriesToPublish(allPublishedStories);
      setIsPublishModalOpen(true);
      setIsPublishingAll(false); // Reset this until confirmed
      setPublishStatus("");

    } catch (error: any) {
      console.error("Error during Publish All fetch:", error);
      toast.error(`Error: ${error.message}`);
      setIsPublishingAll(false);
      setPublishStatus("");
    }
  };

  const confirmPublishAll = async () => {
    setIsPublishModalOpen(false);
    setIsPublishingAll(true);
    const allPublishedStories = storiesToPublish;

    try {
      setPublishTotal(allPublishedStories.length);
      setPublishProgress(0);
      setPublishStatus(`Starting re-publish of ${allPublishedStories.length} stories...`);

      // 2. Fetch global data once
      setPublishStatus("Loading page context...");
      const freshPageJson = await fetchBlogPageJson();
      if (!freshPageJson) throw new Error("Failed to fetch blog page JSON");

      let sectionsList: string[] = [];
      try {
        const sectionsRes = await apiFetch(`${env.backendApi}/taxonomy/section/values`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        });
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          if (Array.isArray(sectionsData.values)) sectionsList = sectionsData.values;
        }
      } catch (e) { console.warn("Sections fetch failed", e); }

      let latestStoriesById = {};
      try {
        latestStoriesById = await fetchReadyToPublishStories(env.backendApi, user?.token);
      } catch (e) { console.warn("Latest stories fetch failed", e); }

      const combinedStoriesById = {
        ...(freshPageJson?.storiesById || {}),
        ...latestStoriesById
      };

      // Fetch authors
      let authorsList = [];
      try {
        const authorsRes = await apiFetch(`${env.backendApi}/getAuthors`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        });
        if (authorsRes.ok) {
          const authorsData = await authorsRes.json();
          const rawAuthors = Array.isArray(authorsData) ? authorsData : (authorsData.authors || authorsData.data || []);
          authorsList = rawAuthors.map((dbAuthor: any, index: number) => ({
            id: dbAuthor.userId || dbAuthor.id || `author-${index}`,
            name: dbAuthor.authorName || dbAuthor.fullName || "",
            authorId: dbAuthor.userId || dbAuthor.id || "",
          }));
        }
      } catch (e) {
        console.warn("Authors fetch failed", e);
      }

      // Fetch campaigns
      let campaignsList: any[] = [];
      try {
        const campRes = await apiFetch(`${env.backendApi}/getCampaigns`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          campaignsList = (campData.campaigns || []).map(mapBackendCampaignToFrontend);
        }
      } catch (e) {
        console.warn("Failed to fetch campaigns for Publish All:", e);
      }

      // 3. Loop and republish
      let successCount = 0;
      for (let i = 0; i < allPublishedStories.length; i++) {
        const story = allPublishedStories[i];
        setPublishProgress(i + 1);
        setPublishStatus(`Republishing [${i + 1}/${allPublishedStories.length}]`);

        const success = await republishStory(story, freshPageJson, sectionsList, combinedStoriesById, campaignsList, authorsList);
        if (success) successCount++;
      }

      setPublishStatus(`Completed! Success: ${successCount}, Failed: ${allPublishedStories.length - successCount}`);
      toast.success(`Re-published ${successCount} stories successfully.`);

      try {
        await apiFetch(`${env.backendApi}/pagestudio/saveSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        });
        await apiFetch(`${env.backendApi}/pagestudio/saveNewsSiteMap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
        });
      } catch (error) {
        console.error("Error saving sitemap:", error);
      }

    } catch (error: any) {
      console.error("Error during Publish All:", error);
      toast.error(`Error: ${error.message}`);
      setPublishStatus(`Error: ${error.message}`);
    } finally {
      setTimeout(() => {
        setIsPublishingAll(false);
        setPublishStatus("");
      }, 5000);
    }
  };

  if (storiesLoading || isUserLoading) {
    return <AllStoriesLoading />;
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 sm:p-6 text-center">
        <p className="text-base sm:text-lg font-medium text-gray-800">
          Please sign in to view and manage your stories.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-primary/90 transition-colors whitespace-nowrap"
          onClick={() => router.push('/login')}
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .allstories-datagrid .dx-datagrid-pager,
        .allstories-datagrid .dx-datagrid-bottom-content {
          background-color: #fff !important;
          border-top: none !important;
          box-shadow: none !important;
          margin-top: 0 !important;
        }

        .allstories-datagrid .dx-datagrid-rowsview .dx-row:last-child > td {
          border-bottom: none !important;
        }

        .allstories-datagrid .dx-datagrid-headers .dx-header-row td {
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .allstories-datagrid .dx-datagrid-rowsview .dx-row > td {
          font-weight: 400 !important;
          color: #000 !important;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="flex-1 flex flex-col min-h-0">
        <AllStoriesHeader onBack={onBack} />

        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                All Stories
              </h1>
              {/* ✅ Build Progress or Buttons */}
              <div className="flex items-center gap-4">
                {isPublishingAll ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{publishStatus}</span>
                    </div>
                    <div className="w-48 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(publishProgress / publishTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <CustomButton
                    variant="outline"
                    onClick={handlePublishAll}
                    disabled={storiesLoading || stories.length === 0}
                    className="flex items-center gap-2"
                  >
                    Publish All
                  </CustomButton>
                )}
              </div>
            </div>

            {/* ✅ Bulk Selection Actions Bar */}
            {selectedStoryIds.length > 0 && (
              <div className="flex items-center justify-between bg-red-50/90 border border-red-200/90 px-4 py-3 rounded-xl backdrop-blur-md transition-all shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-sm font-semibold text-red-950">
                    {selectedStoryIds.length} {selectedStoryIds.length === 1 ? 'story' : 'stories'} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStoryIds([])}
                    className="text-xs font-medium text-gray-600 hover:text-black px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    Deselect all
                  </button>
                  <button
                    type="button"
                    onClick={promptDeleteMultiple}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <Trash2 size={13} />
                    {isDeleting ? 'Deleting...' : `Delete Selected (${selectedStoryIds.length})`}
                  </button>
                </div>
              </div>
            )}

            <StoryFilters
              filters={STORY_STATE_FILTERS}
              activeFilter={activeType}
              onSelect={(filter) => {
                setActiveType(filter);
                const newParams = { ...(serverFilters || {}) };
                if (filter === 'all') {
                  delete newParams.state;
                } else {
                  newParams.state = filter;
                }
                fetchFilteredStories(newParams);
              }}
            />

            <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
              <StoriesTable
                stories={gridData}
                onStoryClick={(story) => handleStoryClick(story)}
                stateFilters={STORY_STATE_FILTERS}
                stateLookup={STATE_BADGE_LOOKUP}
                statusLookup={STATUS_BADGE_LOOKUP}
                isSearching={isSearching}
                onApplyServerFilter={handleApplyServerFilter}
                selectedStoryIds={selectedStoryIds}
                onSelectionChanged={setSelectedStoryIds}
                onDeleteSingle={promptDeleteSingle}
                canDeleteStory={canDeleteStory}
              />
            </div>

            {/* ✅ Load More Button */}
            {hasMore && gridData.length > 0 && (
              <div className="flex justify-center items-center py-4">
                <CustomButton
                  onClick={loadMoreStories}
                  disabled={isLoadingMore}
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    `Load More (${stories.length} / ${totalCount})`
                  )}
                </CustomButton>
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={confirmPublishAll}
        title="Publish All"
        message={`Are you sure you want to re-publish ${storiesToPublish.length} stories one by one?`}
        confirmText="Re-publish"
        isDestructive={true}
      />

      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModalState.title}
        message={deleteModalState.message}
        confirmText="Delete"
        isDestructive={true}
      />

      {suggestModalOpen && (
        <SuggestStoryModal
          isOpen={suggestModalOpen}
          onClose={() => {
            setSuggestModalOpen(false);
            setSuggestModalData(null);
            fetchUserStories();
          }}
          prefillData={suggestModalData}
        />
      )}

      {reviewDialogOpen && (
        <StoryReviewDialog
          onClose={() => {
            setReviewDialogOpen(false);
            setReviewDialogData(null);
            fetchUserStories();
          }}
          story={reviewDialogData}
          isOpen={reviewDialogOpen}
        />
      )}
    </>
  );
}
