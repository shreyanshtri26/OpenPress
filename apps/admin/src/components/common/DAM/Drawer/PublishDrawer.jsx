import React, { useState, useEffect, useRef, useContext } from "react";
import ReactDOM from "react-dom";
import CustomButton from "../../CustomButton";
import StoryTab from "../../../publishTabs/StoryTab"
import SocialTab from "../../../publishTabs/SocialTab"
import MediaTab from "../../../publishTabs/MediaTab"
import PlacementTab from "../../../publishTabs/PlacementTab";
import { Eye, Edit, Trash2, Image as ImageIcon, ChevronDown, FileText, Compass, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { renderPageFromPuckJSON } from "@builder/helpers/blog/renderBlogPage";
import { renderAuthorPageFromPuckJSON } from "@builder/helpers/renderAuthorPageFromPuckJSON";
import { fetchReadyToPublishStories } from "../../../../../lib/api/storyService";
import { publishHomePage } from "../../../../helpers/publishHomePage";
import { republishStoryPages, republishAllCampaignPages } from "../../../../helpers/republishAllCampaignPages";
import { getPublishableData } from "../../../../helpers/publishedSnapshot";
import { extractTextFromDescription as extractStoryText, calculateReadTimeFromText as storyReadTime } from "../../../../helpers/storyUtils";

import { mapBackendCampaignToFrontend } from "@/helpers/campaignMapper";


import { UserContext } from "../../../../context/UserContext";
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';
import { useRouter } from '@/hooks/useRouter';

/**
 * @typedef {import('../../../../StoryEditor/RaiseStory').EditorOption} EditorOption
 */

// ✨ Permission helper function
const checkStoryPermission = (permissions, status, action) => {
  if (!permissions) return false;

  if (!status || typeof status !== 'string') {
    return false;
  }

  const statusMap = {
    'ideas': 'Ideas',
    'in_progress': 'In progress',
    'in_review': 'In review',
    'ready_to_publish': 'Ready to publish',
    'published': 'Published',
  };

  const permissionKey = statusMap[status.toLowerCase().replace(/ /g, '_')];
  if (!permissionKey) return false;

  return permissions?.editorial?.[permissionKey]?.[action] ?? false;
};

const AccessComponent = () => <div className="p-4">Access Content</div>;


const safeString = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractTextFromDescription = (description) => {
  if (!description) return undefined;

  if (typeof description === "string") {
    const trimmed = safeString(description);
    if (!trimmed) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return extractTextFromDescription(parsed);
      }
    } catch (error) {
      // Ignore JSON parse errors and fall back to raw text
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
          const url = data.file?.url || data.url || "";
          const rawCaption = data.caption || "";
          const caption = (rawCaption && !rawCaption.startsWith("Image contains:")) ? rawCaption : "";
          // Tune data is saved by EditorJS as a sibling of `data` (block.tunes), not nested
          // inside `data`. Fall back to the old (incorrect) `data.tunes` path defensively.
          const imageTune = block.tunes?.imageWrapTune || data.tunes?.imageWrapTune || {};
          const wrapAlign = imageTune.wrapAlign || null;

          if (wrapAlign) {
            const floatStyle = wrapAlign === 'left'
              ? 'float:left; margin: 0 1.5rem 1rem 0; max-width: 45%;'
              : 'float:right; margin: 0 0 1rem 1.5rem; max-width: 45%;';
            return `<div style="${floatStyle}"><img src="${url}" alt="${caption}" style="width:100%;display:block;" loading="lazy" />${caption ? `<p style="font-size:14px;color:#716d6d;margin-top:4px;">${caption}</p>` : ''}</div>`;
          }

          const align = imageTune.align || 'center';
          const width = imageTune.width || 100;
          const marginLeft = align === 'left' ? '0' : 'auto';
          const marginRight = align === 'right' ? '0' : 'auto';
          return `<div class="mb-2" style="max-width:${width}%; margin-left:${marginLeft}; margin-right:${marginRight};"><img src="${url}" alt="${caption}" style="display:block;width:100%;height:auto;object-fit:contain;" loading="lazy"/></div>${caption ? `<p class="text-[16px] leading-snug font-lato font-medium text-left m-0 mb-4" style="color:#716d6d;">${caption}</p>` : ''}`;
        }
        else if (block.type === "wrappedImageParagraph") {
          const url = data.imageUrl || '';
          const wrapAlign = data.wrapAlign || 'left';
          const caption = data.caption || '';
          const text = data.text || '';
          const width = data.width || 40;
          const floatStyle = wrapAlign === 'left'
            ? `float:left; margin: 0 1.5rem 1rem 0; max-width:${width}%; width:auto;`
            : `float:right; margin: 0 0 1rem 1.5rem; max-width:${width}%; width:auto;`;
          return `<div style="overflow:hidden;"><div style="${floatStyle}"><img src="${url}" alt="${caption}" style="max-width:100%;width:auto;height:auto;display:block;" loading="lazy"/>${caption ? `<p style="font-size:13px;color:#716d6d;margin-top:4px;">${caption}</p>` : ''}</div><p>${text}</p></div>`;
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
            ? data.items.map(item => `<li style="margin-bottom: 0.25rem;">${typeof item === 'string' ? item : item.content || ""}</li>`).join("")
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

const summariseContent = (text) => {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (trimmed.length <= 200) {
    return trimmed;
  }
  return `${trimmed.slice(0, 197).trim()}...`;
};

const normalizeAuthorName = (value) => {
  if (!value) return "";
  const str = typeof value === "string"
    ? value
    : (value.name || value.authorName || value.fullName || "");

  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const resolveAuthorMatch = (name, allAuthors = []) => {
  const normalizedCandidate = normalizeAuthorName(name);
  if (!normalizedCandidate) return undefined;

  const exactMatches = [];
  const prefixMatches = [];

  allAuthors.forEach((author) => {
    const canonicalName = author?.name || author?.authorName || author?.fullName || "";
    const normalizedCanonical = normalizeAuthorName(canonicalName);

    if (!normalizedCanonical) return;

    if (normalizedCanonical === normalizedCandidate) {
      exactMatches.push(author);
      return;
    }

    const canonicalTokens = normalizedCanonical.split(" ").filter(Boolean);
    const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
    if (!canonicalTokens.length || !candidateTokens.length) return;

    const candidateIsPrefix =
      candidateTokens.length < canonicalTokens.length &&
      candidateTokens.every((token, index) => canonicalTokens[index] === token);

    if (candidateIsPrefix) {
      prefixMatches.push(author);
    }
  });

  if (exactMatches.length > 0) return exactMatches[0];
  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
};


const getBestSocialImage = (storyData, cleanStory) => {
  const socialImage = safeString(storyData?.socialImage) || safeString(cleanStory?.socialImage);
  const mainImage = safeString(storyData?.image) || safeString(storyData?.imageUrl) || safeString(cleanStory?.imageUrl);

  // LOGIC: Always prioritize socialImage if it exists, as it's optimized for size (<500KB).
  // Fallback to mainImage if socialImage is missing.
  let rawImage = socialImage || mainImage || "";

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

// Legacy rows may store EditorJS data as a JSON string or a bare blocks array.
const toEditorJsDescription = (description) => {
  let value = description;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value.trim());
    } catch (error) {
      return description;
    }
  }
  if (Array.isArray(value)) return { blocks: value };
  return value;
};

const buildStoryOverride = (storyData, resolvedSlug, resolvedCategory, resolvedSection) => {
  if (!storyData) return undefined;


  const idCandidates = [
    safeString(storyData.storyId),
    safeString(storyData.id),
    safeString(storyData.slug),
    safeString(storyData.storySlug),
    safeString(resolvedSlug)?.replace(/^\//, ""),
  ];

  const storyId = idCandidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
  if (!storyId) {
    return undefined;
  }

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
    // Raw blocks let renderBlogBodyCard place "More Reading" after paragraph N; fullDescription can't.
    description: toEditorJsDescription(storyData.description),
    category: safeString(resolvedCategory) || safeString(storyData.category) || "General",
    section: safeString(resolvedSection) || safeString(resolvedSection[0]) || safeString(storyData.section) || "General",
    author: safeString(storyData["Author 1"]) || safeString(storyData.authorName) || safeString(storyData.author) || "Unknown Author",
    readTime,
    imageUrl: safeString(storyData.image) || safeString(storyData.imageUrl) || undefined,
    imageAuthor: safeString(storyData.imageAuthor) || safeString(storyData.authorName) || safeString(storyData.author) || "Staff Photo",
    imageAlt: safeString(storyData.imageAlt) || safeString(storyData.title) || "Story image",
    kicker: safeString(storyData.Section),
    storySummary: safeString(storyData.storySummary),
    keywords: storyData?.keywords || [],
    byLine: storyData?.byline || [],
    altText: storyData?.mediaAltText || "",
    caption: storyData?.mediaCaption || "",
    // Include focal point for proper image positioning - defaults to center if not set
    imageFocalPoint: storyData?.imageFocalPoint || { x: 50, y: 50 },
    // Include publish date for display below author name
    publishDate: storyData?.proposedFilingDate || storyData?.publishDate || null,
    socialImage: safeString(storyData.socialImage),
    socialHeadline: safeString(storyData.socialHeadline),
    canonicalUrl: safeString(storyData.canonicalUrl),
    slug: safeString(resolvedSlug) || safeString(storyData.slug) || safeString(storyData.storySlug),
  };
};




/**
 * @param {Record<string, any> & { users?: EditorOption[] }} props
 */
export default function PublishDrawer({
  accordionArrowTemplate = (_, buttonElement) => { },
  onClose = () => { },
  storyData,
  permissions,
  storyStatus,
  handleStoryAction,
  taxonomies,
  taxonomySelections,
  /** @type {EditorOption[]} */ users = [],
  storyDetails,
  setStoryDetails,
  title,
  onTitleChange,
  slug,
  onSave, // <-- Add onSave prop
  onBack, // optional callback to navigate back (parent pattern)
  onEnableEditMode = () => { }, // callback to disable autosave in RaiseStory
  onDisableEditMode = () => { }, // callback to re-enable autosave in RaiseStory
  onCaptureSnapshot = async () => ({}), // callback to capture full editor state
  onRestoreSnapshot = async () => { }, // callback to restore full editor state
  onClearAutoSaveTimer = () => { }, // callback to clear pending autosave timer
}) {


  const handleClose = () => {
    // If editing was in progress, restore snapshot and re-enable autosave
    if (showEditActions && editorSnapshot) {
      // Restore in background (non-blocking)
      onRestoreSnapshot(editorSnapshot).catch(err => {
        console.error('Error restoring snapshot on close:', err);
      });
      setEditorSnapshot(null);
    }
    if (showEditActions) {
      onDisableEditMode();
      setShowEditActions(false);
    }
    onClose();
  };

  const hasEditPermission = checkStoryPermission(permissions ?? null, storyStatus, 'Edit');
  const hasDecidePermission = checkStoryPermission(permissions ?? null, storyStatus, 'Decide');
  const [pageJson, setPageJson] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishMessage, setPublishMessage] = useState("");

  // Initialize publishedUrl from available sources
  // const getInitialPublishedUrl = () => {
  //   const candidateKeys = [
  //     "publishedUrl", "published_url", "PublishedUrl", "Published URL",
  //     "publishedURL", "publishedLink", "published_link", "articleUrl", "url"
  //   ];
  //   for (const key of candidateKeys) {
  //     const fromDetails = safeString(storyDetails?.[key]);
  //     if (fromDetails) return fromDetails;
  //     const fromData = safeString(storyData?.[key]);
  //     if (fromData) return fromData;
  //   }
  //   // Try localStorage
  //   if (storyData?.storyId && typeof window !== "undefined") {
  //     try {
  //       const stored = safeString(localStorage.getItem(`published:url:${storyData.storyId}`));
  //       if (stored) return stored;
  //     } catch (e) { /* ignore */ }
  //   }
  //   return "";
  // };

  const [publishedUrl, setPublishedUrl] = useState(null);
  const [isPublishTimeReached, setIsPublishTimeReached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditActions, setShowEditActions] = useState(false);
  const [editorSnapshot, setEditorSnapshot] = useState(null); // Full editor snapshot for cancel
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const router = useRouter();

  // 📸 Helper to check if story has a valid uploaded/selected featured image
  const hasUploadedFeaturedImage = (storyDataObj, detailsObj, freshDataObj, pageJsonObj) => {
    const candidateUrls = [
      storyDataObj?.image,
      storyDataObj?.imageUrl,
      storyDataObj?.featureImg,
      storyDataObj?.featuredImage,
      detailsObj?.image,
      detailsObj?.imageUrl,
      detailsObj?.featureImg,
      detailsObj?.featuredImage,
      freshDataObj?.image,
      freshDataObj?.imageUrl,
      freshDataObj?.featureImg,
      freshDataObj?.featuredImage,
      pageJsonObj?.data?.heroImage?.url,
    ];

    for (const url of candidateUrls) {
      if (typeof url === "string" && url.trim().length > 0 && !url.toLowerCase().includes("placeholder")) {
        return true;
      }
    }

    // Check puck page content blocks for image
    if (pageJsonObj?.data?.content && Array.isArray(pageJsonObj.data.content)) {
      const hasBlockImg = pageJsonObj.data.content.some((block) => {
        const type = block?.type;
        const imgUrl = block?.props?.imageUrl || block?.props?.url || block?.props?.src || block?.props?.image;
        return (
          (type === "image" || type === "wrappedImageParagraph" || type === "hero") &&
          typeof imgUrl === "string" &&
          imgUrl.trim().length > 0 &&
          !imgUrl.toLowerCase().includes("placeholder")
        );
      });
      if (hasBlockImg) return true;
    }

    return false;
  };

  // Role-based permission checks
  const isSuperUser = user?.role?.toLowerCase() === 'super user';
  const isAuthor = user?.userId && storyData?.authorId && user.userId === storyData.authorId;

  // Permission logic:
  // - Super user: can always save and publish
  // - Other users: can only perform actions if they are the author AND have the permission
  const canPerformActions = isSuperUser || isAuthor;
  const effectiveEditPermission = isSuperUser || (isAuthor && hasEditPermission);
  const effectiveDecidePermission = isSuperUser || (isAuthor && hasDecidePermission);

  // Check if the current time has reached the scheduled publish time
  const checkPublishTime = (publishDate) => {
    if (!publishDate) return true; // If no date is set, allow publishing
    const now = new Date();
    const publishTime = new Date(publishDate);
    return now - publishTime >= -1000;
  };

  // Returns true when the selected publish date/time is strictly in the future
  const isFuturePublishDate = (() => {
    const pd = storyDetails['Publish Date'];
    if (!pd) return false;
    return new Date(pd) > new Date();
  })();

  // Check form validity
  const isFormValid = () => {
    // Check if all required fields are filled
    const hasRequiredFields = true; // Add your required fields check here if needed
    return hasRequiredFields;
  };


  // Effect to check publish time every minute
  useEffect(() => {
    if (!storyDetails['Publish Date']) {
      setIsPublishTimeReached(true);
      return;
    }

    const publishTime = new Date(storyDetails['Publish Date']);
    const now = new Date();

    // If publish time is in the future, set up an interval to check
    if (publishTime > now) {
      setIsPublishTimeReached(false);

      const timeUntilPublish = publishTime - now;
      const timeoutId = setTimeout(() => {
        setIsPublishTimeReached(true);
      }, timeUntilPublish + 1000); // Add 1 second buffer

      return () => clearTimeout(timeoutId);
    } else {
      setIsPublishTimeReached(true);
    }
  }, [storyDetails['Publish Date']]);

  const [activeTab, setActiveTab] = useState("all");
  const [openSections, setOpenSections] = useState({
    story: true,
    placement: true,
    media: true,
    social: true,
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const highlightedIndexRef = useRef(-1);



  const handleInputChange = (field, value, silent = false) => {
    if (field !== 'decision' && !effectiveEditPermission) {
      // Only show toast if not in silent mode (for initialization)
      if (!silent) {
        toast.error(isSuperUser ? "You do not have permission to edit this field." : "You can only edit stories you authored.");
      }
      return;
    }
    setStoryDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getDisplayValue = (field, options) => {
    const value = storyDetails[field];
    if (!value) return null;
    const selected = options?.find((opt) => opt.id === value);
    return selected?.name || null;
  };

  // Check if article is published - use storyData.publishUrl since storyStatus may not update after publish
  const isPublishedArticle = storyStatus === 'published' || !!publishedUrl || !!storyData?.publishUrl;

  // DEBUG: Log all related state on every render

  // Track if autosave is disabled due to published article
  const isAutosaveDisabledRef = useRef(false);

  // Disable autosave when viewing a published article
  useEffect(() => {
    if (isPublishedArticle && !isAutosaveDisabledRef.current) {
      isAutosaveDisabledRef.current = true;
      onClearAutoSaveTimer();
      onEnableEditMode();
    }
  }, [isPublishedArticle, onClearAutoSaveTimer, onEnableEditMode]);

  // Cleanup on unmount - re-enable autosave
  useEffect(() => {
    return () => {
      if (isAutosaveDisabledRef.current) {
        onDisableEditMode();
      }
    };
  }, [onDisableEditMode]);

  const tabs = [
    {
      id: "story",
      label: "Story",
      icon: FileText,
      component: (
        <StoryTab
          storyData={storyData}
          storyDetails={storyDetails}
          onFieldChange={handleInputChange}
          hasEditPermission={effectiveEditPermission}
          title={title}
          onTitleChange={onTitleChange}
          slug={slug}
          setStoryDetails={setStoryDetails}
          isEditingPublishedArticle={isPublishedArticle && showEditActions}
        />
      ),
    },
    {
      id: "placement",
      label: "Placement",
      icon: Compass,
      component: (
        <PlacementTab
          storyData={storyData}
          hasEditPermission={effectiveEditPermission}
          storyDetails={storyDetails}
          onFieldChange={handleInputChange}
          taxonomies={taxonomies}
          taxonomySelections={taxonomySelections}
          users={users}
          setStoryDetails={setStoryDetails}
          isEditingPublishedArticle={isPublishedArticle && showEditActions}
        />
      ),
    },
    {
      id: "social",
      label: "Social",
      icon: Share2,
      component: (
        <SocialTab
          storyData={storyData}
          hasEditPermission={effectiveEditPermission}
          storyDetails={storyDetails}
          onFieldChange={handleInputChange}
          description={storyDetails?.storySummary || storyData?.description?.blocks[0]?.data?.text || ""}
        />
      ),
    },
    {
      id: "media",
      label: "Media",
      icon: ImageIcon,
      component: (
        <MediaTab
          storyData={storyData}
          hasEditPermission={effectiveEditPermission}
          storyDetails={storyDetails}
          onFieldChange={handleInputChange}
        />
      ),
    },
  ];

  const areAllSectionsOpen = Object.values(openSections).every(Boolean);
  const toggleAllSections = () => {
    const nextState = !areAllSectionsOpen;
    setOpenSections({
      story: nextState,
      placement: nextState,
      social: nextState,
      media: nextState,
    });
  };

  const renderTabContent = () => {
    if (activeTab === "all") {
      return (
        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Details & Metadata
            </span>
            <button
              type="button"
              onClick={toggleAllSections}
              className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors select-none"
            >
              {areAllSectionsOpen ? "Collapse All" : "Expand All"}
            </button>
          </div>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isOpen = !!openSections[tab.id];
            return (
              <div
                key={tab.id}
                className="bg-white rounded-xl border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-200 hover:border-neutral-300"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(tab.id)}
                  className="w-full px-3 py-2 bg-neutral-50/70 hover:bg-neutral-100/70 flex items-center justify-between text-left transition-colors select-none apple-pressable"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-neutral-200/60 flex items-center justify-center text-neutral-600 flex-shrink-0">
                      <Icon size={12} strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-800 tracking-tight">
                      {tab.label}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-neutral-400 transition-transform duration-200 ease-out ${
                      isOpen ? "rotate-180 text-neutral-700" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-neutral-100 bg-white">
                    {tab.component}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const currentTab = tabs.find((tab) => tab.id === activeTab);
    return currentTab?.component;
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.activeElement.blur();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);


  // Arrow key handler for smooth highlighting
  useEffect(() => {
    const handleArrowKeys = (e) => {
      const target = e.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        // Get currently open options list
        const optionsList = document.querySelector('.accordion-content-wrapper:not([style*="display: none"]) .options-list');
        if (!optionsList) return;

        const items = optionsList.querySelectorAll('.option-item');
        if (items.length === 0) return;

        // Calculate new index
        let newIndex = highlightedIndexRef.current;

        if (e.key === 'ArrowDown') {
          newIndex = newIndex < items.length - 1 ? newIndex + 1 : 0;
        } else if (e.key === 'ArrowUp') {
          newIndex = newIndex > 0 ? newIndex - 1 : items.length - 1;
        }

        // Update ref (no React state change)
        highlightedIndexRef.current = newIndex;

        // Direct DOM manipulation - update all items' classes
        items.forEach((item, idx) => {
          if (idx === newIndex) {
            item.classList.add('highlighted');
          } else {
            item.classList.remove('highlighted');
          }
        });
      }
    };

    document.addEventListener('keydown', handleArrowKeys);
    return () => document.removeEventListener('keydown', handleArrowKeys);
  }, []);

  const generateSlugFromTitle = (title) => {
    if (!title || typeof title !== 'string') return "";
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    return cleanTitle ? `/${cleanTitle}` : "";
  };



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
      setPageJson(data);
      return data; // Return the data so it can be used immediately
    } catch (error) {
      console.error("Error fetching Blog page:", error);
      return null; // Return null on error
    }
  }



  // Cleanup: re-enable autosave on unmount if edit mode was active
  useEffect(() => {
    return () => {
      // Only disable edit mode on unmount, not on every showEditActions change
      // Check the current value at unmount time
      onDisableEditMode();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = only run on mount/unmount




  const handlePublishAuthorPages = async (byLine, allAuthorsList) => {
    try {
      const authorsToPublish = byLine
        .map(name => resolveAuthorMatch(name, allAuthorsList))
        .filter(author => !!author);

      const uniqueAuthors = Array.from(new Map(authorsToPublish.map(a => [a.userId || a.authorId || a.id, a])).values());

      // The author renderer reads the navbar sections and ad campaigns from the page object.
      const authHeaders = { "Content-Type": "application/json", ...(user?.token && { Authorization: `Bearer ${user.token}` }) };
      let authorNavSections = [];
      let authorNavCampaigns = [];
      try {
        const sectionsRes = await apiFetch(`${env.backendApi}/taxonomy/section/values`, { method: "GET", headers: authHeaders });
        if (sectionsRes.ok) authorNavSections = (await sectionsRes.json()).values || [];
        const campRes = await apiFetch(`${env.backendApi}/getCampaigns`, { method: "GET", headers: authHeaders });
        if (campRes.ok) authorNavCampaigns = ((await campRes.json()).campaigns || []).map(mapBackendCampaignToFrontend);
      } catch (error) {
        console.warn("Failed to fetch sections/campaigns for author pages:", error);
      }

      for (const author of uniqueAuthors) {
        const authorId = author.userId || author.authorId || author.id;
        const authorName = author.name || author.authorName || author.fullName;

        try {

          const resolvedPageType = `Author-${authorId}`;
          const pageRes = await apiFetch(`${env.backendApi}/pagestudio/page?id=${authorId}&pageType=${encodeURIComponent(resolvedPageType)}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
          });

          if (!pageRes.ok) {
            console.warn(`No customization found for author ${authorName}, skipping publish.`);
            continue;
          }

          const authorPageJson = await pageRes.json();
          const latestStoriesById = await fetchReadyToPublishStories(env.backendApi, user?.token);

          // Render only if data exists
          if (!authorPageJson?.data) {
            console.warn(`No Puck data for author ${authorName}, skipping render.`);
            continue;
          }

          const htmlContent = renderAuthorPageFromPuckJSON({
            ...authorPageJson,
            data: getPublishableData(authorPageJson.data),
            storiesById: latestStoriesById,
            sections: authorNavSections,
            campaigns: authorNavCampaigns,
            authorName,
            authorId
          });

          const authorSlug = authorName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

          const saveRes = await apiFetch(`${env.backendApi}/pagestudio/saveAuthorHtml`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            },
            body: JSON.stringify({
              htmlContent,
              authorName,
              authorSlug,
              userId: authorId,
            }),
          });

          if (saveRes.ok) {
          } else {
            console.error(`Failed to save author HTML for ${authorName}`);
          }
        } catch (err) {
          console.error(`Error processing author ${authorName}:`, err);
        }
      }

      // Also update the Authors List page
      // await handlePublishAuthorsList(allAuthorsList);

    } catch (err) {
      console.error("Error in handlePublishAuthorPages:", err);
    }
  };

  // const handlePublishAuthorsList = async (authors) => {
  //   try {
  //     const pageRes = await apiFetch(`${env.backendApi}/pagestudio/page?pageType=AuthorsList`, {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //         ...(user?.token && { Authorization: `Bearer ${user.token}` }),
  //       },
  //     });

  //     if (!pageRes.ok) {
  //       console.warn("No customization found for AuthorsList, skipping.");
  //       return;
  //     }

  //     const pageJson = await pageRes.json();
  //     const latestStoriesById = await fetchReadyToPublishStories(env.backendApi, user?.token);

  //     const htmlContent = renderAuthorsListPageFromPuckJSON({
  //       ...pageJson,
  //       storiesById: latestStoriesById,
  //     }, {
  //       authors: authors
  //     });

  //     const saveRes = await apiFetch(`${env.backendApi}/pagestudio/saveAuthorsHtml`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         ...(user?.token && { Authorization: `Bearer ${user.token}` }),
  //       },
  //       body: JSON.stringify({ htmlContent }),
  //     });

  //     if (saveRes.ok) {
  //     }
  //   } catch (err) {
  //     console.error("Error publishing AuthorsList page:", err);
  //   }
  // };

  // Schedule the story for the selected future date/time without publishing HTML immediately
  const handleSchedule = async () => {
    const publishDate = storyDetails['Publish Date'];
    if (!publishDate) {
      toast.error('Please select a future date and time to schedule the story.');
      return;
    }

    await handlePublish({ scheduleAt: new Date(publishDate).toISOString() });
  };

  // Pass { scheduleAt: <ISO string> } to save HTML to pending-html/ and mark the story scheduled instead of publishing live.
  const handlePublish = async ({ scheduleAt = null } = {}) => {
    if (isPublishing) return;

    const isScheduling = Boolean(scheduleAt);

    // Fetch blog page JSON before publishing
    const freshPageJson = await fetchBlogPageJson();

    if (!freshPageJson) {
      toast.error("No page found.");
      return;
    }

    // ✨ 🛑 FEATURED IMAGE VALIDATION CHECK
    const hasImage = hasUploadedFeaturedImage(storyData, storyDetails, null, freshPageJson);
    if (!hasImage) {
      toast.error("Failed to publish story: Featured image is required");
      return;
    }

    setPublishError("");
    setPublishMessage("");

    const currentStoryId = storyData?.storyId;

    if (!currentStoryId) {
      setPublishError("Unable to determine story ID.");
      return;
    }

    setIsPublishing(true);

    try {
      // first storing all the latest changes
      await handleSave();

      // ✨ FETCH FRESH STORY DATA from backend before publishing
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

      if (!storyResponse.ok) {
        throw new Error("Failed to fetch latest story data");
      }

      const storyResult = await storyResponse.json();
      const freshStoryData = storyResult?.data || storyResult;

      // ✨ DOUBLE CHECK WITH FRESH BACKEND DATA
      const hasImageFresh = hasUploadedFeaturedImage(storyData, storyDetails, freshStoryData, freshPageJson);
      if (!hasImageFresh) {
        toast.error("Failed to publish story: Featured image is required");
        setIsPublishing(false);
        return;
      }


      // Determine if story has already been published
      const isAlreadyPublished =
        freshStoryData?.status?.toLowerCase() === "published" ||
        storyData?.status?.toLowerCase() === "published" ||
        !!freshStoryData?.publishUrl ||
        !!freshStoryData?.publishedUrl ||
        !!freshStoryData?.published_url ||
        !!storyData?.publishUrl ||
        !!storyData?.publishedUrl ||
        !!storyData?.published_url;

      let resolvedSlug = "";
      if (isAlreadyPublished) {
        // For already-published stories, preserve the existing published slug
        const slugFromStory = freshStoryData?.slug || freshStoryData?.storySlug || storyData?.slug || storyData?.storySlug || slug;
        resolvedSlug = slugFromStory || generateSlugFromTitle(freshStoryData?.title || title);
      } else {
        // For first-time publish, make the slug from the headline/title at the moment of publication
        const currentTitle = freshStoryData?.title || title || storyDetails?.title || "";
        const generatedSlug = generateSlugFromTitle(currentTitle);
        resolvedSlug =
          generatedSlug ||
          freshStoryData?.slug ||
          freshStoryData?.storySlug ||
          slug ||
          (freshStoryData?.storyId ? `/${String(freshStoryData.storyId).trim()}` : "");
      }

      const resolvedSection =
        storyDetails?.Section ||
        storyDetails?.section ||
        freshStoryData?.section ||
        freshStoryData?.Section ||
        "General";

      const resolvedCategory =
        storyDetails?.Category ||
        storyDetails?.category ||
        freshStoryData?.category ||
        freshStoryData?.Category ||
        resolvedSection ||
        "General";

      if (!resolvedSlug) {
        const msg = "Unable to determine slug. Please ensure the story has a title or slug before publishing.";
        setPublishError(msg);
        toast.error(msg);
        setIsPublishing(false);
        return;
      }

      if (!resolvedCategory) {
        const msg = "Please select a category or section before publishing.";
        setPublishError(msg);
        toast.error(msg);
        setIsPublishing(false);
        return;
      }


      // ✨ Build clean override using FRESH data
      const cleanStory = buildStoryOverride(
        {
          ...freshStoryData,
          ...storyDetails,
        },
        resolvedSlug,
        resolvedCategory,
        resolvedSection
      );

      localStorage.setItem("currentStory", JSON.stringify(cleanStory));


      // Fetch sections for navbar
      let sectionsList = [];
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
          if (Array.isArray(sectionsData.values)) {
            sectionsList = sectionsData.values;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch sections, using empty list:", error);
      }

      // Fetch latest stories for the bottom grid
      let latestStoriesById = {};
      try {
        latestStoriesById = await fetchReadyToPublishStories(env.backendApi, user?.token);
      } catch (error) {
        console.warn("Failed to fetch latest stories for bottom grid:", error);
      }

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
          authorsList = rawAuthors.map((dbAuthor, index) => ({
            id: dbAuthor.userId || dbAuthor.id || `author-${index}`,
            name: dbAuthor.authorName || dbAuthor.fullName || "",
            authorId: dbAuthor.userId || dbAuthor.id || "",
          }));
        }
      } catch (error) {
        console.warn("Failed to fetch authors, using empty list:", error);
      }

      // Merge existing stories with latest stories
      const combinedStoriesById = {
        ...(freshPageJson?.storiesById || {}),
        ...latestStoriesById
      };

      // Fetch campaigns
      let campaignsList = [];
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
      } catch (error) {
        console.warn("Failed to fetch campaigns for individual publish:", error);
      }

      //  Render FINAL HTML using Puck JSON with sections and latest stories
      const htmlCode = renderPageFromPuckJSON({
        ...freshPageJson,
        data: getPublishableData(freshPageJson?.data),
        storiesById: combinedStoriesById
      }, {
        sections: sectionsList,
        ogDescription: storyDetails?.storySummary || cleanStory?.summary || "",
        ogImage: getBestSocialImage(storyDetails || freshStoryData, cleanStory),
        ogTitle: storyDetails?.socialHeadline || cleanStory?.socialHeadline || cleanStory?.headline || "",
        keywords: cleanStory?.keywords || [],
        authors: authorsList,
        currentStory: cleanStory,
        campaigns: campaignsList
      });


      //  Prepare payload for API
      const payload = {
        htmlContent: htmlCode,
        slug: resolvedSlug || "story",
        section: resolvedSection,
        socialImage: getBestSocialImage(storyDetails || freshStoryData, cleanStory),
        // saveHtml routes to pending-html/<section>/<slug>.html when status is "scheduled".
        ...(isScheduling ? { status: "scheduled" } : {}),
      };


      //  Call the API
      const response = await apiFetch(
        `${env.backendApi}/pagestudio/saveHtml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` })
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to upload HTML");
      }

      //  API returns S3 URL → use it for View Article
      const finalUrl = safeString(result?.data?.url);

      const resolvedSocialImage = getBestSocialImage(storyDetails || freshStoryData, cleanStory);

      if (isScheduling) {
        const scheduledSucceeded = await handleStoryAction("scheduled", {
          proposedFilingDate: scheduleAt,
          socialImage: resolvedSocialImage,
          socialHeadline: storyDetails?.socialHeadline || storyData?.socialHeadline,
          canonicalUrl: storyDetails?.canonicalUrl || storyData?.canonicalUrl || "",
          // Cron uses this exact S3 key to promote pending → live even if slug/section change afterward.
          pendingHtmlKey: safeString(result?.data?.key),
        });

        if (!scheduledSucceeded) {
          return;
        }

        const scheduledFor = new Date(scheduleAt).toLocaleString();
        toast.success(`Story scheduled for ${scheduledFor}`);
        setPublishMessage(`Story scheduled for ${scheduledFor}`);
        return;
      }

      const statusUpdateSucceeded = await handleStoryAction("published", {
        publishUrl: finalUrl,
        socialImage: resolvedSocialImage,
        socialHeadline: storyDetails?.socialHeadline || storyData?.socialHeadline,
        canonicalUrl: storyDetails?.canonicalUrl || storyData?.canonicalUrl || ""
      });

      if (!statusUpdateSucceeded) {
        return;
      }

      if (finalUrl) {
        setPublishedUrl(finalUrl);

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(`published:url:${currentStoryId}`, finalUrl);
          }
        } catch (error) {
          console.warn("Unable to persist published URL", error);
        }

        if (typeof setStoryDetails === "function") {
          setStoryDetails((prev) => {
            const nextDetails = { ...(prev || {}) };
            nextDetails.publishedUrl = finalUrl;
            nextDetails.published_url = finalUrl;
            nextDetails["Published Url"] = finalUrl;
            nextDetails["Published URL"] = finalUrl;
            return nextDetails;
          });
        }
      }

      toast.success("Article published!");

      const byLine = freshStoryData?.byline || freshStoryData?.byLine || [];

      // Preferred path: the backend job rebuilds the pages that list this story.
      const queued = await republishStoryPages(user?.token, {
        storyId: currentStoryId,
        slug: resolvedSlug,
        section: resolvedSection,
        category: resolvedCategory,
      });

         if (queued) {
        // The backend story job does not rebuild the sitemaps.
        for (const route of ["saveSiteMap", "saveNewsSiteMap"]) {
          try {
            await apiFetch(`${env.backendApi}/pagestudio/${route}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(user?.token && { Authorization: `Bearer ${user.token}` })
              },
            });
          } catch (sitemapErr) {
            console.error("Error saving sitemap:", sitemapErr);
          }
        }
      } else {
        console.warn("Backend republish unavailable; falling back to in-browser sync.");

        // Trigger Author Page Publishing for all byline authors
        if (byLine.length > 0 && authorsList.length > 0) {
          handlePublishAuthorPages(byLine, authorsList); // Run in background
        }

        // Republish Home plus this story's section page and its authors' story pages
        try {
          await publishHomePage(user?.token, {
            section: resolvedSection,
            authors: [freshStoryData?.authorId, freshStoryData?.authorName].concat(byLine),
          });
        } catch (homePageErr) {
          console.error("Failed to republish home page after story publish:", homePageErr);
        }
      }

      setPublishMessage("Article published successfully!");


    } catch (error) {
      console.error("Publish error:", error);
      setPublishError(error.message || "An unexpected error occurred.");
      toast.error("Error while publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Temporarily disable edit mode to allow save to go through
      onDisableEditMode();

      await onSave({
        ...storyDetails,
        storySummary: storyDetails?.storySummary?.trim() || "",
      });

      toast.success("Changes have been saved successfully!");
      // Clear snapshot after successful save (edit mode already disabled above)
      setEditorSnapshot(null);
    } catch (error) {
      toast.error("Failed to save story.");
      // Re-enable edit mode if save failed
      if (showEditActions) {
        onEnableEditMode();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Deactivate published story using backend DELETE API
  const deactivatingRef = useRef(false);
  const deletePublishedStory = async () => {
    if (!storyData?.storyId) {
      toast.error('Unable to determine story id to deactivate article');
      return;
    }
    // A second click while the first is still running would only repeat the request.
    if (deactivatingRef.current) return;
    deactivatingRef.current = true;

    const DEACTIVATE_TOAST_ID = 'deactivate-story';
    toast.loading('Deactivating article…', { id: DEACTIVATE_TOAST_ID });
    let settled = false;

    try {
      const storyId = encodeURIComponent(storyData.storyId);
      const headers = {
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
      };

      // The backend rebuilds the site inside this request, so it can stay open for minutes.
      const request = apiFetch(`${env.backendApi}/api/deleteStory?storyId=${storyId}`, { method: 'DELETE', headers })
        .then(async (response) => {
          let body = {};
          try { body = await response.json(); } catch (e) { /* ignore parse errors */ }
          return { ok: response.ok, data: body };
        });

      // The story itself is inactive within seconds; stop waiting as soon as that is true.
      const becameInactive = new Promise((resolve) => {
        const check = async () => {
          if (settled) return;
          try {
            const statusRes = await apiFetch(`${env.backendApi}/api/storyById?storyId=${storyId}`, { method: 'GET', headers });
            if (statusRes.ok) {
              const body = await statusRes.json();
              const status = String((body?.data || body)?.status || '').toLowerCase();
              if (status === 'inactive') return resolve({ ok: true, data: {} });
            }
          } catch (e) { /* keep waiting for the request itself */ }
          if (!settled) setTimeout(check, 2000);
        };
        setTimeout(check, 2000);
      });

      const { ok, data } = await Promise.race([request, becameInactive]);
      settled = true;
      request.catch(() => {});

      if (ok) {
        toast.success(`${data?.message || 'Story deactivated successfully'}. The website will update in a few minutes.`, { id: DEACTIVATE_TOAST_ID });

        // The backend rebuilds Home, the section and story pages; this covers author pages, the sitemaps and the rest.
        void (async () => {
          for (const route of ["saveSiteMap", "saveNewsSiteMap"]) {
            try {
              await apiFetch(`${env.backendApi}/pagestudio/${route}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(user?.token && { Authorization: `Bearer ${user.token}` })
                },
              });
            } catch (sitemapErr) {
              console.error("Error saving sitemap after deactivation:", sitemapErr);
            }
          }
          try {
            await republishAllCampaignPages(user?.token, "Site refresh");
          } catch (refreshErr) {
            console.error("Failed to refresh the site after deactivation:", refreshErr);
          }
        })();

        // Prefer calling parent's onBack if provided (matches other components' pattern).
        try {
          if (typeof onBack === 'function') {
            // Close drawer first, then call parent's onBack
            try { onClose(); } catch (er) { /* ignore */ }
            onBack();
          } else {
            // Fallback: router navigation
            void router.push('/dashboard');
          }
        } catch (e) {
          // Final fallback: just close the drawer
          onClose();
        }
      } else {
        toast.error(data?.message || 'Failed to deactivate article', { id: DEACTIVATE_TOAST_ID });
      }
    } catch (err) {
      console.error('Error deleting story:', err);
      toast.error('Failed to deactivate article', { id: DEACTIVATE_TOAST_ID });
    } finally {
      settled = true;
      deactivatingRef.current = false;
    }
  };

  //  Build formData dynamically from taxonomies + storyData
  useEffect(() => {
    if (!taxonomies || !storyData) return;

    const initial = {};

    // Always include Publish Date
    initial["Publish Date"] = storyData?.proposedFilingDate
      ? new Date(storyData.proposedFilingDate).toISOString()
      : "";

    // Helper to get first description block text
    const getFirstDescriptionBlock = () => {
      const blocks = storyData?.description?.blocks;
      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return "";
      const firstBlock = blocks[0];
      if (firstBlock?.type === 'paragraph' || firstBlock?.type === 'header') {
        const text = firstBlock.data?.text || "";
        return text.replace(/<[^>]*>/g, '');
      }
      return "";
    };

    // Initialize storySummary with saved value or first description block as default
    initial["storySummary"] = storyData?.storySummary || getFirstDescriptionBlock();
    // Only initialize keywords from storyData if not already set in storyDetails (to preserve user-added keywords)
    if (!storyDetails?.keywords || storyDetails.keywords.length === 0) {
      initial["keywords"] = Array.isArray(storyData?.keywords) ? storyData.keywords : [];
    }

    // Initialize mediaAltText with saved value (only if not already set by user)
    if (storyDetails?.mediaAltText === undefined || storyDetails?.mediaAltText === null) {
      initial["mediaAltText"] = storyData?.mediaAltText || "";
    }

    // Initialize mediaCaption with saved value (only if not already set by user)
    if (storyDetails?.mediaCaption === undefined || storyDetails?.mediaCaption === null) {
      initial["mediaCaption"] = storyData?.mediaCaption || "";
    }

    // Initialize canonicalUrl with saved value (only if not already set by user)
    if (storyDetails?.canonicalUrl === undefined || storyDetails?.canonicalUrl === null) {
      initial["canonicalUrl"] = storyData?.canonicalUrl || "";
    }

    // Dynamic taxonomy fields
    taxonomies.forEach((t) => {
      initial[t.name] = storyData[t.name] || "";
    });

    initial["Editor"] = storyData.assignedTo || "";

    setStoryDetails(prev => ({ ...prev, ...initial }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxonomies]);

  useEffect(() => {
    if (publishedUrl) return;



    let resolved = storyData?.publishUrl || null;



    if (resolved) {
      setPublishedUrl(resolved);
    }
  }, [publishedUrl, storyData, storyDetails, storyStatus]);


  return (
    <div className="h-full flex flex-col bg-white">
      {/* Apple macOS / iOS Segmented Control */}
      <div className="px-3 py-2 bg-neutral-50/80 border-b border-neutral-200/70 flex-shrink-0">
        <div className="bg-[#EBECEF] p-0.5 rounded-lg flex items-center overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Single View" },
            ...tabs.map((t) => ({ id: t.id, label: t.label })),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max px-2.5 py-1 text-[11px] font-medium rounded-[6px] transition-all duration-150 select-none ${
                activeTab === tab.id
                  ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.12)] font-semibold"
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab / Single View Content */}
      <div className="flex-1 overflow-y-auto drawer-apple-compact">
        {renderTabContent()}
      </div>

      {/* Apple Sticky Action Footer */}
      <div className="border-t border-neutral-200/80 bg-neutral-50/90 backdrop-blur-md p-3 flex-shrink-0">
        {storyStatus === 'published' || publishedUrl ? (
          <div className="w-full flex flex-col gap-2">
            {!showEditActions ? (
              <div className="flex items-center gap-2">
                {publishedUrl && (
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] rounded-lg shadow-xs transition-all"
                  >
                    <Eye size={13} />
                    View Article
                  </a>
                )}
                <CustomButton
                  variant="white"
                  onClick={async () => {
                    onClearAutoSaveTimer();
                    const snapshot = await onCaptureSnapshot();
                    setEditorSnapshot(snapshot);
                    onEnableEditMode();
                    setShowEditActions(true);
                  }}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border-neutral-200/80 hover:bg-neutral-100"
                >
                  <Edit size={13} />
                  Edit Article
                </CustomButton>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <CustomButton
                  variant="black"
                  className="w-full py-2.5 text-xs font-semibold rounded-lg shadow-xs active:scale-[0.98]"
                  disabled={!isFormValid() || isPublishing || !effectiveDecidePermission}
                  onClick={async () => {
                    if (isFuturePublishDate) {
                      await handleSchedule();
                    } else {
                      await handlePublish();
                    }
                    setShowEditActions(false);
                    onDisableEditMode();
                    setEditorSnapshot(null);
                  }}
                  title={
                    !effectiveDecidePermission
                      ? (isSuperUser ? "You do not have permission to publish" : "You can only publish stories you authored")
                      : ""
                  }
                >
                  {isPublishing
                    ? (isFuturePublishDate ? "Scheduling…" : "Publishing…")
                    : (isFuturePublishDate ? "Save Changes and Schedule" : "Save Changes and Publish")}
                </CustomButton>
                <CustomButton
                  variant="white"
                  onClick={() => {
                    setShowEditActions(false);
                    onDisableEditMode();
                    if (editorSnapshot) {
                      onRestoreSnapshot(editorSnapshot).catch(err => {
                        console.error('Error restoring snapshot:', err);
                      });
                      setEditorSnapshot(null);
                    }
                  }}
                  className="w-full py-2 text-xs font-medium rounded-lg border-neutral-200/80"
                >
                  Cancel
                </CustomButton>
              </div>
            )}

            {!showEditActions && (
              <CustomButton
                variant="white"
                onClick={async () => {
                  const ok = window.confirm('Are you sure you want to deactivate this article? This action cannot be undone.');
                  if (!ok) return;
                  await deletePublishedStory();
                }}
                className="w-full py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50 border border-red-100"
              >
                <Trash2 size={13} />
                Deactivate Article
              </CustomButton>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CustomButton
                variant="black"
                className="flex-1 py-2.5 text-xs font-semibold rounded-lg shadow-xs active:scale-[0.98] flex items-center justify-center gap-1.5"
                disabled={!isFormValid() || isPublishing || !effectiveDecidePermission}
                onClick={isFuturePublishDate ? handleSchedule : handlePublish}
                title={
                  !effectiveDecidePermission
                    ? (isSuperUser ? "You do not have permission to publish" : "You can only publish stories you authored")
                    : ""
                }
              >
                {isPublishing
                  ? (isFuturePublishDate ? "Scheduling…" : "Publishing…")
                  : (isFuturePublishDate ? "Schedule Article" : "Publish Article")}
              </CustomButton>
              <CustomButton
                variant="white"
                className="py-2.5 px-3.5 text-xs font-medium rounded-lg border-neutral-200/80 hover:bg-neutral-100"
                disabled={isSaving || !effectiveEditPermission}
                onClick={handleSave}
                title={!effectiveEditPermission ? (isSuperUser ? "You do not have permission to save" : "You can only save stories you authored") : ""}
              >
                {isSaving ? "Saving…" : "Save"}
              </CustomButton>
            </div>
          </div>
        )}

        {publishError && (
          <p className="text-red-600 text-xs text-center mt-2 font-medium">{publishError}</p>
        )}
        {publishMessage && !publishError && (
          <p className="text-neutral-800 text-xs text-center mt-2 font-medium">
            {publishMessage}
          </p>
        )}
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        .option-item {
          transition: background-color 0.1s ease;
        }

        .option-item.highlighted {
          background-color: #e5e7eb !important;
          font-weight: 500 !important;
        }

        /* Apple Compact Inspector Styles */
        .drawer-apple-compact .p-6 {
          padding: 0.875rem !important;
        }
        .drawer-apple-compact .px-6 {
          padding-left: 0.875rem !important;
          padding-right: 0.875rem !important;
        }
        .drawer-apple-compact .py-4,
        .drawer-apple-compact .py-6 {
          padding-top: 0.75rem !important;
          padding-bottom: 0.75rem !important;
        }
        .drawer-apple-compact .space-y-6 > * + * {
          margin-top: 0.75rem !important;
        }
        .drawer-apple-compact .gap-6 {
          gap: 0.75rem !important;
        }
        .drawer-apple-compact label {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #4b5563 !important;
          margin-bottom: 4px !important;
          letter-spacing: -0.01em !important;
        }
        .drawer-apple-compact .custom-textarea {
          border-radius: 8px !important;
          border: 1px solid #e5e7eb !important;
        }
      `}</style>
    </div>
  );
}