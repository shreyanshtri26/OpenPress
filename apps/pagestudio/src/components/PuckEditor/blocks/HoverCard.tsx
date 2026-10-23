import React, { useContext, useEffect, useMemo, useState } from 'react'
import { findStoryById } from '../storyData'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'

export interface HoverCardItem {
  storyId?: string
  hoverBgColor?: string
  defaultOpenState?: 'open' | 'close'
  title?: string
  category?: string
  __automaticEmpty?: boolean
}

export interface HoverCardProps {
  id?: string
  items?: HoverCardItem[]
  noBorder?: boolean
}

const EXPANDED_HEIGHT = 320

const HoverCardLayout: React.FC<HoverCardProps> = ({ id, items = [], noBorder = false }) => {
  const autoAssignments = useContext(AutoCardAssignmentsContext)
  const hasCardAssignment = Boolean(autoAssignments && id && Object.prototype.hasOwnProperty.call(autoAssignments.storyIdsByCardId, id))
  const assignedStoryIds = useMemo(
    () => hasCardAssignment && id ? autoAssignments?.storyIdsByCardId[id] ?? [] : null,
    [autoAssignments, hasCardAssignment, id]
  )
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)

  const effectiveItems = useMemo(() => {
    if (!hasCardAssignment) return items
    return items.map((item, index) => ({
      ...item,
      storyId: assignedStoryIds?.[index] ?? '',
      __automaticEmpty: !assignedStoryIds?.[index],
    }))
  }, [assignedStoryIds, hasCardAssignment, items])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updateMobileView = (event?: MediaQueryListEvent) => {
      setIsMobileView(event ? event.matches : mediaQuery.matches)
    }

    updateMobileView()
    mediaQuery.addEventListener('change', updateMobileView)

    return () => {
      mediaQuery.removeEventListener('change', updateMobileView)
    }
  }, [])

  const defaultOpenIndex = useMemo(() => {
    return effectiveItems.findIndex((item) => item.defaultOpenState === 'open')
  }, [effectiveItems])

  const activeIndex = isMobileView
    ? defaultOpenIndex >= 0 ? defaultOpenIndex : null
    : hoveredIndex !== null ? hoveredIndex : defaultOpenIndex >= 0 ? defaultOpenIndex : null

  if (!effectiveItems.length) {
    return (
      <div className="p-4 text-gray-500 italic">
        No hover cards added. Please add some cards in the editor.
      </div>
    )
  }

  return (
    <div className="w-full">
      {effectiveItems.map((item, index) => {
        if (item.__automaticEmpty) {
          return <div key={index} className="min-h-[2rem]" />
        }

        const story = item.storyId ? findStoryById(item.storyId) : null
        const displayTitle = story?.headline || item.title || 'Untitled'
        const rawCategory = (story?.category ?? item.category ?? '').toString().trim()
        const displayCategory = rawCategory || 'Category'
        const imageUrl = story?.imageUrl || '/openpress-share.png'
        const imageAlt = story?.imageAlt || displayTitle
        const publishUrl = story?.publishUrl
        const hoverBgColor = item.hoverBgColor || '#ffffff'
        const isExpanded = activeIndex === index

        const handleClick = () => {
          if (publishUrl) {
            window.open(publishUrl, '_blank', 'noopener,noreferrer')
          }
        }

        const handleHoverStart = () => {
          if (!isMobileView) {
            setHoveredIndex(index)
          }
        }

        return (
          <div
            key={index}
            className={`${!noBorder ? 'border-b border-dotted border-black last:border-b-0 lg:last:border-b' : ''} relative px-0 py-3 last:mb-0 sm:overflow-hidden sm:transition-[height] sm:duration-[350ms] sm:ease-in-out sm:h-[120px]`}
            style={isExpanded ? { height: isMobileView ? 'auto' : `${EXPANDED_HEIGHT}px` } : undefined}
          >
            <div
              className={`${isExpanded ? 'hidden sm:flex sm:opacity-0 sm:-translate-y-2 sm:pointer-events-none' : 'flex sm:opacity-100 sm:translate-y-0'} flex-col justify-start sm:absolute sm:inset-x-0 sm:top-3 sm:bottom-4 sm:transition-[opacity,transform] sm:duration-100 sm:ease-out`}
            >
              <p className="text-[9px] sm:text-[10px] font-share text-black uppercase outline-none focus:ring-0 line-clamp-1">
                {displayCategory}
              </p>
              <h2
                className={`mt-1 text-[1rem] sm:text-base lg:text-[17px] font-libre text-black leading-tight lg:leading-[1.15rem] outline-none focus:ring-0 ${publishUrl ? 'cursor-pointer' : ''}`}
                onMouseEnter={handleHoverStart}
                onFocus={handleHoverStart}
                tabIndex={0}
                role={publishUrl ? 'button' : undefined}
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                     handleClick()
                  }
                }}
              >
                {displayTitle}
              </h2>
            </div>

            <article
              className={`${isExpanded ? 'relative opacity-100' : 'absolute opacity-0 pointer-events-none'} sm:absolute sm:inset-x-0 ${index === 0 ? 'sm:top-0' : 'sm:top-3'} sm:bottom-0 flex flex-col overflow-hidden ${publishUrl ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity duration-[350ms] ease-in-out`}
              style={{ backgroundColor: hoverBgColor }}
              onMouseEnter={handleHoverStart}
              onClick={handleClick}
              role={publishUrl ? 'button' : undefined}
              tabIndex={publishUrl ? 0 : undefined}
              onKeyDown={(e) => {
                if (publishUrl && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleClick()
                }
              }}
            >
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="h-full w-full object-cover transition-opacity duration-300"
                  loading="lazy"
                />
              </div>

              <div className="flex flex-1 flex-col py-2 pl-[32px] pr-[30px] sm:p-2 recommend-card-content">
                <p className="font-share text-[9px] sm:text-[10px] text-black line-clamp-2 uppercase pt-2 sm:pt-3 pb-0.5">
                  {displayCategory}
                </p>

                <p className="font-libre text-[1rem] sm:text-lg lg:text-[20px] font-extrabold text-black mb-1 sm:mb-2 leading-[1.2] lg:leading-[1.40rem]">
                  {displayTitle}
                </p>
              </div>
            </article>
          </div>
        )
      })}
    </div>
  )
}

export default HoverCardLayout
