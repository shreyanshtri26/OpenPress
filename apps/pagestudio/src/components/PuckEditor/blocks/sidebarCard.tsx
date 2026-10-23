// src/components/PuckEditor/blocks/sidebarCard.tsx
import { useState, useRef, useEffect } from 'react'
 import { findStoryById } from '../storyData'
import { registerOverlayPortal } from '@measured/puck'

export type SidebarStoryCardProps = {
  id?: string
  storyId: string
  isFirst?: boolean
  isLast?: boolean
}

export function SidebarStoryCard({ storyId, isFirst, isLast }: SidebarStoryCardProps) {
  const story = findStoryById(storyId)

  // Hooks first, always in the same order. They used to sit below an early return, so picking a story for an empty card changed
  // the hook count between renders and React threw.
  const [isEditing, setIsEditing] = useState(false)
  const [headline, setHeadline] = useState(story?.headline ?? '')
  const headlineRef = useRef<HTMLHeadingElement>(null)

  // A different story brings its own headline; the previous story's text must not stick.
  useEffect(() => {
    setHeadline(story?.headline ?? '')
    setIsEditing(false)
  }, [story?.headline])

  useEffect(() => {
    if (headlineRef.current) {
      return registerOverlayPortal(headlineRef.current)
    }
  }, [isEditing, story])

  if (!story) {
    return (
      <article className="p-4 border border-dashed border-slate-300 rounded">
        <p className="text-slate-500 text-sm">Pick a story for this card</p>
      </article>
    )
  }

  const handleHeadlineClick = () => setIsEditing(true)
  const handleBlur = () => setIsEditing(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setHeadline(story.headline)
      setIsEditing(false)
    }
  }

  return (
    <article
      className={[
        isFirst ? 'pt-0' : '',
        isLast ? 'pb-0' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {story.category && (
            <span className="font-share text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{story.category}</span>
          )}
          {isEditing ? (
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-libre text-[17px] font-bold leading-snug text-slate-900 border border-slate-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          ) : (
            <h3
              ref={headlineRef}
              onClick={handleHeadlineClick}
              className="font-libre text-[17px] font-bold leading-snug text-slate-900 line-clamp-3 cursor-pointer"
            >
              {headline}
            </h3>
          )}
          {story.author && <p className="font-share text-slate-600 uppercase text-[11px] tracking-wide">{story.author}</p>}
        </div>

        <img
          src={story.imageUrl}
          alt={story.imageAlt}
          className="h-[72px] w-24 flex-none rounded-sm object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {!isLast && <div className="w-full border-t border-slate-200 my-5" />}
    </article>
  )
}
