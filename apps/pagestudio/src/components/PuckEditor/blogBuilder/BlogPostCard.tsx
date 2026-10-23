import React, { useEffect, useState } from 'react';
import { BlogMainTitle } from './BlogMainTitle';
import { BlogSubHeading } from './BlogSubHeading';
import { BlogImageCard } from './BlogImageCard';
import { BlogTitle } from './BlogTitle';
import { BlogBodyCard } from './BlogBodyCard';
import ShareCard from './ShareCard';
import { getStories, renderEditorJsBlocks, type Story } from '../storyData';

export type BlogPostCardProps = {
  storyId?: string;
  title?: string;
  author?: string;
  time?: string;
  category?: string;
  imageUrl?: string;
  bodyText?: string;
  className?: string;
  onShare?: () => void;
};

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  storyId,
  title = "Default Blog Title",
  author = "Author Name",
  time = "Just now",
  category = "CATEGORY",
  imageUrl,
  bodyText,
  className = "",
  onShare,
}) => {
  const [story, setStory] = useState<Story | null>(null);

  // 🔄 Fetch story data dynamically based on storyId
  useEffect(() => {
    if (!storyId) {
      setStory(null);
      return;
    }
    const stories = getStories();
    const found = stories.find((s) => s.id === storyId);
    setStory(found || null);
  }, [storyId]);


  // 🧠 Merge story data with fallback props
  const displayTitle = story?.headline || title;
  const displayAuthor = story?.author || author;
  const displayCategory = story?.category || category;
  const displayTime = story?.readTime || time;
  const displayImage = story?.imageUrl || imageUrl;

  // Priority: description.blocks (EditorJS) > summary > bodyText
  let displayBody = bodyText || "";
  if (story?.description?.blocks && story.description.blocks.length > 0) {
    displayBody = renderEditorJsBlocks(story.description.blocks);
  } else if (story?.summary) {
    displayBody = story.summary;
  }

  return (
    <article className={`${className}`}>
      <div className="flex flex-col">
        {/* 🏷️ Main Title */}
        <BlogMainTitle storyId={storyId} fallbackTitle={displayTitle} />

        {/* 🕒 Subheading (dynamic category & time) */}
        <div className="w-full mr-0 lg:mr-[120px] ">
          <BlogSubHeading
            storyId={storyId}
            time={displayTime}
            category={displayCategory}
            onShare={onShare}
          />
        </div>

        {/* 🖼️ Image Section */}
        <div className="mt-2 mb-8 w-full overflow-hidden">
          <div className="aspect-video mr-0 lg:mr-[115px]">
            <BlogImageCard
              storyId={storyId}
              imageUrl={displayImage}
              title={displayTitle}
            />
          </div>
        </div>

        {/* ✍️ Title + Author */}
        <div className="mb-6 flex flex-col lg:flex-row gap-3 items-start w-full max-w-[770px] ">

          {/* Share Sidebar (NOW left of Title) */}
          <div className="hidden lg:block h-fit ">
            <ShareCard
              title={displayTitle}
              url={typeof window !== 'undefined' ? window.location.href : ''}
              onShare={onShare}
            />
          </div>

          {/* Title + Author */}
          <BlogTitle
            text={displayTitle}
            author={displayAuthor}
            storyId={storyId}
          />
        </div>

        {/* 📜 Body Content + Share */}
        <div className="flex flex-col lg:flex-row w-full mt-0 lg:-mt-7 gap-5 pl-0 lg:pl-12 ">
          <div className="w-full lg:w-[700px] prose max-w-none">
            <BlogBodyCard
              storyId={storyId}
              bodyText={displayBody}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
