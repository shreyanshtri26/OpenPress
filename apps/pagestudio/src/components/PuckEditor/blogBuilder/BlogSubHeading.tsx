import React, { useEffect, useState } from 'react';
import { getStories, type Story } from '../storyData';
import { useActiveSection } from '../ActiveSectionContext';

export interface BlogSubHeadingProps {
  storyId?: string;
  time?: string;
  category?: string;
  onShare?: () => void;
  className?: string;
  id?: string;
}

export const BlogSubHeading: React.FC<BlogSubHeadingProps> = ({
  storyId,
  time: _time = '',
  category = 'CATEGORY',
  onShare,
  className = '',
  id,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const { setActiveSection } = useActiveSection();

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      return;
    }
    const stories = getStories();
    const found = stories.find((s) => s.id === storyId);
    setStory(found || null);
  }, [storyId]);

  // ⭐ NEW — Read Time Calculator (220 WPM)
  function calculateReadTime(text: string = ""): string {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return '1 min read';
    const minutes = Math.max(1, Math.ceil(words / 220));
    return `${minutes} min read`;
  }

  const [liveReadTime, setLiveReadTime] = useState<string>('');

  useEffect(() => {
    if (story?.fullDescription) {
      setLiveReadTime(calculateReadTime(story.fullDescription.replace(/<[^>]+>/g, '')));
      return;
    }

    const updateFromDOM = () => {
      const bodyContent = document.querySelector('.blog-body-content');
      if (bodyContent && bodyContent.textContent) {
        setLiveReadTime(calculateReadTime(bodyContent.textContent));
      } else {
        setLiveReadTime('1 min read');
      }
    };

    updateFromDOM();
    const interval = setInterval(updateFromDOM, 2000);
    return () => clearInterval(interval);
  }, [story?.fullDescription]);

  // Use story data if available
  const displayCategory = story?.category || category;

  const displayTime = liveReadTime;

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if ((window as any).cwr) {
      // Wrapped in a single object with 'type' and 'data'
      (window as any).cwr('recordEvent', {
        type: "share_button_click",
        data: {
          platform: "native_share",
          page: window.location.pathname
        }
      });
    }
    if (onShare) onShare();
    else if (navigator.share) {
      navigator
        .share({
          title: story?.headline || document.title,
          url: window.location.href,
        })
        .catch(console.error);
    }
  };

  return (
    <div
      id={id}
      className={`flex items-center justify-between w-full max-w-full lg:max-w-[808px] py-2 lg:py-1 font-share ${className}`}
    >
      <div className="flex items-center gap-2">
        {displayCategory && (
          <span
            onClick={() => setActiveSection(displayCategory)}
            className="text-black font-share border-black border-[0.5px] text-[11px] uppercase tracking-wide px-1 py-1 w-fit cursor-pointer hover:bg-black hover:text-white transition-colors"
          >
            {displayCategory}
          </span>
        )}

        {displayTime && (
          <span className="text-black text-[11px] font-share">{displayTime}</span>
        )}
      </div>

      {/* SHARE BUTTON */}
      <div className="hidden lg:block flex-shrink-0 font-share">
        <button
          onClick={handleShareClick}
          className="relative flex w-[65px] items-stretch border-[0.5px] border-gray-500 bg-white p-0 cursor-pointer select-none h-5"
        >
          {/* LEFT TEXT */}
          <span className="text-[9px] tracking-[0.03em] text-[#3b3b3b] p-0 pl-1.5 flex items-center justify-center">
            SHARE
          </span>

          {/* DIVIDER */}
          <div className="w-[0.5px] ml-1 bg-gray-500"></div>

          {/* ICON BOX */}
          <div className="px-1.5 py-0.5 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="black"
              className="block"
            >
              <path d="M12 6V2l7 7l-7 7v-4c-5 0-8.5 1.5-11 5l.8-3l.2-.4A12 12 0 0 1 12 6"></path>
            </svg>
          </div>
        </button>
      </div>

    </div>
  );
};

export default BlogSubHeading;
