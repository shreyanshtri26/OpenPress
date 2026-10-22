import React, { useRef } from 'react';
import { IoIosPlayCircle } from 'react-icons/io';
// import { registerOverlayPortal } from "@measured/puck";


export type MultimediaCardProps = {
  id?: string;
  storyId?: string;
  imageUrl?: string;
  label?: string;
  title?: string;
  description?: string;
  author?: string;
  duration?: string;
};

export const MultimediaCard: React.FC<MultimediaCardProps> = ({
  imageUrl = "/openpress-share.png",
  title = "Featured story",
  description = "Lorem ipsum dolor sit amet consectetur adipiscing elit. Dolor sit amet consectetur adipiscing elit quisque faucibus.",
  author = "NAME",
  duration = "4m5s",
}) => {
  // Refs for inline editing
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const authorRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);

  // useEffect(() => {
  //   if (titleRef.current) registerOverlayPortal(titleRef.current);
  //   if (descriptionRef.current) registerOverlayPortal(descriptionRef.current);
  //   if (authorRef.current) registerOverlayPortal(authorRef.current);
  //   if (durationRef.current) registerOverlayPortal(durationRef.current);
  // }, [titleRef, descriptionRef, authorRef, durationRef]);





  return (
    <div className="relative w-full overflow-hidden flex flex-col lg:flex-row h-auto lg:h-[500px]">
      {/* Image Section with Play Button */}
      <div className="relative w-full lg:w-[45%] h-[400px] lg:h-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Error loading image:', imageUrl);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-center p-4">
              <p className="text-sm">Using URL: {imageUrl || 'undefined'}</p>
            </div>
          )}
        </div>

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <IoIosPlayCircle className="w-20 h-20 text-white opacity-95" />
        </div>
      </div>

      {/* Text Section */}
      <div className="w-full lg:w-[55%] p-4 lg:py-0 lg:pl-8 lg:pr-8 flex flex-col h-full">
        {/* Top part: label, title, description */}
        <div className="flex flex-col gap-2 flex-grow">
          {/* Static label */}
          <span className="text-black font-share border-black border-[0.5px] text-[10px] uppercase tracking-wide px-2 w-fit">
            VIDEOS
          </span>

          {/* Editable title */}
          <h2
            ref={titleRef}
            //  contentEditable
            suppressContentEditableWarning
            className="font-libre text-[20px] font-extrabold text-black mb-2 leading-[1.40rem]"
          >
            {title}
          </h2>


          {/* Editable description */}
          <p
            ref={descriptionRef}
            //   contentEditable
            suppressContentEditableWarning
            className="text-black text-[16px] font-[Merriweather] line-clamp-5  text-left outline-none focus:ring-0 leading-[21px]"
          >
            {description}
          </p>
        </div>

        {/* Bottom part: Author + Duration — sticks to bottom */}
        <div className="flex items-center font-share text-sm text-black uppercase tracking-wide  -mb-1">
          <span
            ref={authorRef}
            //    contentEditable
            suppressContentEditableWarning
            className="text-[14px] outline-none focus:ring-0"
          >
            AUTHOR {author}
          </span>
          <span className="text-[14px] mx-0.5">|</span>
          <span
            ref={durationRef}
            //   contentEditable
            suppressContentEditableWarning
            className="lowercase text-[14px] outline-none focus:ring-0"
          >
            {duration}
          </span>
        </div>
      </div>


    </div>
  );
};

export default MultimediaCard;
