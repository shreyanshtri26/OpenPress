import { registerOverlayPortal } from "@measured/puck";
import React, { useEffect, useRef } from "react";
import { IoIosPlayCircle } from "react-icons/io";

export type AuthorCardHorizontalProps = {
  id?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  views?: number;
  shares?: number;
};

export const AuthorCardHorizontal: React.FC<AuthorCardHorizontalProps> = ({
  imageUrl = "/openpress-share.png",
  title = "Lorem ipsum dolor sit amet adipiscing elit",
  description = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.",
  views = 8991,
  shares = 100,
}) => {
  // Refs for inline Puck editing
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (titleRef.current) registerOverlayPortal(titleRef.current);
    if (descRef.current) registerOverlayPortal(descRef.current);
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* Horizontal Row */}
      <div className="w-full flex flex-row items-start">
        {/* LEFT COLUMN — Content */}
        <div className="flex-1 flex flex-col">

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
            className="text-[15px] leading-[1.5rem] text-[#222] font-merriweather outline-none mb-8 max-w-[240px]"
          >
            {description}
          </p>

          {/* Views/Stats */}
          <div className="flex flex-col gap-2 mt-24">
            {/* Views */}
            <p className="font-black font-lato text-[16px]">{views} views
            </p>

            {/* Shares */}
            <div className="flex font-lato font-bold items-center gap-1">
              <img
                src="/story-images/share.svg"
                alt="share"
                className="w-5 h-5"
              />
              <span>
                {shares}
              </span>
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

export default AuthorCardHorizontal;
