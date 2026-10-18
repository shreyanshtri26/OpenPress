import React, { useEffect, useRef, useState } from 'react'
import type { Story } from '../storyData'
import { findStoryById } from '../storyData'
// import { registerOverlayPortal } from '@measured/puck'

export interface FeaturedCardItem {
  storyId?: string
  title?: string
  category?: string
}

export interface FeaturedCardProps {
  items?: FeaturedCardItem[]
}

const FeaturedCardItem: React.FC<{ item: FeaturedCardItem }> = ({ item }) => {
  const [story, setStory] = useState<Story | null>(null)

  // Refs for inline editing
  const categoryRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (item.storyId) {
      const found = findStoryById(item.storyId)
      setStory(found || null)
    } else {
      setStory(null)
    }
  }, [item.storyId])

  // useEffect(() => {
  //   if (categoryRef.current) registerOverlayPortal(categoryRef.current)
  //   if (titleRef.current) registerOverlayPortal(titleRef.current)
  // }, [categoryRef, titleRef])

  const displayTitle = story?.headline || item.title || 'Untitled'
  const displayCategory = story?.category || item.category || 'Category'

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
      className={`border-b border-gray-400 last:border-b-0 lg:last:border-b py-3 sm:py-5 px-0 ${publishUrl ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
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
      {displayCategory && (
        <div
          ref={categoryRef}
          // contentEditable
          suppressContentEditableWarning
          className="text-[10px] font-share text-black uppercase outline-none focus:ring-0"
        >
          {displayCategory}
        </div>
      )}
      <h2
        ref={titleRef}
        // contentEditable
        suppressContentEditableWarning
        className="text-[1.1rem] sm:text-lg lg:text-[19px] font-libre font-normal text-black leading-tight mt-1 outline-none focus:ring-0"
      >
        {displayTitle}
      </h2>
    </div>
  )
}


const FeaturedCardLayout: React.FC<FeaturedCardProps> = ({ items = [] }) => {
  if (!items.length) {
    return (
      <div className="p-4 text-gray-500 italic">
        No featured cards added. Please add some cards in the editor.
      </div>
    )
  }

  return (
    <div className="w-full lg:max-w-md mx-auto px-4 lg:px-0">
      {items.map((item, index) => (
        <FeaturedCardItem key={index} item={item} />
      ))}
    </div>
  )
}

export default FeaturedCardLayout
