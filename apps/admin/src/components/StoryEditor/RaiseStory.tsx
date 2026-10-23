// src/components/RaiseStory.tsx
import type EditorJS from '@editorjs/editorjs';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { Story } from '../../context/KanbanContext';
import { useKanbanContext } from '../../context/KanbanContext';
import {
  invalidateStoriesCache,
  upsertStoryInCache,
} from '../../utils/storiesCache';
import { UserContext, RolePermissions } from '../../context/UserContext';
import { EditorBlock } from '../ai/ai-types';
import { RaiseStoryHeader } from './RaiseStoryHeader';
import { StoryHeader } from './StoryHeader';
import { StoryEditorCanvas, type StoryEditorAIConfig } from './StoryEditorCanvas';
import RaiseStoryDrawer from '../../components/common/DAM/Drawer/RaiseStoryDrawer';
import ReviewDrawer from '../../components/common/DAM/Drawer/ReviewDrawer';
import PublishDrawer from '../../components/common/DAM/Drawer/PublishDrawer';
import FeaturedImageCropper from "../../components/common/FeaturedImageCropper";
import AssetModal from "../../components/common/AssetModal";
import { Popup } from '@/components/ui/kit/popup';
import { checkStoryPermission } from '../../utils/storyPermissions';
import env from '@/utils/env';
type InlineImageMeta = { url: string; caption?: string };
interface EditorContent {
  time?: number;
  blocks: EditorBlock[];
  version?: string;
}
export interface EditorOption {
  userId: string;
  fullName?: string;
  role: string;
}
interface TaxonomyType {
  name: string;
  isMendatory?: boolean;
  values?: string[];
  permissions?: {
    [key: string]: boolean;
  };
  selectionType?: 'single' | 'multi' | string;
  allowMultiple?: boolean;
}
type ValidationField =
  | 'section'
  | 'category'
  | 'proposedDate'
  | 'assignedEditor';
type ValidationErrors = Record<string, string>;
type StoryDetails = Story & {
  _id?: string;
  description?: EditorContent;
  proposedFilingDate?: string;
  assignedTo?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  featureImg?: string | null;
  imageUrl?: string | null;
  inlineImages?: InlineImageMeta[];
  mediaCaptions?: InlineImageMeta[];
  imageDescription?: string;
  storySummary?: string;
  imageFocalPoint?: { x: number; y: number } | null;
  socialImage?: string | null;
  summary?: string | null;
  [key: string]: any;
};

interface AssetModalAsset {
  summary?: string | null;
  caption?: string | null;
  [key: string]: unknown;
}

interface AssetModalSelection {
  url: string;
  summary?: string | null;
  caption?: string | null;
}

const stripHtml = (input?: string | null): string => {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').trim();
};

const extractInlineImages = (blocks?: EditorBlock[]): InlineImageMeta[] => {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const seen = new Set<string>();
  const images: InlineImageMeta[] = [];

  blocks.forEach((block) => {
    if (!block || typeof block !== 'object') {
      return;
    }

    const data = block.data ?? {};
    const fileUrl: unknown = data?.file?.url ?? data?.url;
    if (typeof fileUrl !== 'string' || fileUrl.trim() === '') {
      return;
    }

    const url = fileUrl.trim();
    if (seen.has(url)) {
      return;
    }

    seen.add(url);

    const caption = stripHtml(typeof data?.caption === 'string' ? data.caption : null);
    if (caption) {
      images.push({ url, caption });
    } else {
      images.push({ url });
    }
  });

  return images;
};

const normalizeSelectionMode = (value?: string | boolean | null): 'single' | 'multi' => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('multi')) {
      return 'multi';
    }
    if (normalized.includes('single')) {
      return 'single';
    }
  }
  if (typeof value === 'boolean') {
    return value ? 'multi' : 'single';
  }
  return 'single';
};

const ensureArrayValue = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === 'string' && value.trim() === '') {
    return [];
  }
  return [value];
};

const firstValue = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] ?? null : null;
  }
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
};

// Scheduled stories reuse the ready_to_publish permission profile so no new admin config is needed.
const permissionStatus = (status?: string | null): string => {
  if (status?.toLowerCase() === 'scheduled') return 'ready_to_publish';
  return status || '';
};

// story action
type StoryStatus = 'In_progress' | 'On_hold' | 'Rejected' | string;

