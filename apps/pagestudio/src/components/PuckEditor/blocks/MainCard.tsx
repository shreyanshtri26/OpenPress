import React, { useEffect, useRef, useState, useContext } from "react";
import type { Story } from "../storyData";
import { findStoryById } from "../storyData";
import { AutoStoryIdContext } from "./AutoStoryContext";
import { AutoCardAssignmentsContext } from "./AutoCardAssignmentsContext";
// import { registerOverlayPortal } from "@measured/puck";

export type MainCardProps = {
  id?: string;
  storyId?: string;
  imageUrl?: string;
  label?: string;
  title?: string;
  description?: string;
};

export const MainCard: React.FC<MainCardProps> = ({
  id,
  storyId,
  imageUrl = "/openpress-share.png",
  label = "NEWS",
  title = "Headline goes here",
  description = "A short summary of the story appears here.",
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // When inside an Automatic Grid slot, prefer the injected story ID
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
      setImageLoaded(true);
      return;
    }

    const found = findStoryById(effectiveStoryId);
    setStory(found || null);
  }, [effectiveStoryId]);

  /**
   * Handle image loading
   */
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setImageLoaded(true);
  }, [imageUrl]);

  // blue box hover
  // useEffect(() => {
  //   if (labelRef.current) registerOverlayPortal(labelRef.current);
  //   if (titleRef.current) registerOverlayPortal(titleRef.current);
  //   if (descriptionRef.current) registerOverlayPortal(descriptionRef.current);
  // }, []);


  if (hasCardAssignment && !assignedStoryId) return (
    <div className="min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded text-gray-400 text-xs">
      No story available
    </div>
  );

  const isAutomatic = hasCardAssignment || Boolean(autoStoryId);
  const displayImage = isAutomatic ? story?.imageUrl || imageUrl : imageUrl || story?.imageUrl;
  const displayLabel = isAutomatic ? story?.category || label : label || story?.category;
  const displayTitle = isAutomatic ? story?.headline || title || "" : title || story?.headline || "";
  const displayDescription = story?.summary || description;

  const html = (displayDescription || "")
    .split(/(<[^>]+>)/g) // keep tags intact
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
      className={`relative w-full bg-white ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity`}
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
      <img
        key={displayImage}
        src={displayImage}
        alt={displayTitle}
        className={`h-[250px] sm:h-[300px] lg:h-[400px] w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        loading="lazy"
      />

      {/* Text overlay */}
      <div className="relative mx-auto -mt-[50px] sm:-mt-[50px] lg:-mt-[50px] w-[90%] md:w-[95%] bg-white p-3 sm:p-4 z-10">
        <div className="p-2 sm:p-4">
          <p
            ref={labelRef}

            className="text-black font-share border-black border-[0.5px] text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-wide px-1 py-1 w-fit"
            suppressContentEditableWarning
          >
            {displayLabel}
          </p>

          <h2
            ref={titleRef}
            className="text-[1.8rem] sm:text-3xl lg:text-[37px] mt-2 font-extrabold font-libre text-black leading-[1.10] sm:leading-[2rem] lg:leading-[2.5rem] mb-2 outline-none focus:ring-0"
            suppressContentEditableWarning
          >
            {displayTitle}
          </h2>

          <p
            ref={descriptionRef}
            className="text-black text-sm sm:text-base lg:text-[17px] font-[Merriweather]  text-left  outline-none focus:ring-0"
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: normalizedDescription }}
          />
        </div>
      </div>
    </div>
  );
};
