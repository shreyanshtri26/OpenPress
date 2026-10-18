import React, { useEffect, useRef, useState } from "react";
import type { Story } from "../storyData";
import { findStoryById } from "../storyData";
//import { registerOverlayPortal } from "@measured/puck";

const recomCard = "/story-images/recomCard.svg";

export interface StorySubCardProps {
  id?: string;
  storyId?: string;
}

const StorySubCard: React.FC<StorySubCardProps> = ({
  id = "story-sub-card",
  storyId,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Refs for inline editing
  const categoryRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      return;
    }

    const found = findStoryById(storyId);
    setStory(found || null);

    if (found?.imageUrl) {
      const img = new Image();
      img.src = found.imageUrl;
      img.onload = () => setImageLoaded(true);
    } else {
      setImageLoaded(true);
    }
  }, [storyId]);

  // Register overlay portals for inline editing
  // useEffect(() => {
  //   if (categoryRef.current) registerOverlayPortal(categoryRef.current);
  //   if (titleRef.current) registerOverlayPortal(titleRef.current);
  // }, [categoryRef, titleRef]);

  if (!story) {
    return (
      <div className="bg-gray-50 p-4 text-center">
        <p className="text-sm text-black">
          No story selected. Please choose one from the dropdown.
        </p>
      </div>
    );
  }



  const displayImage = story.imageUrl || recomCard;
  const displayCategory = story.category || "Category";
  const displayTitle = story.headline || "Story Title";

  // Get publishUrl from story
  const publishUrl = story?.publishUrl;

  // Handle click to navigate
  const handleClick = () => {
    if (publishUrl) {
      window.open(publishUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div id={id}>
      <div className="w-full">
        <div
          className={`overflow-hidden border-b border-gray-400 bg-white transition-all duration-300 ${publishUrl ? "cursor-pointer hover:bg-gray-50" : ""
            }`}
          onClick={handleClick}
          role={publishUrl ? "button" : undefined}
          tabIndex={publishUrl ? 0 : undefined}
          onKeyDown={(e) => {
            if (publishUrl && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <div className="flex items-center">
            {/* Text Section */}
            <div className="min-w-0 w-[calc(100%-4rem)] pb-4">
              <div
                ref={categoryRef}
                suppressContentEditableWarning
                className="font-share text-[9px] sm:text-[10px] text-black line-clamp-2 uppercase pt-4 pb-0.5"
              >
                {displayCategory}
              </div>

              <h2
                ref={titleRef}
                suppressContentEditableWarning
                className="font-libre text-lg sm:text-xl lg:text-[22px] font-extrabold text-black mb-2 leading-tight lg:leading-[1.60rem]"
              >
                {displayTitle}
              </h2>
            </div>

            {/* Image Section (unchanged) */}
            <div className="ml-4 flex-shrink-0 h-16 flex items-center justify-center p-1">
              <img
                key={displayImage}
                src={displayImage}
                alt={story.imageAlt || "Story image"}
                className={`max-h-full max-w-full object-contain transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorySubCard;
