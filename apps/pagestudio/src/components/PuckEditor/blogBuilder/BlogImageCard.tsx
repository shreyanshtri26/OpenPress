import React, { useEffect, useState, useRef } from "react";
import { findStoryById } from "../storyData";
import type { Story } from "../storyData";
import { registerOverlayPortal } from "@measured/puck";

export type BlogImageCardProps = {
  storyId?: string;
  imageUrl?: string;
  title?: string;
};

export const BlogImageCard: React.FC<BlogImageCardProps> = ({
  storyId,
  imageUrl: fallbackImage = "/story-images/default.png",
  title: fallbackTitle = "Lorem ipsum dolor sit amet adipiscing elit",
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      return;
    }
    const found = findStoryById(storyId);
    setStory(found || null);

    const imgSrc = found?.imageUrl || fallbackImage;
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => setImageLoaded(true);
  }, [storyId, fallbackImage]);

  useEffect(() => {
    if (titleRef.current) registerOverlayPortal(titleRef.current);
  }, []);



  const displayImage = story?.imageUrl || fallbackImage;
  const displayTitle = story?.caption || fallbackTitle || "";
  const displayAltText = story?.altText || "";


  return (
    <div className="w-full mb-3">
      <div className="w-full aspect-video bg-gray-200 overflow-hidden mb-3">
        <img
          key={displayImage}
          src={displayImage}
          alt={displayAltText}
          className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          loading="lazy"
        />
      </div>

      <h2
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        className="mt-3 text-[16px] leading-snug font-lato font-medium outline-none"
      >
        {displayTitle}
      </h2>
    </div>
  );
};
