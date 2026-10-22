
import React, { useEffect, useRef, useState } from "react";
import type { Story } from "../storyData";
import { findStoryById } from "../storyData";
import { useContext } from "react";
import { AutoStoryIdContext } from "./AutoStoryContext";
import { AutoCardAssignmentsContext } from "./AutoCardAssignmentsContext";
// import { registerOverlayPortal } from "@measured/puck";

export type StoryCardProps = {
  id?: string;
  storyId?: string;
  imageUrl?: string;
  label?: string;
  title?: string;
  description?: string;
};

export const StoryCard: React.FC<StoryCardProps> = ({
  id,
  storyId,
  imageUrl: fallbackImage = "/openpress-share.png",
  label: propLabel,
  title: propTitle,
  description: propDescription,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // When inside an Automatic ThumbnailGrid slot, prefer the injected story ID
  const autoStoryId = useContext(AutoStoryIdContext);
  const autoAssignments = useContext(AutoCardAssignmentsContext);
  const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id));
  const assignedStoryId = hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id]?.[0] : undefined;
  const effectiveStoryId = hasCardAssignment ? assignedStoryId : autoStoryId || storyId;

  // Refs for overlay portal registration
  const labelRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!effectiveStoryId) {
      setStory(null);
      return;
    }

    const found = findStoryById(effectiveStoryId);
    setStory(found || null);

    if (found?.imageUrl) {
      const img = new Image();
      img.src = found.imageUrl;
      img.onload = () => setImageLoaded(true);
    } else {
      setImageLoaded(true);
    }
  }, [effectiveStoryId]);

  // Register overlay portals for editable elements
  // useEffect(() => {
  //   if (labelRef.current) registerOverlayPortal(labelRef.current);
  //   if (titleRef.current) registerOverlayPortal(titleRef.current);
  //   if (descriptionRef.current) registerOverlayPortal(descriptionRef.current);
  // }, [labelRef, titleRef, descriptionRef]);

  if (hasCardAssignment && !assignedStoryId) return (
    <div className="min-h-[120px] flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded text-gray-400 text-xs">
      No story available
    </div>
  );

  const isAutomatic = hasCardAssignment || Boolean(autoStoryId);
  const displayImage = story?.imageUrl || fallbackImage;
  const displayLabel = isAutomatic
    ? story?.category || propLabel || "NEWS"
    : propLabel || story?.category || "NEWS";
  const displayTitle = isAutomatic
    ? story?.headline || propTitle || "Headline goes here"
    : propTitle || story?.headline || "Headline goes here";
  const displayDescription = isAutomatic
    ? story?.summary || propDescription || "A short summary of the story appears here."
    : propDescription || story?.summary || "A short summary of the story appears here.";

  const html = (displayDescription || "")
    .split(/(<[^>]+>)/g)
    .map((part: string) =>
      part.startsWith('<')
        ? part
        : part.replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>')
    )
    .join('');

  const normalizedDescription = html
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ');

  // Get publishUrl from story
  const publishUrl = story?.publishUrl;

  // Handle click to navigate
  const handleClick = () => {
    if (publishUrl) {
      window.open(publishUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`relative w-full h-auto min-h-[400px] sm:min-h-[500px] lg:h-[600px] bg-white overflow-hidden ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity`}
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
      <div className="relative w-full max-w-full md:max-w-full xl:max-w-[750px] mx-auto aspect-video">
        {/* Image area */}
        <img
          key={displayImage}
          src={displayImage}
          alt={displayTitle}
          className={`h-[250px] sm:h-[300px] lg:h-[400px] w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          loading="lazy"
        />

        {/* Overlay text box */}
        <div className="w-full h-auto xl:h-[191px] top-[200px] sm:top-[250px] lg:top-[350px] bg-white absolute p-3 sm:p-4 xl:p-0">
          <div className="py-2 sm:py-4">
            {/* Editable Label */}
            <p
              ref={labelRef}
              // contentEditable
              className="text-black font-share border-black border-[0.5px] text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-wide px-1 py-1 w-fit align-center"
              suppressContentEditableWarning
            >
              {displayLabel}
            </p>

            {/* Editable Title */}
            <h2
              ref={titleRef}
              // contentEditable
              className="text-[1.5rem] sm:text-3xl lg:text-[37px] mt-2 font-extrabold font-libre text-black leading-tight sm:leading-[2rem] lg:leading-[2.5rem] mb-2 outline-none focus:ring-0"
              suppressContentEditableWarning
            >
              {displayTitle}
            </h2>

            {/* Editable Description */}
            <p
              ref={descriptionRef}
              // contentEditable
              className="text-black text-sm sm:text-base lg:text-[17px] font-[Merriweather] line-clamp-3 text-left outline-none focus:ring-0"
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: normalizedDescription }}
            />
          </div>
        </div>
      </div>
    </div>

  );
};
