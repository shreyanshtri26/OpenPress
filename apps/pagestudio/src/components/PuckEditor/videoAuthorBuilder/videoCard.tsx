import React, { useRef, useEffect } from "react";
import { registerOverlayPortal } from "@measured/puck";
import { IoIosPlayCircle } from "react-icons/io";


export type VideoCardProps = {
  id?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  author?: string;
  views?: number;
  likes?: number;
  shares?: number;
};

export const VideoCard: React.FC<VideoCardProps> = ({
  imageUrl = "/openpress-share.png",
  title = "Lorem ipsum dolor sit amet adipiscing elit",
  description = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis.",
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
    <div className="w-full flex flex-col pt-8 ">

      {/* TOP — Author + Image Row */}
      <div className="w-full flex flex-row gap-10">
        
        <div className="flex-1 flex flex-col">

         
          <h2
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            className="text-[23px] font-extrabold font-lato leading-tight outline-none mb-4"
          >
            {title}
          </h2>

          {/* Description */}
          <p
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="text-[17px] leading-[1.45rem] text-[#222] font-merriweather outline-none max-w-[550px]"
          >
            {description}
          </p>
        </div>

        {/* RIGHT COLUMN — Video Thumbnail */}
       <div
  className="relative"
  style={{ width: "405px", height: "558px" }}
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

      {/* Bottom Views/Stats */}
<div className="-mt-12">
  <p className="font-black font-lato text-[16px]">
    {views} views
  </p>

  {/* Row: Shares on left — Time on right */}
<div className="grid grid-cols-[1fr_405px] mt-1 text-[14px] w-full pr-24">
    {/* Shares */}
    <div className="flex font-lato font-bold items-center gap-1">
      <img
        src="/story-images/share.svg"
        alt="share"
        className="w-5 h-5"
      />
      <span>{shares}</span>
    </div>

    {/* Time */}
    <p className="text-gray-400 font-share">1 day ago</p>
  </div>
</div>


      {/* Bottom Border */}
      <div className="border-t border-dotted border-gray-600 mt-6"></div>
    </div>
  );
};

export default VideoCard;