// Main Component
export default function RaiseStory({
  onBack,
  storyData: initialStoryData,
  handleShowAllStories,
  permissions,
}: {
  onBack: () => void;
  storyData?: Story | null;
  handleShowAllStories: () => void;
  permissions?: RolePermissions | null;

}) {

  console.log("initial story data >>>", initialStoryData);

  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const isUserLoading = userContext?.loading ?? true;
  const { setStories } = useKanbanContext();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [featuredImageCaption, setFeaturedImageCaption] = useState("");
  const [imageFocalPoint, setImageFocalPoint] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [selectedAssetSummary, setSelectedAssetSummary] = useState("");
  const [isImageAssetModalOpen, setIsImageAssetModalOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);


  // STATE MANAGEMENT
  const [storyId, setStoryId] = useState('');
  const storyIdRef = useRef<string>('');
  const [title, setTitle] = useState('');
  const titleValueRef = useRef<string>('');
  const [slug, setSlug] = useState('');
  const [initialBlocks, setInitialBlocks] = useState<EditorBlock[]>([]);

  const getCurrentTitle = useCallback((): string => {
    if (titleRef.current && document.activeElement === titleRef.current && typeof titleRef.current.value === 'string') {
      return titleRef.current.value;
    }
    return titleValueRef.current !== '' ? titleValueRef.current : title;
  }, [title]);
  const [taxonomies, setTaxonomies] = useState<TaxonomyType[]>([]);
  const [taxonomySelections, setTaxonomySelections] = useState<Record<string, any>>({});

  const [storyDetails, setStoryDetails] = useState<Partial<StoryDetails>>({});
  const [storyDetailsReady, setStoryDetailsReady] = useState(false);
  const [editors, setEditors] = useState<EditorOption[]>([]);
  const [editorsLoaded, setEditorsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingFromPublishDrawerRef = useRef(false); // Ref for timer callbacks (avoids closure issues)
  const [isEditingFromPublishDrawer, setIsEditingFromPublishDrawer] = useState(false); // State for UI updates
  const assetModalResolveRef = useRef<((value: AssetModalSelection | null) => void) | null>(null);
  const isImageToolActiveRef = useRef(false);

  // Synchronize featuredImageCaption with any changes to storyDetails.mediaCaption 
  // (e.g. from the sidebar drawer's Media Tab or focal editor)
  useEffect(() => {
    if (storyDetails.mediaCaption !== undefined) {
      setFeaturedImageCaption(storyDetails.mediaCaption || "");
    }
  }, [storyDetails.mediaCaption]);

  const handleTaxonomyChange = (field: string, value: any) => {
    markUserInteraction();

    const taxonomy = taxonomies.find((t) => t.name === field || t.name?.toLowerCase() === field.toLowerCase());
    const mode = normalizeSelectionMode(taxonomy?.selectionType ?? taxonomy?.allowMultiple ?? null);

    let nextValue: any;
    if (mode === 'multi') {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((item) => (typeof item === 'string' ? item.trim() : item))
          .filter((item) => {
            if (item === undefined || item === null) return false;
            if (typeof item === 'string') return item !== '';
            return true;
          });
        const unique = Array.from(new Set(cleaned));
        nextValue = unique;
      } else if (value === undefined || value === null || value === '') {
        nextValue = [];
      } else {
        nextValue = [value];
      }
    } else {
      if (Array.isArray(value)) {
        nextValue = value.length > 0 ? value[0] ?? '' : '';
      } else if (value === undefined || value === null) {
        nextValue = '';
      } else {
        nextValue = value;
      }
    }

    setStoryDetails((prev: any) => ({
      ...prev,
      [field]: nextValue,
    }));
    hasUserChangesRef.current = true;
    setAutoSaveStatus('idle');
  };

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

  const generateSlug = (title: string): string => {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // remove special chars
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .trim();

    return cleanTitle ? `/${cleanTitle}` : "";
  };

  useEffect(() => {
    const isAlreadyPublished =
      localStatus?.toLowerCase() === 'published' ||
      initialStoryData?.status?.toLowerCase() === 'published' ||
      !!initialStoryData?.publishUrl ||
      !!(initialStoryData as any)?.publishedUrl ||
      !!(initialStoryData as any)?.published_url ||
      !!initialStoryData?.publishedAt;

    // Skip slug auto-generation ONLY for already-published articles to preserve their original published slug.
    if (isAlreadyPublished) {
      return;
    }

    if (title) {
      setSlug(generateSlug(title));
    } else {
      setSlug('');
    }
  }, [title, initialStoryData]);

  const [localStatus, setLocalStatus] = useState(
    initialStoryData?.status?.toLowerCase() ?? "raise_a_story"
  );

  const handleNoEditAttempt = () => {
    const isSuperUser = user?.role?.toLowerCase() === 'super user';
    if (isSuperUser) return true;

    const basePermission = checkStoryPermission(permissions ?? null, permissionStatus(initialStoryData?.status), 'Edit', user?.role);

    if (!basePermission) {
      toast.error("You are not authorized to edit this story.");
      return;
    }

    const currentStatus = initialStoryData?.status?.toLowerCase();

    // If in_progress, check if user is the original author
    if (currentStatus === 'in_progress') {
      const isCurrentUserTheAuthor = user?.userId === initialStoryData?.authorId ||
        user?.userId === storyDetails.Reporter;
      if (!isCurrentUserTheAuthor) {
        toast.error("Only the original author can edit this story.");
        return;
      }
    }

    // If ideas or in_review, check if user is the assigned editor
    if (currentStatus === 'ideas' || currentStatus === 'in_review') {
      const isAssignedEditor = user?.userId === initialStoryData?.assignedTo;
      if (!isAssignedEditor) {
        toast.error("Only the assigned editor can edit this story.");
        return;
      }
    }
  };

  // ✨ NEW: Check if user has edit permission AND is the original author (for in_progress) OR assigned editor (for ideas/in_review)
  const hasEditPermission = (() => {
    console.log("11");
    const isSuperUser = user?.role?.toLowerCase() === 'super user';
    if (isSuperUser) return true;


    console.log("initial story data status >>>", initialStoryData?.status)
    const basePermission = checkStoryPermission(permissions ?? null, permissionStatus(initialStoryData?.status) || 'raise_a_story', 'Edit', user?.role);

    if (!basePermission) return false;

    const currentStatus = initialStoryData?.status?.toLowerCase();

    // If in_progress, verify user is the original author
    if (currentStatus === 'in_progress') {
      const isCurrentUserTheAuthor = user?.userId === initialStoryData?.authorId ||
        user?.userId === storyDetails.Reporter;
      return isCurrentUserTheAuthor;
    }

    // If ideas or in_review, verify user is the assigned editor
    if (currentStatus === 'ideas' || currentStatus === 'in_review') {
      const isAssignedEditor = user?.userId === initialStoryData?.assignedTo;
      return isAssignedEditor;
    }

    return basePermission;
  })();

  // ✨ NEW: Get specific reason why permission is denied (for toast messages)
  const getPermissionDeniedReason = (): string | null => {
    const isSuperUser = user?.role?.toLowerCase() === 'super user';
    if (isSuperUser) return null;

    const basePermission = checkStoryPermission(permissions ?? null, permissionStatus(initialStoryData?.status) || 'raise_a_story', 'Edit', user?.role);
    const currentStatus = initialStoryData?.status?.toLowerCase();

    if (!basePermission) {
      return `You don't have permission to edit stories in "${initialStoryData?.status || 'raise_a_story'}" status.`;
    }

    if (currentStatus === 'in_progress') {
      const isCurrentUserTheAuthor = user?.userId === initialStoryData?.authorId ||
        user?.userId === storyDetails.Reporter;
      if (!isCurrentUserTheAuthor) {
        return "Only the original author can edit stories in 'In Progress' status.";
      }
    }

    if (currentStatus === 'ideas' || currentStatus === 'in_review') {
      const isAssignedEditor = user?.userId === initialStoryData?.assignedTo;
      if (!isAssignedEditor) {
        return "Only the assigned editor can edit stories in this status.";
      }
    }

    return null;
  };

  function queueAutoSave() {
    if (!hasEditPermission) return;
    if (!initialLoadComplete) return;
    if (!hasUserInteractedRef.current) return;
    // Disable autosave when editing from PublishDrawer for published articles
    if (isEditingFromPublishDrawerRef.current) return;

    hasUserChangesRef.current = true;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Double-check edit mode status when timer fires
      if (isEditingFromPublishDrawerRef.current) {
        console.log('Autosave timer fired but edit mode is active, skipping');
        return;
      }
      setAutoSaveStatus('saving');
      handleAutoSave();
    }, 2000);
  }


  // Custom dropdown arrow template for the grid kit SelectBox
  const accordionArrowTemplate = (_?: unknown, buttonElement?: HTMLElement | null) => {
    if (!buttonElement) {
      return;
    }
    buttonElement.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"
         viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
  };

  const editorInstanceRef = useRef<EditorJS | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const hasUserChangesRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  const markUserInteraction = useCallback(() => {
    hasUserInteractedRef.current = true;
  }, []);

  /**
   * Saves editor data and patches any inline embed captions (YT / Insta / SoundCloud / X)
   * that are typed directly into the .embed-inline-caption DOM node injected by the
   * MutationObserver in StoryEditorCanvas. Since @editorjs/embed doesn't natively track
   * these captions, we read them from the DOM and inject them into the saved block data
   * before returning.
   */
  const saveEditorData = useCallback(async () => {
    if (!editorInstanceRef.current) return { blocks: [] };
    const savedData = await editorInstanceRef.current.save();

    const editorEl = document.getElementById('editorjs-container');
    if (editorEl && savedData?.blocks) {
      const ceBlocks = Array.from(editorEl.querySelectorAll('.ce-block'));
      savedData.blocks = savedData.blocks.map((block: any, idx: number) => {
        if (block.type !== 'embed') return block;
        const ceBlock = ceBlocks[idx];
        if (!ceBlock) return block;
        const captionEl = ceBlock.querySelector('.embed-inline-caption') as HTMLElement | null;
        const captionText = captionEl?.innerHTML?.trim() ?? '';
        return { ...block, data: { ...block.data, caption: captionText } };
      });
    }

    // Ensure author bio block is formatted with <em> tags at the end of the blocks
    const authorBio = storyDetails.author_bio || '';
    if (authorBio && savedData?.blocks && savedData.blocks.length > 0) {
      const lastBlock = savedData.blocks[savedData.blocks.length - 1];
      const hasAboutAuthor = lastBlock &&
        lastBlock.type === 'paragraph' &&
        typeof lastBlock.data?.text === 'string' &&
        lastBlock.data.text.toLowerCase().includes('(about the author');

      if (!hasAboutAuthor) {
        savedData.blocks.push({
          id: `block-${Math.random().toString(36).substr(2, 9)}`,
          type: 'paragraph',
          data: {
            text: `<em>(About the Author : ${authorBio})</em>`
          }
        });
        console.log("RaiseStory: Appended italicized author bio block.");
      } else {
        const currentText = lastBlock.data.text;
        if (!currentText.toLowerCase().includes('<em>') && !currentText.toLowerCase().includes('<i>')) {
          const cleanText = currentText.replace(/<\/?(em|i|b|strong)>/gi, '');
          lastBlock.data.text = `<em>${cleanText}</em>`;
          console.log("RaiseStory: Wrapped existing author bio in <em> tags.");
        }
      }
    }

    return savedData;
  }, [storyDetails.author_bio]);

  // Function to capture current editor state (title + content)
  const captureEditorSnapshot = useCallback(async () => {
    try {
      const editorData = editorInstanceRef.current
        ? await saveEditorData()
        : { blocks: [] };

      return {
        title: getCurrentTitle(),
        editorContent: editorData,
        storyDetails: { ...storyDetails }
      };
    } catch (error) {
      console.error('Error capturing editor snapshot:', error);
      return {
        title: getCurrentTitle(),
        editorContent: { blocks: [] },
        storyDetails: { ...storyDetails }
      };
    }
  }, [getCurrentTitle, storyDetails]);

  // Function to restore editor state from snapshot
  const restoreEditorSnapshot = useCallback(async (snapshot: any) => {
    if (!snapshot) return;

    try {
      // Restore title
      const restoredTitle = snapshot.title || '';
      titleValueRef.current = restoredTitle;
      setTitle(restoredTitle);

      // Restore storyDetails
      if (snapshot.storyDetails) {
        setStoryDetails(snapshot.storyDetails);
      }

      // Restore editor content
      if (snapshot.editorContent && editorInstanceRef.current) {
        await editorInstanceRef.current.render(snapshot.editorContent);
      }
    } catch (error) {
      console.error('Error restoring editor snapshot:', error);
    }
  }, []);

  // Function to clear any pending autosave timer
  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      console.log('Cleared pending autosave timer');
    }
  }, []);

  const openImageAssetModal = useCallback((): Promise<AssetModalSelection | null> => {
    return new Promise<AssetModalSelection | null>((resolve) => {
      assetModalResolveRef.current = resolve;
      setIsImageAssetModalOpen(true);
    });
  }, []);

  const handleAssetModalSelect = useCallback((imageUrl: string | null, asset?: AssetModalAsset | null, focalPoint?: any, caption?: string) => {
    if (assetModalResolveRef.current) {
      if (imageUrl) {
        const selection: AssetModalSelection = {
          url: imageUrl,
          summary: typeof asset?.summary === 'string' ? asset.summary : undefined,
          caption: typeof caption === 'string' && caption.trim() !== '' 
            ? caption 
            : (typeof asset?.caption === 'string' ? asset.caption : undefined),
        };
        assetModalResolveRef.current(selection);
      } else {
        assetModalResolveRef.current(null);
      }
      assetModalResolveRef.current = null;
    }
    setIsImageAssetModalOpen(false);
  }, []);

  const handleAssetModalClose = useCallback(() => {
    if (assetModalResolveRef.current) {
      assetModalResolveRef.current(null);
      assetModalResolveRef.current = null;
    }
    setIsImageAssetModalOpen(false);
    isImageToolActiveRef.current = false;
  }, []);

  const handleImageToolActivation = useCallback(() => {
    if (!editorInstanceRef.current) return;

    if (isImageToolActiveRef.current) return;
    isImageToolActiveRef.current = true;

    const insertionIndex =
      editorInstanceRef.current.blocks.getCurrentBlockIndex();

    const selectionPromise = openImageAssetModal();

    selectionPromise
      .then((selectedAsset) => {
        if (selectedAsset?.url && editorInstanceRef.current) {
          const captionText =
            selectedAsset.caption?.trim() ||
            '';
          editorInstanceRef.current.blocks.insert(
            'image',
            {
              file: { url: selectedAsset.url },
              caption: captionText,
              withBorder: false,
              withBackground: false,
              stretched: false,
            },
            undefined,
            insertionIndex
          );
        }
      })
      .finally(() => {
        isImageToolActiveRef.current = false;
        editorInstanceRef.current?.toolbar?.close?.();
      });
  }, [openImageAssetModal]);



  useEffect(() => {
    if (!isLoading && !isUserLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, isUserLoading, initialLoadComplete]);

  useEffect(() => {
    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const selectors = [
        '.ce-toolbox__button[data-tool="image"]',
        '.ce-popover-item[data-item-name="image"]',
        '.ce-conversion-tool[data-tool="image"]',
      ];

      if (!selectors.some((selector) => target.closest(selector))) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      (event as any).stopImmediatePropagation?.();

      setTimeout(() => handleImageToolActivation(), 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const selectors = [
        '.ce-popover-item[data-item-name="image"]',
        '.ce-conversion-tool[data-tool="image"]',
      ];

      if (!selectors.some((selector) => target.closest(selector))) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();

      setTimeout(() => handleImageToolActivation(), 0);
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleImageToolActivation]);


  useEffect(() => {
    return () => {
      if (assetModalResolveRef.current) {
        assetModalResolveRef.current(null);
        assetModalResolveRef.current = null;
      }
    };
  }, []);

  // CONSTANTS
  const sections = ['Local', 'National', 'International'];
  const categories = [
    'Politics',
    'Business',
    'Culture',
    'Health',
    'Tech',
    'Sports',
  ];

  // AI Configuration
  const aiConfig = useMemo<StoryEditorAIConfig>(() => ({
    apiUrl: `${env.aiApi}/normal_stream`,
    maxTokens: 1024,
    temperature: 0.7,
    topP: 0.9,
  }), []);

  // EFFECT for auto-sizing title textarea
  useEffect(() => {
    if (titleRef.current) {
      const element = titleRef.current;
      // Only resize if the element exists and is mounted
      if (element.isConnected) {
        const currentFocus = document.activeElement === element;
        const selectionStart = element.selectionStart;
        const selectionEnd = element.selectionEnd;

        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;

        // Restore focus and cursor position if element was focused
        if (currentFocus) {
          element.focus();
          element.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  }, [title]); // Keep this dependency but make the function more robust


  // EFFECT for prefilling data and initial setup
  useEffect(() => {
    const prefillData = (story: StoryDetails) => {

      console.log("prefilled story data >>>", story);

      setStoryId(story.storyId ?? story._id ?? '');

      if (!hasUserChangesRef.current && !hasUserInteractedRef.current) {
        setTitle(story.title || '');
        titleValueRef.current = story.title || '';
      }
      const isAlreadyPublished =
        story?.status?.toLowerCase() === 'published' ||
        !!story?.publishUrl ||
        !!(story as any)?.publishedUrl ||
        !!(story as any)?.published_url ||
        !!story?.publishedAt;

      const existingSlug = (story as any).slug || (story as any).storySlug;
      if (isAlreadyPublished && existingSlug) {
        setSlug(existingSlug);
      } else {
        setSlug(generateSlug(story.title || ''));
      }
      const preferredImage = (() => {
        if (typeof story.image === 'string' && story.image.trim() !== '') {
          return story.image;
        }
        const featureImg = story.featureImg;
        if (typeof featureImg === 'string' && featureImg.trim() !== '') {
          return featureImg;
        }
        const imageUrl = story.imageUrl;
        if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          return imageUrl;
        }
        return null;
      })();
      setFeaturedImage(preferredImage);
      setFeaturedImageCaption(story.mediaCaption || "");

      const preferredSummary = (() => {
        if (story.imageDescription && story.imageDescription.trim() !== '') {
          return story.imageDescription;
        }
        if ((story as any).summary && (story as any).summary.trim() !== '') {
          return (story as any).summary;
        }
        return "";
      })();
      setSelectedAssetSummary(preferredSummary);

      // Load focal point from story data
      const savedFocalPoint = (story as any).imageFocalPoint;
      if (savedFocalPoint && typeof savedFocalPoint.x === 'number' && typeof savedFocalPoint.y === 'number') {
        setImageFocalPoint(savedFocalPoint);
      }

      const filled: Record<string, any> = {};

      // Publish date
      // filled["Publish Date"] = story.proposedFilingDate
      //   ? new Date(story.proposedFilingDate).toISOString().split("T")[0]
      //   : "";
      filled["Publish Date"] = story.proposedFilingDate || "";

      // Add byline to filled object
      filled["byline"] = (story as any).byline || [];

      // Dynamic taxonomies
      taxonomies.forEach(t => {
        const selectionMode = normalizeSelectionMode(t.selectionType ?? t.allowMultiple ?? null);
        const rawValue = (story as any)[t.name];

        if (selectionMode === 'multi') {
          const values = ensureArrayValue(rawValue) as unknown[];
          (filled as any)[t.name] = [...values];
        } else {
          const first = firstValue(rawValue);
          (filled as any)[t.name] = (first ?? '') as any;
        }
      });

      const editorTaxonomy = taxonomies.find((t) => t.name?.toLowerCase() === 'editor');
      const editorSelectionMode = normalizeSelectionMode(
        editorTaxonomy?.selectionType ?? editorTaxonomy?.allowMultiple ?? null,
      );

      if (editorSelectionMode === 'multi') {
        const assigned = ensureArrayValue(story.assignedTo) as unknown[];
        filled["Editor"] = [...assigned];
      } else {
        const assigned = firstValue(story.assignedTo);
        filled["Editor"] = (assigned ?? '') as any;
      }

      // Initialize storySummary with existing value or empty string, similar to byline
      filled["storySummary"] = story?.storySummary || "";

      // Initialize keywords with existing value or empty array
      filled["keywords"] = Array.isArray((story as any)?.keywords) ? (story as any).keywords : [];

      filled["author_bio"] = story.author_bio || story.authorBio || "";
      console.log("RaiseStory: author_bio prefilled value:", filled["author_bio"]);

      setStoryDetails(filled);

      const descriptionBlocks = (() => {
        if (!story.description) {
          return [];
        }

        const parseJson = (value: string) => {
          try {
            return JSON.parse(value);
          } catch (error) {
            console.warn('Unable to parse story description:', error);
            return value;
          }
        };

        const unwrapDescription = (value: unknown, depth = 0): unknown => {
          if (typeof value === 'string' && depth < 2) {
            return unwrapDescription(parseJson(value), depth + 1);
          }
          return value;
        };

        const resolvedDescription = unwrapDescription(story.description);

        if (Array.isArray(resolvedDescription)) {
          return resolvedDescription as EditorBlock[];
        }

        if (resolvedDescription && typeof resolvedDescription === 'object') {
          const resolvedBlocks = (resolvedDescription as { blocks?: unknown }).blocks;
          if (typeof resolvedBlocks === 'string') {
            const parsedBlocks = unwrapDescription(resolvedBlocks, 1);
            if (Array.isArray(parsedBlocks)) {
              return parsedBlocks as EditorBlock[];
            }
          }
          if (Array.isArray(resolvedBlocks)) {
            return resolvedBlocks as EditorBlock[];
          }
        }

        return [];
      })();

      const blocksFromStory = story.status !== 'In_progress'
        ? sanitizeEditorBlocks(normalizeEditorBlocks(descriptionBlocks))
        : sanitizeEditorBlocks([]);

      setInitialBlocks(blocksFromStory);

      setIsEditMode(story?.state !== 'Opened');
    };

    if (isUserLoading) return;

    if (!editorsLoaded) return;


    if (initialStoryData && taxonomies.length > 0) {
      prefillData(initialStoryData as StoryDetails);
      setStoryDetailsReady(true);
    } else if (!initialStoryData) {
      // For new stories, generate slug from title if title exists
      if (title) {
        setSlug(generateSlug(title));
      }
    }

    if (!initialStoryData) {
      setInitialBlocks(sanitizeEditorBlocks());
      setStoryDetailsReady(true); // Also set ready for new stories
    }

    setIsLoading(false);

  }, [initialStoryData, user, isUserLoading, taxonomies, editors]);

  const sanitizedEditorBlocks = useMemo(
    () => sanitizeEditorBlocks(initialBlocks),
    [initialBlocks]
  );

  const shouldAutofocusEditor = useMemo(
    () =>
      !title &&
      sanitizedEditorBlocks.length === 1 &&
      isParagraphBlockEmpty(sanitizedEditorBlocks[0]),
    [title, sanitizedEditorBlocks]
  );

  const shouldInitializeEditor = !isLoading && initialLoadComplete;

  useEffect(() => {
    if (!shouldInitializeEditor) {
      return;
    }

    hasUserInteractedRef.current = false;

    const container = document.getElementById('editorjs-container');
    if (!container) {
      return;
    }

    const markInteraction = () => {
      hasUserInteractedRef.current = true;
    };

    container.addEventListener('pointerdown', markInteraction, true);
    container.addEventListener('keydown', markInteraction, true);
    container.addEventListener('paste', markInteraction, true);

    return () => {
      container.removeEventListener('pointerdown', markInteraction, true);
      container.removeEventListener('keydown', markInteraction, true);
      container.removeEventListener('paste', markInteraction, true);
    };
  }, [shouldInitializeEditor]);

  // Handle Cmd+A to select only text (excluding images)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        const editorContainer = document.getElementById('editorjs-container');
        const activeElement = document.activeElement;
        const isTitleFocused = activeElement === titleRef.current;

        // Check if focus is inside the Publish Drawer or any other input/textarea
        const isInDrawer = activeElement?.closest('.kit-popup-overlay');
        const isInInput = activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          (activeElement as HTMLElement)?.isContentEditable;

        if (editorContainer && !isTitleFocused && !isInDrawer && !isInInput) {
          e.preventDefault();
          e.stopPropagation();

          // ⭐ ENABLE centered popover for this selection only
          document.body.classList.add("popover-center");

          // Temporarily disable selection on images
          const imageBlocks = editorContainer.querySelectorAll('.image-tool, .cdx-block[data-tool="image"]');
          imageBlocks.forEach((block) => {
            (block as HTMLElement).style.userSelect = 'none';
          });

          const selection = window.getSelection();
          if (!selection) return;

          const range = document.createRange();
          const walker = document.createTreeWalker(
            editorContainer,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                if (
                  node.parentElement &&
                  (node.parentElement.closest('.image-tool') ||
                    node.parentElement.closest('.cdx-block[data-tool="image"]'))
                ) {
                  return NodeFilter.FILTER_SKIP;
                }
                if (node.nodeValue && node.nodeValue.trim().length > 0) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
              },
            }
          );

          const firstText = walker.nextNode();
          if (!firstText) return;

          let lastText = firstText;
          let next;
          while ((next = walker.nextNode())) {
            lastText = next;
          }

          range.setStart(firstText, 0);
          range.setEnd(lastText, lastText.nodeValue?.length || 0);

          selection.removeAllRanges();
          selection.addRange(range);

          // Restore everything
          const restore = () => {
            imageBlocks.forEach((block) => {
              (block as HTMLElement).style.userSelect = '';
            });
            document.body.classList.remove("popover-center"); // ⭐ revert centering
            document.removeEventListener('mousedown', restore);
            document.removeEventListener('keydown', restore);
          };

          document.addEventListener('mousedown', restore);
          document.addEventListener('keydown', restore);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    const stopClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // If click is inside popover — DO NOT close, DO NOT restore
      if (target.closest('.ce-popover__container')) {
        e.stopPropagation();
        return;
      }
    };

    document.addEventListener('mousedown', stopClose, true);
    return () => {
      document.removeEventListener('mousedown', stopClose, true);
    };
  }, []);

  // ASYNC FUNCTIONS
  const uploadFile = useCallback(async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload files.');
      return null;
    }
    try {
      const presignedUrlRes = await apiFetch(
        `${env.backendApi}/api/uploadAsset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        },
      );
      if (!presignedUrlRes.ok) throw new Error('Failed to get upload URL.');
      const { uploadUrl, fileUrl } = await presignedUrlRes.json();
      const uploadRes = await apiFetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('File upload failed.');
      return fileUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      return null;
    }
  }, [user]);

  const fetchEditors = async () => {
    if (!user) return;
    setEditorsLoaded(false);
    try {
      const res = await apiFetch(
        `${env.backendApi}/api/getAllUsers`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        },
      );
      const data = await res.json();
      const allUsers: EditorOption[] = data?.data || data?.users || [];

      setEditors(allUsers);
    } catch (err) {
      console.error('Failed to fetch editors:', err);
    } finally {
      setEditorsLoaded(true);
    }
  };

  useEffect(() => {
    if (taxonomies.length === 0) {
      setEditorsLoaded(true);
    }
  }, [taxonomies.length]);

  const findTaxonomyName = (prefix: string) => {
    const taxonomy = taxonomies.find(t => t.name.toLowerCase().startsWith(prefix.toLowerCase()));
    return taxonomy ? taxonomy.name : null;
  };

  function createEmptyParagraphBlock(): EditorBlock {
    return {
      type: 'paragraph',
      data: { text: '' },
    };
  }

  function isParagraphBlockEmpty(block?: EditorBlock | null): boolean {
    if (!block || block.type !== 'paragraph') return false;

    const rawText = typeof block.data?.text === 'string' ? block.data.text : '';
    const normalizedText = rawText
      .replace(/<br>/gi, ' ')
      .replace(/&nbsp;/gi, ' ')
      .trim();

    return normalizedText.length === 0;
  }

  function sanitizeEditorBlocks(blocks?: EditorBlock[] | null): EditorBlock[] {
    const sourceBlocks = blocks && blocks.length > 0 ? [...blocks] : [createEmptyParagraphBlock()];

    const sanitized = sourceBlocks.reduce<EditorBlock[]>((acc, block) => {
      if (acc.length === 0) {
        acc.push(block);
        return acc;
      }

      if (!isParagraphBlockEmpty(block)) {
        acc.push(block);
      }

      return acc;
    }, []);

    if (sanitized.length === 0) {
      sanitized.push(createEmptyParagraphBlock());
    }

    return sanitized;
  }

  function normalizeEditorBlocks(blocks?: Array<EditorBlock | Record<string, any>> | null): EditorBlock[] {
    if (!blocks || blocks.length === 0) {
      return [];
    }

    return blocks
      .map((block) => {
        const normalizedType = (block as EditorBlock).type ?? (block as any).tool;
        const rawData = (block as EditorBlock).data ?? (block as any).data;
        const fallbackText = (block as any).text;
        let normalizedData: EditorBlock['data'] | null = rawData ?? null;

        if (typeof normalizedData === 'string') {
          normalizedData = { text: normalizedData };
        }

        if (!normalizedData && typeof fallbackText === 'string') {
          normalizedData = { text: fallbackText };
        }

        if (!normalizedType || !normalizedData) {
          return null;
        }

        return {
          ...(block as EditorBlock),
          type: normalizedType,
          data: normalizedData,
        } as EditorBlock;
      })
      .filter((block): block is EditorBlock => Boolean(block));
  }

  const handleSaveDraft = async () => {
    if (!user?.userId || isSaving || !editorInstanceRef.current) return;

    setIsSaving(true);

    const savedData = await saveEditorData();
    const inlineImages = extractInlineImages(savedData?.blocks);
    const inlineImageUrls = inlineImages.map((img) => img.url);
    const resolvedFeaturedImage =
      typeof featuredImage === "string" && featuredImage.trim() !== ""
        ? featuredImage
        : null; // Only allow user-uploaded images
    const authorTaxonomyName = findTaxonomyName('author');
    const rawAuthorValue = authorTaxonomyName ? storyDetails[authorTaxonomyName] : null;
    const selectedAuthorName = firstValue<string | null>(rawAuthorValue as any);
    const selectedAuthor = typeof selectedAuthorName === 'string'
      ? editors.find(e => e.fullName === selectedAuthorName)
      : undefined;

    const editorTaxonomyName = findTaxonomyName('editor');
    const rawEditorValue = editorTaxonomyName ? storyDetails[editorTaxonomyName] : null;
    const selectedEditorId = firstValue<string | null>(rawEditorValue as any);
    const selectedEditor = typeof selectedEditorId === 'string'
      ? editors.find(e => e.userId === selectedEditorId)
      : undefined;

    // Determine the author name to display
    const authorNameToSave = selectedAuthorName || selectedEditor?.fullName || initialStoryData?.authorName || user.userName;

    // Find the corresponding author ID
    const authorIdToSave = selectedAuthor?.userId || selectedEditorId || (initialStoryData?.authorId ? initialStoryData?.authorId : user.userId);

    const sectionTaxonomyName = findTaxonomyName('section');
    const rawSectionValue = sectionTaxonomyName ? storyDetails[sectionTaxonomyName] : null;
    const sectionValue = firstValue<string | null>(rawSectionValue as any);
    const currentTitle = getCurrentTitle();
    const draftData = {
      title: currentTitle.trim() || `Draft - ${new Date().toLocaleDateString()}`,
      slug: slug,
      description: savedData,
      ...storyDetails,
      section: sectionValue,
      proposedFilingDate: storyDetails["Publish Date"] || null,
      authorId: authorIdToSave,
      assignedTo: selectedEditorId || null,
      authorName: authorNameToSave,
      status: 'raise_a_story',
      state: 'draft',
      imageDescription: selectedAssetSummary,
      ...(resolvedFeaturedImage
        ? { image: resolvedFeaturedImage, featureImg: resolvedFeaturedImage }
        : {}),
      media: inlineImageUrls,
      inlineImages,
      mediaCaptions: inlineImages
        .map((img) => img.caption)
        .filter((caption): caption is string => Boolean(caption)),
    };

    console.log('Saving draft with storyDetails:', storyDetails);

    try {
      let url =
        isEditMode && storyId
          ? `${env.backendApi}/api/updateStory?storyId=${storyId}`
          : `${env.backendApi}/api/articles/postStory`;


      const res = await apiFetch(url, {
        method: isEditMode && storyId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(draftData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save draft');
      }

      if (!isEditMode) {
        const responseData = await res.json();
        const newStoryId = responseData.storyId || responseData.data?.storyId || responseData.data?._id;
        if (newStoryId) {
          setStoryId(newStoryId);
          storyIdRef.current = newStoryId;
          setIsEditMode(true);
        }
      }

      setLastSaved(new Date());
      toast.success('Draft saved!');
      if (handleShowAllStories) {
        handleShowAllStories();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  async function handleAutoSave(overrides?: Record<string, any>): Promise<boolean> {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    //  Enhanced validation
    if (!user?.userId || !editorInstanceRef.current) {
      setAutoSaveStatus('idle');
      hasUserChangesRef.current = false;
      return false;
    }

    //  Check if editor is ready and has save method
    if (!editorInstanceRef.current.save || typeof editorInstanceRef.current.save !== 'function') {
      console.log('Editor not ready for auto-save yet');
      setAutoSaveStatus('idle');
      hasUserChangesRef.current = false;
      return false;
    }

    //  Check if editor is destroyed
    try {
      await editorInstanceRef.current.isReady;
    } catch (error) {
      console.log('Editor not ready:', error);
      setAutoSaveStatus('idle');
      hasUserChangesRef.current = false;
      return false;
    }

    if (!hasEditPermission) {
      // Don't save if no edit permission - show specific reason
      const reason = getPermissionDeniedReason();
      toast.error(reason || "You don't have permission to save changes.");
      console.warn("Skipping auto-save: no edit permission.");
      setAutoSaveStatus('idle');
      hasUserChangesRef.current = false;
      return false;
    }

    // Check if editing from PublishDrawer - don't autosave or update status
    if (isEditingFromPublishDrawerRef.current) {
      return false;
    }

    setAutoSaveStatus('saving');

    try {
      const savedData = await saveEditorData();
      const currentStoryId = storyIdRef.current;

      //  Check if we need to create story first**
      if (!currentStoryId) {
        const currentTitle = getCurrentTitle();
        // Check if any field has content
        const hasTitle = currentTitle && currentTitle.trim() !== '';
        const hasDescription = savedData?.blocks && savedData.blocks.length > 0;
        const hasStoryDetails = Object.values(storyDetails).some(value => {
          if (value === null || value === undefined || value === '') return false;
          return true;
        });

        // If any field is filled, create the story first
        if (hasTitle || hasDescription || hasStoryDetails) {
          const inlineImages = extractInlineImages(savedData?.blocks);
          const inlineImageUrls = inlineImages.map((img) => img.url);
          const resolvedFeaturedImage =
            typeof featuredImage === "string" && featuredImage.trim() !== ""
              ? featuredImage
              : null;

          const selectedAuthor = editors.find(e => e.userId === storyDetails.Reporter)?.fullName || user.userName;
          const selectedEditor = editors.find(e => e.userId === storyDetails.Editor)?.fullName || user.userName;

          const sectionTaxonomyName = findTaxonomyName('section');
          const rawSectionValue = sectionTaxonomyName ? storyDetails[sectionTaxonomyName] : null;
          const sectionValue = firstValue<string | null>(rawSectionValue as any);
          const draftData = {
            title: currentTitle.trim() || `Draft - ${new Date().toLocaleDateString()}`,
            slug: slug,
            description: savedData,
            ...storyDetails,
            section: sectionValue,
            proposedFilingDate: storyDetails['Publish Date'] || null,
            assignedTo: storyDetails.Editor || null,

            ...(storyDetails.Reporter ? { authorId: storyDetails.Reporter } : {}),

            authorName: selectedAuthor || '',
            editorName: selectedEditor || '',
            status: 'raise_a_story',
            state: 'draft',
            imageDescription: selectedAssetSummary,
            ...(resolvedFeaturedImage
              ? { image: resolvedFeaturedImage, featureImg: resolvedFeaturedImage }
              : {}),
            media: inlineImageUrls,
            inlineImages,
            mediaCaptions: inlineImages
              .map((img) => img.caption)
              .filter((caption) => caption && typeof caption === 'string')
              .filter(Boolean),
          };

          const url = `${env.backendApi}/api/articles/postStory`;
          const res = await apiFetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify(draftData),
          });

          if (!res.ok) {
            throw new Error('Auto-save failed: could not create story');
          }

          const responseData = await res.json();
          const newStoryId = responseData.storyId || responseData.data?.id;

          if (newStoryId) {
            setStoryId(newStoryId);
            setIsEditMode(true);
          }

          setAutoSaveStatus('saved');
          setLastSaved(new Date());
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
          hasUserChangesRef.current = false;
          return true;
        } else {
          // No content to save, skip auto-save
          console.log('No content to auto-save yet');
          setAutoSaveStatus('idle');
          hasUserChangesRef.current = false;
          return false;
        }
      }

      // EXISTING: Normal auto-save flow when storyId exists**
      const inlineImages = extractInlineImages(savedData?.blocks);
      const inlineImageUrls = inlineImages.map((img) => img.url);
      const resolvedFeaturedImage =
        typeof featuredImage === "string" && featuredImage.trim() !== ""
          ? featuredImage
          : null;

      const sectionTaxonomyName = findTaxonomyName('section');
      const rawSectionValue = sectionTaxonomyName ? storyDetails[sectionTaxonomyName] : null;
      const sectionValue = firstValue<string | null>(rawSectionValue as any);

      const selectedAuthor = editors.find(e => e.userId === storyDetails.Reporter)?.fullName || user.userName;
      const selectedEditor = editors.find(e => e.userId === storyDetails.Editor)?.fullName || user.userName;
      // Start from this point, we have a valid currentStoryId

      // Merge overrides into storyDetails (e.g., storySummary from PublishDrawer)
      const mergedStoryDetails = {
        ...storyDetails,
        ...(overrides || {}),
      };

      // Only use first block text if storySummary is NOT set
      if (!mergedStoryDetails.storySummary) {
        mergedStoryDetails["storySummary"] = savedData?.blocks[0]?.data?.text || "";
      }

      const currentTitle = getCurrentTitle();
      const autoSaveData = {
        storyId: currentStoryId,
        title: currentTitle.trim() || `Draft - ${new Date().toLocaleDateString()}`,
        slug: slug,
        description: savedData,
        ...mergedStoryDetails,
        section: sectionValue,
        authorName: selectedAuthor,
        editorName: selectedEditor || '',
        proposedFilingDate: mergedStoryDetails["Publish Date"] || null,
        assignedTo: mergedStoryDetails.Editor || null,
        imageDescription: selectedAssetSummary,
        imageFocalPoint: imageFocalPoint,
        ...(resolvedFeaturedImage
          ? { image: resolvedFeaturedImage, featureImg: resolvedFeaturedImage }
          : {}),
        media: inlineImageUrls,
        inlineImages,
        mediaCaptions: inlineImages
          .map((img) => img.caption)
          .filter((caption): caption is string => Boolean(caption)),
      };

      const url = `${env.backendApi}/api/updateStory?storyId=${currentStoryId}`;

      console.log("calling auto save ......");
      console.log("story details data here before calling auto save .....", storyDetails);
      console.log("RaiseStory: autoSaveData.author_bio:", (autoSaveData as any).author_bio);
      const res = await apiFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(autoSaveData),
      });

      if (!res.ok) {
        throw new Error('Auto-save failed');
      }

      setAutoSaveStatus('saved');
      setLastSaved(new Date());

      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);

      hasUserChangesRef.current = false;

      return true;
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('idle');
      return false;
    }
  }

  const handleEditorContentChange = () => {
    if (!hasUserInteractedRef.current) {
      hasUserInteractedRef.current = true;
      return;
    }

    queueAutoSave();
  };


  const handleStoryAction = async (status: StoryStatus, additionalData = {}): Promise<boolean> => {
    const isSuperUser = user?.role?.toLowerCase() === 'super user';
    console.log("isSuperUser >>>", isSuperUser);

    const statusMaps: Record<string, string> = {
      approved:
        initialStoryData?.status === "ideas"
          ? "in_progress"
          : initialStoryData?.status === "in_review"
            ? "ready_to_publish"
            : initialStoryData?.status === "ready_to_publish"
              ? "published"
              : "in_progress",
      on_hold: initialStoryData?.status === "ideas"
        ? "ideas"
        : initialStoryData?.status === "in_review"
          ? "in_review" // ✨ FIXED: Keep status as in_review, only change state to on_hold
          : "in_progress",
      rejected: initialStoryData?.status === "ideas"
        ? "ideas"
        : initialStoryData?.status === "in_review"
          ? "in_review" // ✨ FIXED: Keep status as in_review, only change state to rejected
          : "in_progress",
      in_review: "in_review",
      published: "published",
      // First-class scheduled status; hidden from Kanban, visible in AllStories, opens in PublishDrawer.
      scheduled: "scheduled",
    };

    if (!statusMaps[status]) {
      toast.error(`Invalid action: unknown status "${status}"`);
      return false;
    }


    const stateMaps: Record<string, string> = {
      approved: "approved",
      on_hold: "on_hold",
      rejected: "rejected",
      published: "approved",
      in_review: "decision_awaited",
      scheduled: "approved",
    }

    setIsSubmitting(true);
    try {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      //  Only the assigned editor can approve / reject / hold.
      const isEditor = user?.role?.toLowerCase().includes('editor');
      if (!isSuperUser && isEditor && (status === 'approved' || status === 'on_hold' || status === 'rejected')) {
        const isAssignedEditor = user?.userId === initialStoryData?.assignedTo;

        if (!isAssignedEditor) {
          toast.error("Only the assigned editor can make decisions on this story.");
          return false;
        }
      }

      // ✨ Only the original author can submit the story for review.
      if (!isSuperUser && status === 'in_review' && initialStoryData?.status?.toLowerCase() === 'in_progress') {
        const isReporter = user?.role?.toLowerCase().includes('journalist') ||
          user?.role?.toLowerCase().includes('author') ||
          user?.role?.toLowerCase().includes('reporter');

        const isCurrentUserTheAuthor = user?.userId === initialStoryData?.authorId ||
          user?.userId === storyDetails.Reporter;

        if (!isReporter || !isCurrentUserTheAuthor) {
          toast.error("Only the original author can submit this story.");
          return false;
        }
      }

      // ✨ NEW: Skip auto-save for editors making decisions in in_review
      // (editors don't have edit permission in in_review, so auto-save will fail)

      const isEditorMakingDecision =
        user?.role?.toLowerCase().includes('editor') &&
        initialStoryData?.status?.toLowerCase() === 'in_review';

      if (!isSuperUser && !isEditorMakingDecision) {
        const autoSaveSuccess = await handleAutoSave();
        if (!autoSaveSuccess) {
          toast.error('Unable to save the latest changes. Please try again before updating the story status.');
          return false;
        }
      }
      const currentTitle = getCurrentTitle();
      const payload = {
        title: currentTitle,
        slug: slug,
        status: statusMaps[status] || '',
        state: stateMaps[status] || '',
        ...additionalData
      };

      const res = await apiFetch(`${env.backendApi}/api/updateStory?storyId=${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
          // ...(user?.id && { 'x-user-id': user.id }),
        },
        body: JSON.stringify(payload),
      },
      );

      if (res.ok) {
        // const statusMessage = status === 'In_review' ? 'submitted for review' : status.toLowerCase().replace('_', ' ');
        if (statusMaps[status]) {
          setLocalStatus(statusMaps[status]);
        }

        // Optimistically update the context so the dashboard reflects the change immediately
        const updatedStatus = statusMaps[status] || '';
        const updatedState = stateMaps[status] || '';

        const optimisticStory: Story = {
          ...(initialStoryData ?? {}),
          ...payload,
          status: updatedStatus,
          state: updatedState,
          storyId: storyId as string,
          updatedAt: new Date().toISOString(),
        } as unknown as Story;

        setStories((prev) => {
          const idx = prev.findIndex((s) => s.storyId === storyId);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = { ...next[idx], ...optimisticStory };
            return next;
          }
          return [optimisticStory, ...prev];
        });

        // Update the cache as well
        upsertStoryInCache(optimisticStory);

        if (status !== "published") {
          onBack();
        }

        return true;
      } else {
        const errorData = await res.json();
        toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${errorData.message || 'Unknown error'}`);
        return false;
      }

    } catch (error: unknown) {
      // ✅ Safe error handling
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error updating story:', error);
      toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${message}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !user?.userId || !editorInstanceRef.current) return;

    const errors = validateDetails();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    if (!hasEditPermission) {
      toast.error("You do not have permission to save changes.");
      return;
    }

    // ✨ NEW: Check if logged-in user is the reporter/author (for in_progress status)
    if (initialStoryData?.status?.toLowerCase() === 'in_progress') {
      const isReporter = user?.role?.toLowerCase().includes('journalist') ||
        user?.role?.toLowerCase().includes('author') ||
        user?.role?.toLowerCase().includes('reporter');

      const isCurrentUserTheAuthor = user?.userId === initialStoryData?.authorId ||
        user?.userId === storyDetails.Reporter;

      if (!isReporter || !isCurrentUserTheAuthor) {
        toast.error("Only the original author can submit this story.");
        setIsSubmitting(false);
        return;
      }
    }

    const savedData = await saveEditorData();
    const inlineImages = extractInlineImages(savedData?.blocks);
    const inlineImageUrls = inlineImages.map((img) => img.url);
    const resolvedFeaturedImage =
      typeof featuredImage === "string" && featuredImage.trim() !== ""
        ? featuredImage
        : null;


    // ✅ Convert Publish Date to ISO format
    const publishDate = storyDetails["Publish Date"];
    const proposedFilingDate = publishDate
      ? new Date(publishDate).toISOString()
      : null;

    // ✅ FIX: Remove "Publish Date" from storyDetails before spreading
    const { "Publish Date": _, ...restStoryDetails } = storyDetails;

    const sectionTaxonomyName = findTaxonomyName('section');
    const rawSectionValue = sectionTaxonomyName ? storyDetails[sectionTaxonomyName] : null;
    const sectionValue = firstValue<string | null>(rawSectionValue as any);

    const selectedAuthor = editors.find(e => e.userId === storyDetails.Reporter)?.fullName || user.userName;
    const selectedEditor = editors.find(e => e.userId === storyDetails.Editor)?.fullName || user.userName;

    const currentTitle = getCurrentTitle();
    const finalData = {
      title: currentTitle.trim(),
      description: savedData,
      slug: slug,
      ...restStoryDetails,  // ✅ Spread WITHOUT "Publish Date"
      proposedFilingDate: proposedFilingDate,  // ✅ Add converted date
      assignedTo: storyDetails.Editor || null,
      authorId: storyDetails.Reporter || null,
      authorName: selectedAuthor || '',
      section: sectionValue,
      status: 'ideas',
      state: 'decision_awaited',
      imageDescription: selectedAssetSummary,
      ...(resolvedFeaturedImage
        ? { image: resolvedFeaturedImage, featureImg: resolvedFeaturedImage }
        : {}),
      media: inlineImageUrls,
      inlineImages,
      mediaCaptions: inlineImages
        .map((img) => img.caption)
        .filter((caption): caption is string => Boolean(caption)),
    };

    console.log("RaiseStory: submitting finalData with author_bio:", (finalData as any).author_bio);

    try {
      let url = storyId
        ? `${env.backendApi}/api/updateStory?storyId=${storyId}`
        : `${env.backendApi}/api/articles/postStory`;

      const res = await apiFetch(url, {
        method: storyId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token && { Authorization: `Bearer ${user.token}` }),
        },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit story');
      }

      // Pull the returned record (shape varies: { data }, { story }, or the
      // story itself). We use it to optimistically update the shared Kanban
      // state so the dashboard renders the new/updated card without waiting
      // for the next fetch.
      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch {
        responseData = null;
      }
      const serverStory =
        responseData?.data ?? responseData?.story ?? responseData ?? null;
      const resolvedStoryId: string =
        (typeof serverStory?.storyId === 'string' && serverStory.storyId) ||
        (typeof responseData?.storyId === 'string' && responseData.storyId) ||
        storyId ||
        `temp-${Date.now()}`;

      const optimisticStory: Story = {
        ...(initialStoryData ?? {}),
        ...(serverStory ?? {}),
        ...finalData,
        storyId: resolvedStoryId,
        authorName: selectedAuthor || finalData.authorName || '',
        assignedToName: selectedEditor ? [selectedEditor] : [],
        updatedAt:
          serverStory?.updatedAt ||
          responseData?.updatedAt ||
          new Date().toISOString(),
      } as unknown as Story;

      setStories((prev) => {
        const idx = prev.findIndex((s) => s.storyId === resolvedStoryId);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...next[idx], ...optimisticStory };
          return next;
        }
        return [optimisticStory, ...prev];
      });

      // Keep the dashboard's stories cache aligned with the new write so the
      // next time the Kanban view mounts it does not seed stale data.
      if (storyId) {
        upsertStoryInCache(optimisticStory);
      } else {
        // Brand new story: clear the cache entirely so the next fetch is
        // guaranteed to include it (avoids edge cases around per-key entries).
        invalidateStoriesCache();
      }

      toast.success('Story submitted successfully!');
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(`Submission failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrawerFieldChange = (field: string, value: any) => {
    markUserInteraction();
    setStoryDetails(prev => ({
      ...prev,
      [field]: value,
    }));
    hasUserChangesRef.current = true;
    setAutoSaveStatus('idle');
  };

  const validateDetails = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    // 1️⃣ Validate static system fields
    if (!storyDetails["Publish Date"]) {
      errors["Publish Date"] = "Publish date is required";
    }
    const editorTaxonomy = taxonomies.find((tax) => tax.name?.toLowerCase() === 'editor');
    const editorMode = normalizeSelectionMode(editorTaxonomy?.selectionType ?? editorTaxonomy?.allowMultiple ?? null);
    const editorValue = storyDetails["Editor"];
    const hasEditor = editorMode === 'multi'
      ? Array.isArray(editorValue) && editorValue.length > 0
      : Boolean(editorValue);
    if (!hasEditor) {
      errors["Editor"] = "Editor assignment is required";
    }
    // 2️⃣ Validate dynamic taxonomy fields based on admin configuration
    taxonomies.forEach(tax => {
      if (!tax.isMendatory) {
        return;
      }

      const selectionMode = normalizeSelectionMode(tax.selectionType ?? tax.allowMultiple ?? null);
      const value = storyDetails[tax.name];
      const hasValue = selectionMode === 'multi'
        ? Array.isArray(value) && value.length > 0
        : Boolean(value);

      if (!hasValue) {
        errors[tax.name] = `${tax.name} is required`;
      }
    });
    return errors;
  };

  useEffect(() => {
    async function fetchTaxonomies() {
      const token = user?.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      if (!token) return;

      try {
        const res = await apiFetch(
          `${env.backendApi}/taxonomies`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        console.log("Raw taxonomies data from API:", data);

        const normalized = (data.taxonomies || [])
          .filter((t: any) => !t.name?.startsWith("[C] "))
          .map((taxonomy: any) => {
            // Check both selectionType and permissions.Selection
            const selectionTypeValue = taxonomy.selectionType ?? taxonomy.permissions?.Selection ?? taxonomy.allowMultiple ?? null;

            return {
              ...taxonomy,
              selectionType: normalizeSelectionMode(selectionTypeValue),
            };
          });
        console.log("Normalized taxonomies:", normalized);
        setTaxonomies(normalized);
      } catch (err) {
        console.error("Failed to fetch taxonomies:", err);
      }
    }

    fetchTaxonomies();
  }, [user?.token]);

  useEffect(() => {
    if (!taxonomies || taxonomies.length === 0) return;
    //  Map every story status to its API key
    const statusKeyMap: Record<string, string> = {
      "ideas": "Ideas",
      "raise_a_story": "Raise a story",
      "in_progress": "In progress",
      "in_review": "In review",
      "ready_to_publish": "Ready to publish",
      "published": "Published",
      "scheduled": "Ready to publish",
    };

    //  Normalize current story status
    console.log("initialStoryData >>>", initialStoryData);
    const normalized = (initialStoryData?.status || "raise_a_story").toLowerCase();
    console.log("normalized >>>", normalized);
    const apiKey = statusKeyMap[normalized] || "Raise a story";
    console.log("apiKey >>>", apiKey);
    //  Build drawer visibility map
    const selections: Record<string, any> = {};

    taxonomies.forEach(t => {
      const permissionValue = t.permissions?.[apiKey];
      const allowed = t.isMendatory ? true : permissionValue === true;
      const drawerKey = normalized === "ready_to_publish" || normalized === "scheduled"
        ? "ready_to_publish"
        : normalized === "published"
          ? "published"
          : "raise-a-story";
      selections[t.name] = {
        [drawerKey]: allowed
      };
    });

    console.log("selections >>>", selections);
    setTaxonomySelections(selections);
  }, [taxonomies, initialStoryData?.status]);

  useEffect(() => {

    if (user && taxonomies.length > 0) {
      fetchEditors();
    }
  }, [user, taxonomies]);

  useEffect(() => {
    if (taxonomies.length > 0) {
      const initial: Record<string, any> = {};
      // System fields
      initial["Publish Date"] = "";
      initial["Editor"] = "";
      // Dynamic taxonomy fields
      taxonomies.forEach(t => {
        initial[t.name] = "";
      });
      setStoryDetails(prev => ({ ...initial, ...prev }));
      setStoryDetailsReady(true);
    }
  }, [taxonomies]);

  useEffect(() => {
    storyIdRef.current = storyId;
  }, [storyId]);

  // LOADING STATE
  if (!initialLoadComplete) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // RENDER

  return (
    <>
      <style>{`
        .ce-toolbar__plus {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .codex-editor__redactor {
          padding-bottom: 100px !important;
        }
        .ce-block__content,
        .ce-toolbar__content {
          max-width: 100%;
          padding: 0;
        }
        .ce-placeholder {
          font-family: 'Georgia', serif;
          font-size: 1.3125rem;
          color: #9ca3af;
        }
        .ce-paragraph {
          font-family: 'charis sil', serif;
          font-size: 1.5rem;
          line-height: 1.58;
          color: #374151;
          margin-bottom: 1rem;
        }

        .ce-header {
          font-family: 'charis sil', serif;
          font-weight: 500;
          padding: 0;
          margin-bottom: 0.75em;
          margin-top: 1.5em;
          line-height: 1.3;
        }
        .ce-toolbar__actions {
          right: auto;
          left: 150px;
          padding: 2px 2px;
        }
        .ce-block {
          padding-left: 206px;
          padding-right: 230px;
          margin-bottom: 0;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .ce-block--drop-target {
          border-bottom: 2px solid #000 !important;
          border-top: none !important;
        }
        .ce-inline-tool {
          background: none;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.15s ease;
        }
        .ce-inline-tool:hover {
          background-color: #f3f4f6;
        }
        .ai-inline-menu {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ai-inline-menu::-webkit-scrollbar {
          width: 4px;
        }
        .ai-inline-menu::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .ai-inline-menu::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
          .cdx-block{
          padding: 0px;
          }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        /* DEFAULT — normal behaviour */
        .ce-popover--opened > .ce-popover__container {
          background: #fff !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          position: absolute !important; /* allow EditorJS to position it */
          /* REMOVE forced top/left/transform */
        }

        /* ONLY center popover during CMD+A selection */
        body.popover-center .ce-popover--opened > .ce-popover__container {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          z-index: 999999 !important;
        }
        .hide-actions {
          display: none !important;
        }


        @media (max-width: 768px) {
          .ce-block {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .ce-toolbar__actions {
            left: 1rem;
          }
        }

        @media (max-width: 768px) {
          .ce-block {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .ce-toolbar__actions {
            left: 0.75rem;
          }
          .ce-paragraph {
            font-size: 1.25rem;
          }
          
          /* Mobile scrolling fixes - allow parent to scroll so header scrolls away */
          .flex-1.flex.flex-col {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          main {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          
          #editorjs-container {
            min-height: 50vh !important;
            touch-action: pan-y !important;
          }
        }

        .hide-plus-button {
          display: none !important;
        }

        .inline-image-wrap {
          line-height: 0;
        }
        .inline-image-wrap img {
          border-radius: 2px;
        }
        .ce-paragraph {
          overflow: hidden;
        }
        .ce-paragraph::after {
          content: '';
          display: table;
          clear: both;
        }


      `}</style>

      <div className="bg-white min-h-screen relative flex flex-col lg:flex-row">
        {/* Main content area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${drawerOpened ? 'lg:-translate-x-[180px]' : ''}`}
          style={{
            height: '100vh',
            overflow: 'hidden',
          }}
        >

          {/* ✅ Header */}
          {(initialStoryData === null || initialStoryData?.status === 'raise_a_story') ? (
            <RaiseStoryHeader
              onBack={onBack}
              onSaveDraft={handleSaveDraft}
              lastSaved={lastSaved}
              openDrawer={setDrawerOpened}
              onSubmit={handleSubmit}
              isSaving={isSaving || autoSaveStatus === 'saving'}
              isSubmitting={isSubmitting}
              drawerOpened={drawerOpened}
              autoSaveStatus={isEditingFromPublishDrawer ? 'idle' : autoSaveStatus}
            />
          ) : (
            <StoryHeader
              onBack={onBack}
              onSaveDraft={handleSaveDraft}
              onPublishClick={() => setIsPublishModalOpen(true)}
              handleStoryAction={handleStoryAction}
              isSaving={isSaving}
              lastSaved={lastSaved}
              isAssignedEditor={initialStoryData?.assignedTo === user?.userId}
              isRejectedStory={initialStoryData?.status === 'Rejected'}
              storyStatus={localStatus}
              autoSaveStatus={isEditingFromPublishDrawer ? 'idle' : autoSaveStatus}
              permissions={permissions}
              userRole={user?.role} // ✨ NEW: Pass userRole for permission checks

            />
          )}

          {/* Editor Area */}
          <main
            className="h-full w-full overflow-y-auto no-scrollbar relative transition-all duration-300 ease-in-out"
            style={{
              WebkitOverflowScrolling: typeof window !== 'undefined' && window.innerWidth > 768 ? 'touch' : undefined,
              touchAction: typeof window !== 'undefined' && window.innerWidth > 768 ? 'pan-y' : undefined,
            }}
          >

            <div className="w-full lg:flex lg:justify-center">
              <div className="w-full px-[12px] sm:px-2 md:px-6 lg:px-6 lg:max-w-[1200px] ">

                {/* Title field */}
                <textarea
                  ref={(el) => {
                    titleRef.current = el;
                    if (el) {
                      el.style.height = "auto";        // reset
                      el.style.height = el.scrollHeight + "px"; // auto expand
                    }
                  }}
                  value={title}
                  onChange={(e) => {
                    const target = e.target;
                    const val = target.value;
                    const selectionStart = target.selectionStart;
                    const selectionEnd = target.selectionEnd;
                    markUserInteraction();
                    titleValueRef.current = val;
                    setTitle(val);
                    requestAnimationFrame(() => {
                      if (titleRef.current) {
                        titleRef.current.setSelectionRange(selectionStart, selectionEnd);
                        titleRef.current.style.height = "auto";
                        titleRef.current.style.height = titleRef.current.scrollHeight + "px";
                      }
                    });
                    queueAutoSave();
                  }}
                  onClick={handleNoEditAttempt}
                  placeholder="Title"
                  disabled={Boolean(
                    initialStoryData?.status &&
                    !checkStoryPermission(permissions ?? null, permissionStatus(initialStoryData.status), "Edit", user?.role)
                  )}
                  className={`w-full font-normal text-gray-900 placeholder-gray-400 border-none 
                     outline-none bg-transparent resize-none overflow-hidden
                     disabled:opacity-50 disabled:cursor-not-allowed 
                      text-2xl sm:text-2xl lg:text-[2.75rem] pl-3 lg:pl-[205px] 
                      ${drawerOpened ? 'lg:pr-[220px]' : 'lg:pr-[230px]'}
                       ${initialStoryData?.status === "ready_to_publish" || initialStoryData?.status === "scheduled" ? "my-3" : "mt-2"}`
                  }
                  style={{
                    fontFamily: "charis sil, serif",
                    letterSpacing: "-0.02em",
                    lineHeight: "1.1",
                    // border: "2px solid black"
                  }}
                  rows={1}
                />


                {/* Featured image cropper section - Only show when status is ready_to_publish */}
                {(() => {
                  const effectiveStatus = (localStatus || initialStoryData?.status || '').toLowerCase().replace(/\s+/g, '_');
                  const isReadyToPublishOrPublished = effectiveStatus === 'ready_to_publish' || effectiveStatus === 'published' || effectiveStatus === 'scheduled';
                  if (!isReadyToPublishOrPublished) return null;
                  const currentStoryId = initialStoryData?.storyId || initialStoryData?.id || initialStoryData?._id || storyId;

                  return (
                    <div className="mt-1">
                      <FeaturedImageCropper
                        key={`featured-image-${featuredImage || 'none'}`}
                        storyId={currentStoryId}
                        onCropped={async (imgDataUrl: string, asset?: any, newFocalPoint?: { x: number; y: number }, caption?: string) => {
                          try {
                            markUserInteraction();
                            const newSummary = asset?.summary || asset?.description || "";
                          const currentStoryId = storyId || initialStoryData?.storyId || initialStoryData?._id || "unknown";

                          // First update the local state
                          setFeaturedImage(imgDataUrl);
                          setFeaturedImageCaption(caption || "");
                          setSelectedAssetSummary(newSummary);

                          // Update focal point if provided
                          if (newFocalPoint) {
                            setImageFocalPoint(newFocalPoint);
                          }

                          // Optimistically update storyDetails so UI components (like SocialTab) react immediately
                          setStoryDetails(prev => {
                            const next: Partial<StoryDetails> = {
                              ...prev,
                              image: imgDataUrl,
                              featureImg: imgDataUrl,
                              imageDescription: newSummary,
                              summary: newSummary,
                              ...(newFocalPoint && { imageFocalPoint: newFocalPoint }),
                              ...(caption && { mediaCaption: caption })
                            };
                            return next;
                          });

                          // Helper to compress image specifically for social (WhatsApp < 500KB)
                          const compressForSocial = async (url: string): Promise<File | null> => {
                            return new Promise((resolve) => {
                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.src = url;
                              img.onload = () => {
                                const MAX_SIZE_KB = 500;
                                const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
                                const TARGET_WIDTH = 1200;
                                const TARGET_HEIGHT = 630;

                                // Try different quality levels
                                const attemptCompress = (quality: number) => {
                                  const canvas = document.createElement("canvas");
                                  canvas.width = TARGET_WIDTH;
                                  canvas.height = TARGET_HEIGHT;
                                  const ctx = canvas.getContext("2d");
                                  if (!ctx) {
                                    resolve(null);
                                    return;
                                  }

                                  // "Cover" logic: draw the cropped image to fill 1200x630 exactly
                                  const imgAspectRatio = img.width / img.height;
                                  const targetAspectRatio = TARGET_WIDTH / TARGET_HEIGHT;
                                  let drawWidth, drawHeight, offsetX, offsetY;

                                  if (imgAspectRatio > targetAspectRatio) {
                                    drawHeight = TARGET_HEIGHT;
                                    drawWidth = TARGET_HEIGHT * imgAspectRatio;
                                    offsetX = (TARGET_WIDTH - drawWidth) / 2;
                                    offsetY = 0;
                                  } else {
                                    drawWidth = TARGET_WIDTH;
                                    drawHeight = TARGET_WIDTH / imgAspectRatio;
                                    offsetX = 0;
                                    offsetY = (TARGET_HEIGHT - drawHeight) / 2;
                                  }

                                  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

                                  canvas.toBlob((blob) => {
                                    if (!blob) {
                                      resolve(null);
                                      return;
                                    }

                                    // Check if size is acceptable
                                    if (blob.size <= MAX_SIZE_BYTES || quality <= 0.2) {
                                      const uniqueName = `social_preview_${currentStoryId}_${Date.now()}.jpg`;
                                      const file = new File([blob], uniqueName, { type: "image/jpeg" });
                                      console.log(`✅ Social image standardized: ${(blob.size / 1024).toFixed(2)}KB (quality: ${quality}, size: ${TARGET_WIDTH}x${TARGET_HEIGHT})`);
                                      resolve(file);
                                      return;
                                    }

                                    // If still too large, try lower quality
                                    attemptCompress(quality - 0.1);
                                  }, "image/jpeg", quality);
                                };

                                attemptCompress(0.7);
                              };
                              img.onerror = () => resolve(null);
                            });
                          };

                          let socialImageUrl: string | null = null;
                          try {
                            const compressedSocialFile = await compressForSocial(imgDataUrl);
                            if (compressedSocialFile) {
                              socialImageUrl = await uploadFile(compressedSocialFile);
                            }
                          } catch (e) {
                            console.error("Failed to generate social image:", e);
                          }

                          // Create a complete update object for the backend request and final state
                          const updateData: Record<string, any> = {
                            image: imgDataUrl,
                            featureImg: imgDataUrl,
                            socialImage: socialImageUrl || imgDataUrl, // Fallback to original if compression failed
                            imageDescription: newSummary,
                            summary: newSummary,
                            ...(newFocalPoint && { imageFocalPoint: newFocalPoint }),
                            ...(caption && { mediaCaption: caption })
                          };

                          // Finalize update with socialImage value
                          setStoryDetails(prev => ({
                            ...prev,
                            ...updateData
                          }));

                          // If this is an existing story, update it in the backend
                          const targetStoryId = initialStoryData?.storyId || initialStoryData?.id || initialStoryData?._id || storyId;
                          if (targetStoryId) {
                            try {
                              const response = await apiFetch(
                                `${env.backendApi}/api/updateStory?storyId=${targetStoryId}`,
                                {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                                  },
                                  body: JSON.stringify({
                                    ...updateData,
                                    storyId: targetStoryId,
                                  }),
                                }
                              );

                              if (!response.ok) {
                                throw new Error('Failed to update image');
                              }

                              // Only show success if the API call was successful
                              toast.success('Image updated successfully');
                            } catch (error) {
                              console.error('Error updating image:', error);
                              toast.error(error instanceof Error ? error.message : 'Failed to update image');
                              // Revert the state if there was an error
                              setFeaturedImage(initialStoryData?.image || null);
                              setSelectedAssetSummary((initialStoryData as any)?.imageDescription || '');
                              return; // Exit early on error
                            }
                          }

                          // Don't trigger auto-save here as we've already saved the image
                          // and we don't want to cause any navigation
                          hasUserChangesRef.current = false;
                        } catch (error) {
                          console.error('Error in onCropped:', error);
                          toast.error('An error occurred while processing the image');
                        }
                      }}
                      onFocalPointChange={(newFocalPoint: { x: number; y: number }) => {
                        setImageFocalPoint(newFocalPoint);
                      }}
                      AssetSelectorComponent={AssetModal}
                      imageUrl={featuredImage || initialStoryData?.image}
                      focalPoint={imageFocalPoint}
                      caption={featuredImageCaption}
                    />
                  </div>
                );
              })()}

                <StoryEditorCanvas
                  editorRef={editorInstanceRef}
                  blocks={sanitizedEditorBlocks}
                  shouldAutofocus={shouldAutofocusEditor}
                  hasEditPermission={hasEditPermission}
                  aiConfig={aiConfig}
                  uploadFile={uploadFile}
                  onContentChange={handleEditorContentChange}
                  onNoEditAttempt={handleNoEditAttempt}
                  shouldInitialize={shouldInitializeEditor}
                  drawerOpened={drawerOpened}
                />
              </div>
            </div>
          </main>
          {drawerOpened && (
            <div
              className="lg:hidden fixed inset-0 bg-black/40 z-20"
              onClick={() => setDrawerOpened(false)}
              aria-hidden="true"
            />
          )}
          {!drawerOpened && (
            <button
              type="button"
              onClick={() => setDrawerOpened(true)}
              className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full bg-black text-white p-3 shadow-lg transition hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              aria-label="Open details panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 6 9 12 15 18"></polyline>
              </svg>
            </button>
          )}
        </div>
        {/* Drawer Sidebar */}
        {(drawerOpened || initialStoryData?.status != 'In_progress') && (
          <div
            role="complementary"
            aria-hidden={!drawerOpened}
            className={`fixed top-0 right-0 bottom-0 lg:top-7 bg-white transform transition-transform duration-300 ease-in-out overflow-hidden z-30 ${drawerOpened ? 'lg:border-l lg:border-t lg:border-black shadow-xl' : 'lg:shadow-none'} ${drawerOpened ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} ${drawerOpened ? 'w-full sm:w-[360px]' : 'w-full sm:w-[360px] lg:w-[65px]'} ${drawerOpened ? 'pointer-events-auto' : 'pointer-events-none lg:pointer-events-auto'}`}
          >
            {drawerOpened ? (
              <div className="h-full flex flex-col ">
                <div className="px-3.5 py-2.5 flex justify-between items-center border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur-md flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[12px] font-semibold text-neutral-900 tracking-tight">Details</h2>
                    <span className="text-[9px] font-medium tracking-wide px-1.5 py-0.5 rounded-full bg-neutral-200/70 text-neutral-600">
                      Metadata
                    </span>
                  </div>
                  <button
                    onClick={() => setDrawerOpened(false)}
                    className="w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors focus:outline-none"
                    aria-label="Close details"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  {(() => {
                    const status = localStatus?.toLowerCase();
                    if (status === 'on_hold') {
                      return (
                        <ReviewDrawer
                          asset={storyDetails}
                          onClose={() => setDrawerOpened(false)}
                        />
                      );
                    }
                    if (status === 'ready_to_publish' || status === 'published' || status === 'scheduled') {
                      return (
                        <PublishDrawer
                          accordionArrowTemplate={accordionArrowTemplate}
                          onClose={() => setDrawerOpened(false)}
                          onBack={onBack}
                          onSave={handleAutoSave}
                          storyData={{
                            ...initialStoryData,
                            image: featuredImage || initialStoryData?.image,
                            summary: selectedAssetSummary || "",
                            storySummary: storyDetails.storySummary || "",
                            socialImage: storyDetails.socialImage || initialStoryData?.socialImage
                          }}
                          storyDetails={storyDetails}
                          setStoryDetails={setStoryDetails}
                          permissions={permissions}
                          storyStatus={localStatus}
                          handleStoryAction={handleStoryAction}
                          taxonomies={taxonomies}
                          taxonomySelections={taxonomySelections}
                          users={editors}
                          title={title}
                          onTitleChange={(newTitle: string) => {
                            titleValueRef.current = newTitle;
                            setTitle(newTitle);
                          }}
                          slug={slug}
                          onEnableEditMode={() => {
                            console.log('🔴 ENABLING edit mode - disabling autosave');
                            isEditingFromPublishDrawerRef.current = true;
                            setIsEditingFromPublishDrawer(true);
                          }}
                          onDisableEditMode={() => {
                            console.log('🟢 DISABLING edit mode - enabling autosave');
                            isEditingFromPublishDrawerRef.current = false;
                            setIsEditingFromPublishDrawer(false);
                          }}
                          onCaptureSnapshot={captureEditorSnapshot}
                          onRestoreSnapshot={restoreEditorSnapshot}
                          onClearAutoSaveTimer={clearAutoSaveTimer}
                        />
                      );
                    }

                    return (
                      <RaiseStoryDrawer
                        accordionArrowTemplate={accordionArrowTemplate}
                        taxonomies={taxonomies}
                        taxonomySelections={taxonomySelections}
                        users={editors}
                        storyDetails={storyDetails}
                        onFieldChange={handleTaxonomyChange}
                        onSaveDraft={handleAutoSave}
                        isSaving={isSaving || autoSaveStatus === 'saving'}
                        handleStoryAction={handleStoryAction}
                        isSubmitting={isSubmitting}
                        onClose={() => setDrawerOpened(false)}
                        permissions={permissions ?? undefined}
                        storyStatus={localStatus}
                        onSubmit={handleSubmit}
                        showDecisionDropdown={status === 'in_review'}
                      />
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-full hidden lg:flex justify-center mt-4 ">
                <button
                  onClick={() => setDrawerOpened(true)}
                  className="group w-full h-10 flex items-center  justify-center hover:bg-black transition-colors "
                  aria-label="Open details panel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 group-hover:text-white transition-colors"
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Popup
        visible={isImageAssetModalOpen}
        onHiding={handleAssetModalClose}
        showTitle
        title="Select image"
        width={1200}
        height={800}
        dragEnabled={false}
        wrapperAttr={{ class: 'custom-flat-popup' }}
        shadingColor="rgba(12, 12, 12, 0.77)"
      >
        <AssetModal
          storyId={storyId}
          accordionArrowTemplate={accordionArrowTemplate}
          onImageSelect={handleAssetModalSelect}
          onImageEditSave={handleAssetModalSelect}
          isOpen={isImageAssetModalOpen}
          isFeaturedImage={false}
        />
      </Popup>
    </>
  );
};