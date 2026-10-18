import { registerOverlayPortal } from "@measured/puck";
import React, { useEffect, useRef } from "react";
import { IoIosPlayCircle } from "react-icons/io";

export type VideoCardHorizontalProps = {
  id?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  author?: string;
  views?: number;
  likes?: number;
  shares?: number;
};

export const VideoCardHorizontal: React.FC<VideoCardHorizontalProps> = ({
  imageUrl = "/story-images/Media.png",
  title = "Lorem ipsum dolor sit amet adipiscing elit",
  description = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.",
  author = "Author Name",
  views = 8991,
  //likes = 8991,
  shares = 100,
}) => {
  // Refs for inline Puck editing
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const authorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (titleRef.current) registerOverlayPortal(titleRef.current);
    if (descRef.current) registerOverlayPortal(descRef.current);
    if (authorRef.current) registerOverlayPortal(authorRef.current);
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* Horizontal Row */}
      <div className="w-full flex flex-row items-start">
        {/* LEFT COLUMN — Author + All Content */}
        <div className="flex-1 flex flex-col">

          {/* Author Section */}
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/author.png"
              alt="Author"
              className="w-[80px] h-[80px] rounded-full object-cover"
            />
            <p
              ref={authorRef}
              contentEditable
              suppressContentEditableWarning
              className="text-[14px] font-bold font-lato outline-none"
            >
              {author}
            </p>
          </div>

          {/* Divider */}
          <div className="w-44 h-px bg-gray-500 mb-4"></div>

          {/* Title */}
          <h2
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            className="text-[23px] font-extrabold font-lato leading-tight outline-none mb-3 max-w-[280px]"
          >
            {title}
          </h2>

          {/* Description */}
          <p
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="text-[15px] leading-[1.5rem] text-[#222] font-merriweather outline-none mb-4 max-w-[240px]"
          >
            {description}
          </p>

          {/* Views/Stats */}
          <div className="flex flex-col gap-2">
            <p className="font-black font-lato text-[16px]">{views} views</p>

            <div className="flex items-center gap-4 text-[14px]">

              {/* Shares */}
              <div className="flex font-lato font-bold items-center gap-1">
                <img
                  src="/story-images/share.svg"
                  alt="share"
                  className="w-5 h-5"
                />
                <span>{shares}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Video Thumbnail */}
        <div
          className="relative flex-shrink-0"
          style={{ width: "560px", height: "320px" }}
        >
          <img
            src={imageUrl}
            alt="Video Thumbnail"
            className="w-full h-full object-cover"
          />
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <IoIosPlayCircle className="w-20 h-20 text-white opacity-95" />
          </div>
        </div>
      </div>

      {/* Bottom Border */}
      <div className="border-t border-dotted border-gray-600 mt-6"></div>
    </div>
  );
};

export default VideoCardHorizontal;
