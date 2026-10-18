import { registerOverlayPortal } from "@measured/puck";
import React, { useEffect, useRef } from "react";

export type VideoCardAuthorProps = {
  id?: string;
  author?: string;
  description?: string;
  imageUrl?: string; // Keeping for compatibility/avatar if needed, but using hardcoded avatar in example
  // We might want to use imageUrl for the avatar if provided
};

export const VideoCardAuthor: React.FC<VideoCardAuthorProps> = ({
  author = "Author name",
  description = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat.",
  imageUrl = "/author.png",
}) => {
  const authorRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (authorRef.current) registerOverlayPortal(authorRef.current);
    if (descRef.current) registerOverlayPortal(descRef.current);
  }, []);

  return (
    <div className="w-full pb-6 border-b border-gray-500">
      {/* Top Border Line  */}
      <div className="w-full h-px bg-gray-500 "></div>

      <div className="flex items-start gap-6 mt-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt="Author"
            className="w-[110px] h-[110px] rounded-full object-cover border border-gray-200"
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start w-full">
            {/* Author Name */}
            <h3
              ref={authorRef}
              contentEditable
              suppressContentEditableWarning
              className="text-[18px] font-lato text-[#222] font-normal outline-none "
            >
              {author}
            </h3>
          </div>

          {/* Description */}
          <p
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="text-[14px] font-merriweather text-[#222] leading-relaxed outline-none max-w-[380px]"
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCardAuthor;
