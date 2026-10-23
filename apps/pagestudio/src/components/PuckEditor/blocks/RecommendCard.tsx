import { useEffect, useRef, useState } from "react";
import type { Story } from "../storyData";
import { getStories } from "../storyData";
import { useContext } from "react";
import { AutoStoryIdContext } from "./AutoStoryContext";
import { AutoCardAssignmentsContext } from "./AutoCardAssignmentsContext";
// import { registerOverlayPortal } from "@measured/puck";

export type RecommendCardProps = {
  id?: string;
  storyId?: string;
  title?: string;
  label?: string;
  imageUrl?: string;
  imageAlt?: string;
  className?: string;
};

export function RecommendCard({
  id,
  storyId,
  title: propTitle,
  label: propLabel,
  imageUrl: fallbackImage = "/openpress-share.png",
  imageAlt: fallbackAlt = "Recommended article",
  className = "",
}: RecommendCardProps) {
  const [story, setStory] = useState<Story | null>(null);

  // When inside an Automatic ThumbnailGrid slot, prefer the injected story ID
  const autoStoryId = useContext(AutoStoryIdContext);
  const autoAssignments = useContext(AutoCardAssignmentsContext);
  const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id));
  const assignedStoryId = hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id]?.[0] : undefined;
  const effectiveStoryId = hasCardAssignment ? assignedStoryId : autoStoryId || storyId;

  // Refs for inline editing
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!effectiveStoryId) {
      setStory(null);
      return;
    }

    const stories = getStories();
    const found = stories.find((s) => s.id === effectiveStoryId);
    setStory(found || null);

    if (found?.imageUrl) {
      const img = new Image();
      img.src = found.imageUrl;
    }
  }, [effectiveStoryId]);

  // Register overlay portals for inline editing
  // useEffect(() => {
  //   if (descriptionRef.current) registerOverlayPortal(descriptionRef.current);
  //   if (titleRef.current) registerOverlayPortal(titleRef.current);
  // }, [descriptionRef, titleRef]);



  if (hasCardAssignment && !assignedStoryId) return (
    <div className="min-h-[120px] flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded text-gray-400 text-xs">
      No story available
    </div>
  );

  const isAutomatic = hasCardAssignment || Boolean(autoStoryId);
  const imageUrl = story?.imageUrl || fallbackImage;
  const displayLabel = isAutomatic
    ? story?.category || propLabel || "Category"
    : propLabel || story?.category || "Category";
  const displayTitle = isAutomatic
    ? story?.headline || propTitle || "Recommended Story"
    : propTitle || story?.headline || "Recommended Story";
  const imageAlt = story?.imageAlt || fallbackAlt;

  // Get publishUrl from story
  const publishUrl = story?.publishUrl;

  // Handle click to navigate
  const handleClick = () => {
    if (publishUrl) {
      window.open(publishUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      className={`relative flex flex-col overflow-hidden ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity ${className}`}
      onClick={handleClick}
      role={publishUrl ? "button" : undefined}
      tabIndex={publishUrl ? 0 : undefined}
      onKeyDown={(e) => {
        if (publishUrl && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Image */}
      <div className="aspect-[16/10] w-full overflow-hidden">
        <img
          key={imageUrl}
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col py-2 pl-[32px] pr-[30px] sm:p-2 recommend-card-content">
        <p
          ref={descriptionRef}
          // contentEditable
          suppressContentEditableWarning
          className="font-share text-[9px] sm:text-[10px] text-black line-clamp-2 uppercase pt-2 sm:pt-3 pb-0.5"
        >
          {displayLabel}
        </p>

        <p
          ref={titleRef}
          // contentEditable
          suppressContentEditableWarning
          className="font-libre text-[1rem] sm:text-lg lg:text-[20px] font-extrabold text-black mb-1 sm:mb-2 leading-[1.2] lg:leading-[1.40rem]"
        >
          {displayTitle}
        </p>
      </div>
    </article>
  );
}

export default RecommendCard;
