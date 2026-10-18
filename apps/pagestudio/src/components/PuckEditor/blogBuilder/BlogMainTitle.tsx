import React, { useEffect, useState } from "react";
import { findStoryById } from "../storyData";

export type BlogMainTitleProps = {
  id?: string;
  storyId?: string;
  fallbackTitle?: string;
};

export const BlogMainTitle: React.FC<BlogMainTitleProps> = ({
  id,
  storyId,
  fallbackTitle = "Story Title",
}) => {
  const [displayTitle, setDisplayTitle] = useState(fallbackTitle);

  useEffect(() => {
    if (storyId) {
      const story = findStoryById(storyId);
      if (story) {
        setDisplayTitle(story.headline);
      }
    } else {
      setDisplayTitle(fallbackTitle);
    }
  }, [storyId, fallbackTitle]);

  return (
    <div id={id} className="mb-4 lg:mb-6 max-w-full lg:max-w-[815px]">
      <h1 className="block text-inherit
           text-3xl lg:text-[2.6rem] leading-tight lg:leading-[1.05]
           font-black font-libre
           ">
        {displayTitle}
      </h1>
    </div>
  );
};

export default BlogMainTitle;
