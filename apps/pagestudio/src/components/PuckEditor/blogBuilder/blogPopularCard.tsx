import React, { useEffect, useState, useRef } from "react";
import { findStoryById } from "../storyData";
import type { Story } from "../storyData";
//import { registerOverlayPortal } from "@measured/puck";

export interface TableItemProps {
  number: number;
  text: string;
  storyId?: string;
}

interface PopularSingleColumnCardProps {
  id?: string;
  items?: TableItemProps[];
}

const SingleColumnItem: React.FC<TableItemProps> = ({
  number,
  text,
  storyId,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (storyId) {
      const found = findStoryById(storyId);
      setStory(found || null);
    } else {
      setStory(null);
    }
  }, [storyId]);

  // useEffect(() => {
  //   if (textRef.current) registerOverlayPortal(textRef.current);
  // }, []);



  const displayText = story?.headline || text;

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
      className={`border border-b border-dotted border-black flex gap-4 items-start min-h-[80px] p-3 ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
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
      <div className="text-[52px] font-bold text-black leading-none font-[Merriweather] flex-shrink-0 ">
        {number}
      </div>
      <div className="flex-1">
        <p
          ref={textRef}
          // contentEditable
          suppressContentEditableWarning
          className="text-[15px] font-light mb-2 leading-tight font-Lato line-clamp-4 outline-none  "
        >
          {displayText}
        </p>
      </div>
    </div>
  );
};

const PopularBlogCard: React.FC<PopularSingleColumnCardProps> = ({
  items = [],
}) => {
  const firstFourItems = items.slice(0, 4);

  return (
    <div className="w-full md:max-w-full lg:max-w-md">
      <div className="">
        {firstFourItems.map((item, index) => (
          <div key={`item-${item.number}`}>
            <SingleColumnItem
              number={item.number}
              text={item.text}
              storyId={item.storyId}
            />
            {index === firstFourItems.length - 1 && (
              <div />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularBlogCard;
