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




  return (
    <div
      className={`${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} py-3 px-0 last:mb-0 ${publishUrl ? 'cursor-pointer' : ''} transition-colors`}
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
        <p
          ref={categoryRef}
          // contentEditable
          suppressContentEditableWarning
          className="text-[10px] font-share text-black uppercase outline-none focus:ring-0"
        >
          {displayCategory}
        </p>
      )}
      <h2
        ref={titleRef}
        // contentEditable
        suppressContentEditableWarning
        className="text-[1.1rem] sm:text-[1.1rem] lg:text-[18px] font-libre text-black leading-tight lg:leading-[1.50rem] outline-none focus:ring-0"
      >
        {displayTitle}
      </h2>
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
    <div className="max-w-xl md:max-w-3xl lg:max-w-md mx-auto px-4 lg:px-0">
      {effectiveItems.map((item, index) => (
        <ShowcaseCardItem key={index} item={item} noBorder={noBorder} />
      ))}
    </div>
  )
}

export default ShowcaseCardLayout
