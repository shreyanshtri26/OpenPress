import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Story } from '../storyData'
import { findStoryById } from '../storyData'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
//import { registerOverlayPortal } from '@measured/puck'

export interface ShowcaseCardItem {
  storyId?: string
  title?: string
  category?: string
  __automaticEmpty?: boolean
}

export interface ShowcaseCardProps {
  id?: string
  items?: ShowcaseCardItem[]
  noBorder?: boolean
}

const ShowcaseCardItem: React.FC<{ item: ShowcaseCardItem, noBorder?: boolean }> = ({ item, noBorder = false }) => {
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

  if (item.__automaticEmpty) {
    return <div className="min-h-[2rem]" />
  }

  // Register overlay portals for inline editing
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




  const displayImage = story?.imageUrl || ''
  const displayAuthor = story?.author && story.author !== 'Unknown Author' ? story.author : ''

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 ${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} py-4 px-0 ${publishUrl ? 'cursor-pointer' : ''}`}
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
      <div className="min-w-0">
        {displayCategory && (
          <p
            ref={categoryRef}
            suppressContentEditableWarning
            className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-share text-black uppercase tracking-wide outline-none focus:ring-0"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" aria-hidden="true" />
            {displayCategory}
          </p>
        )}
        <h2
          ref={titleRef}
          suppressContentEditableWarning
          className="mt-1.5 line-clamp-3 text-[1.05rem] sm:text-[1.1rem] lg:text-[18px] font-libre font-bold text-black leading-snug outline-none focus:ring-0 group-hover:underline"
        >
          {displayTitle}
        </h2>
        {displayAuthor && <p className="mt-2 text-[10px] font-share text-black uppercase tracking-wide opacity-70">{displayAuthor}</p>}
      </div>
      {displayImage && (
        <img
          src={displayImage}
          alt=""
          className="h-[72px] w-[96px] flex-none rounded-[10px] object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}
    </div>
  )
}

const ShowcaseCardLayout: React.FC<ShowcaseCardProps> = ({ id, items = [], noBorder = false }) => {
  const autoAssignments = useContext(AutoCardAssignmentsContext);
  const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id));
  const assignedStoryIds = useMemo(
    () => hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id] ?? [] : null,
    [autoAssignments, hasCardAssignment, id]
  );

  const effectiveItems: ShowcaseCardItem[] = useMemo(() => {
    if (!hasCardAssignment) return items;
    return items.map((item, idx) => ({
      ...item,
      storyId: assignedStoryIds?.[idx] ?? '',
      __automaticEmpty: !assignedStoryIds?.[idx],
    }));
  }, [assignedStoryIds, hasCardAssignment, items]);

  if (!effectiveItems.length) {
    return (
      <div className="p-4 text-gray-500 italic">
        No featured cards added. Please add some cards in the editor.
      </div>
    )
  }

  return (
    <div className="w-full">
      {effectiveItems.map((item, index) => (
        <ShowcaseCardItem key={index} item={item} noBorder={noBorder} />
      ))}
    </div>
  )
}

export default ShowcaseCardLayout
