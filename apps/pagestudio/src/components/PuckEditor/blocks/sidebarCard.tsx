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

if (!story) {
  return (
    <article className="p-4 border border-slate-200 rounded">
      <p className="text-slate-500 text-sm">No story selected</p>
    </article>
  )
}

  const [isEditing, setIsEditing] = useState(false)
  const [headline, setHeadline] = useState(story.headline)
  const headlineRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (headlineRef.current) {
      return registerOverlayPortal(headlineRef.current)
    }
  }, [headlineRef.current])

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
      <div className="flex overflow-hidden items-center justify-between gap-5">
        <div className="flex flex-col">
          {isEditing ? (
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-cormorant-garamond text-xl font-semibold leading-snug text-slate-900 mb-4 border border-slate-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h3
              ref={headlineRef}
              onClick={handleHeadlineClick}
              className="font-cormorant-garamond text-xl font-semibold leading-snug text-slate-900 mb-4 cursor-pointer hover:bg-slate-50 rounded px-2 py-1 transition-colors"
            >
              {headline}
            </h3>
          )}
          <p className="font-jetbrains-mono text-black uppercase text-[12px] font-medium">
            {story.author}
          </p>
        </div>

        <img
          src={story.imageUrl}
          alt={story.imageAlt}
          className="h-20 w-50 object-cover shadow-sm md:h-20"
          loading="lazy"
        />
      </div>

      {!isLast && <div className="w-full border-t border-slate-300 my-5" />}
    </article>
  )
}
