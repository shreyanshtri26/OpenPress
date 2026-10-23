import React, { type ReactNode, useMemo, useRef, useState, useEffect } from 'react'
import { StoryCard } from './StoryCard'
import { RecommendCard } from './RecommendCard'
import { getStories } from '../storyData'
import { getLatestStoriesForCategory } from '../../../helpers/core/storyCategory'
import { AutoStoryIdContext } from './AutoStoryContext'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
import { useAutoGridCardAssignments } from './useAutoGridCardAssignments'

const THUMBNAIL_GRID_ZONES = ['box-0', 'box-1', 'box-2', 'box-3']

export type ThumbnailGridProps = {
  id?: string
  mode?: 'manual' | 'automatic'
  automaticCategory?: string
  autoStoryIds?: string[]
  children?: ReactNode
  className?: string
  puck?: {
    renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode
  }
}

export function ThumbnailGridBlock({
  id,
  mode = 'manual',
  automaticCategory,
  autoStoryIds = [],
  children,
  className = '',
  puck,
}: ThumbnailGridProps) {
  const normalizeString = (value: unknown): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''

  const parseTaxonomyOption = (value: string): { taxonomyName: string; taxonomyValue: string } | null => {
    if (!value || !value.includes('::')) return null
    const [taxonomyName, ...rest] = value.split('::')
    const taxonomyValue = rest.join('::')
    if (!taxonomyName || !taxonomyValue) return null
    return { taxonomyName: taxonomyName.trim(), taxonomyValue: taxonomyValue.trim() }
  }

  const storyMatchesTaxonomy = (story: any, selectedTaxonomyName: string, selectedTaxonomyValue: string): boolean => {
    const taxonomyName = normalizeString(selectedTaxonomyName)
    const selectedValue = normalizeString(selectedTaxonomyValue)
    if (!taxonomyName || !selectedValue) return true

    const candidateValues = new Set<string>()
    const addCandidate = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const normalized = normalizeString(item)
          if (normalized) candidateValues.add(normalized)
        })
        return
      }

      const normalized = normalizeString(value)
      if (normalized) candidateValues.add(normalized)
    }

    if (taxonomyName === 'section') {
      addCandidate(story.section)
      addCandidate(story.Section)
    } else if (taxonomyName === 'category') {
      addCandidate(story.taxonomyCategories)
      addCandidate(story.Category)
      addCandidate(story.taxonomyCategory)
      addCandidate(story.category)
    } else if (taxonomyName === 'author' || taxonomyName === 'reporter' || taxonomyName === 'journalist') {
      addCandidate(story.authorName)
      addCandidate(story.author)
      addCandidate(story.byLine)
      addCandidate(story.byline)
    }

    const rawStory = story as Record<string, unknown>
    const normalizedTaxonomyKey = taxonomyName.replace(/\s+/g, '').toLowerCase()
    Object.entries(rawStory).forEach(([key, value]) => {
      const normalizedKey = key.replace(/\s+/g, '').toLowerCase()
      if (normalizedKey === normalizedTaxonomyKey) {
        addCandidate(value)
      }
    })

    return candidateValues.has(selectedValue)
  }

  const getStoryTimestamp = (story: any): number => {
    const rawDate =
      story.proposedFilingDate ||
      story.publishDate ||
      story.publishedAt ||
      story.createdAt ||
      story.updatedAt ||
      ''

    const timestamp = new Date(rawDate).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const items = useMemo(() => {
    if (!children) return [];
    const childrenArray = Array.isArray(children) ? children : [children];
    // Filter out any falsy values or empty objects
    return childrenArray.filter(child => {
      if (!child) return false;
      if (typeof child === 'object' && Object.keys(child).length === 0) return false;
      return true;
    });
  }, [children]);

  const automaticStories = useMemo(() => {
    if (mode !== 'automatic' && !automaticCategory?.trim()) return []

    if (Array.isArray(autoStoryIds) && autoStoryIds.length > 0) {
      const storyMap = new Map(getStories().map((story) => [story.id, story]))
      return autoStoryIds
        .map((storyId) => storyMap.get(storyId))
        .filter((story): story is NonNullable<typeof story> => Boolean(story))
        .slice(0, 4)
    }

    if (!automaticCategory?.trim()) return []

    const parsed = parseTaxonomyOption(automaticCategory)
    if (!parsed) {
      // Backward compatibility for old values where only category value was stored.
      return getLatestStoriesForCategory(getStories(), automaticCategory, 4)
    }

    return [...getStories()]
      .filter((story) => storyMatchesTaxonomy(story, parsed.taxonomyName, parsed.taxonomyValue))
      .sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left))
      .slice(0, 4)
  }, [mode, automaticCategory, autoStoryIds])

  const isEditMode = Boolean(puck?.renderDropZone)
  const isAutomatic = mode === 'automatic' || Boolean(automaticCategory?.trim())
  const automaticStoryIds = autoStoryIds.length > 0
    ? autoStoryIds
    : automaticStories.map((story) => story.id)
  const storyIdsByCardId = useAutoGridCardAssignments(
    id,
    'thumbnail-grid',
    THUMBNAIL_GRID_ZONES,
    automaticStoryIds
  )

  // Detect mobile layout: count all thumbnail-grid-section siblings to determine 1-col vs 2x2
  const sectionRef = useRef<HTMLElement>(null)
  const [mobileGridCols, setMobileGridCols] = useState<'grid-cols-1' | 'grid-cols-2'>('grid-cols-2')
  const [isMobile2x2, setIsMobile2x2] = useState(true)

  useEffect(() => {
    if (!sectionRef.current) return
    const allGrids = Array.from(document.querySelectorAll<HTMLElement>('.thumbnail-grid-section'))
    const total = allGrids.length
    const index = allGrids.indexOf(sectionRef.current)
    const is2x2 = total === 1 || index % 2 === 1
    setIsMobile2x2(is2x2)
    setMobileGridCols(is2x2 ? 'grid-cols-2' : 'grid-cols-1')
  }, [])

  const renderDropZone = (
    zoneProps: { className?: string } = {},
    zoneName: string,
    extraClass = ''
  ) => {
    if (!puck?.renderDropZone) return null

    // Create a clean props object with the correct type
    const props = {
      zone: `thumbnail-grid-${zoneName}`,
      className: `w-full h-full ${extraClass} ${zoneProps.className || ''}`.trim(),
    };

    return puck.renderDropZone(props)
  }

  // If in edit mode but no renderDropZone is provided, show a warning
  if (isEditMode && !puck?.renderDropZone) {
    console.warn('ThumbnailGridBlock: In edit mode but no renderDropZone provided')
  }

  // If not in edit mode and no children, return null or a placeholder
  if (!isEditMode && !isAutomatic && (!items || items.length === 0)) {
    return null
  }

  const automaticCards = Array.from({ length: 4 }, (_, index) => {
    const story = automaticStories[index]
    if (!story) return null

    const manualNode = items[index]

    // Keep the original component type in automatic mode (StoryCard/RecommendCard)
    // and only swap in the auto-selected story ID, same behavior goal as More Stories.
    if (React.isValidElement(manualNode)) {
      return React.cloneElement(manualNode as React.ReactElement<any>, {
        ...(manualNode.props || {}),
        storyId: story.id,
      })
    }

    if (manualNode && typeof manualNode === 'object' && 'type' in (manualNode as Record<string, unknown>)) {
      const fallbackNode = manualNode as { type?: string; props?: Record<string, unknown> }
      if (fallbackNode.type === 'RecommendCard') {
        return <RecommendCard key={story.id} {...(fallbackNode.props ?? {})} storyId={story.id} />
      }

      if (fallbackNode.type === 'StoryCard') {
        return <StoryCard key={story.id} {...(fallbackNode.props ?? {})} storyId={story.id} />
      }
    }

    const parsed = parseTaxonomyOption(automaticCategory || '')
    const label = parsed?.taxonomyValue || automaticCategory
    return <RecommendCard key={story.id} storyId={story.id} label={label} />
  })

  return (
    <AutoCardAssignmentsContext.Provider value={isAutomatic ? { storyIdsByCardId } : null}>
    <section ref={sectionRef} id={id} className={`w-full bg-white pt-6 lg:pb-6 relative thumbnail-grid-section ${className}`}>
      <div className={`op-container relative pb-0 thumbnail-grid ${isMobile2x2 ? 'thumbnail-grid-mobile-2x2' : 'thumbnail-grid-mobile-single'}`}>
        {/* Mobile plus-type border — only for 2x2 layout */}
        {isMobile2x2 && (
          <div className="lg:hidden absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: '1px solid #d2d2d7' }}></div>
            <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: '1px solid #d2d2d7' }}></div>
            {/* Intersection gap */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white z-10"></div>
          </div>
        )}

        {/* Dotted vertical lines (desktop only) */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          {/* First vertical divider at 25% */}
          <div
            className="absolute top-0 bottom-0 left-[25.5%]"
            style={{
              borderLeft: '1px solid #d2d2d7',
              borderSpacing: '1px',
            }}
          />
          {/* Second vertical divider at 50% */}
          <div
            className="absolute top-0 bottom-0 left-[50%]"
            style={{
              borderLeft: '1px solid #d2d2d7',
              borderSpacing: '1px',
            }}
          />
          {/* Third vertical divider at 75% */}
          <div
            className="absolute top-0 bottom-0 left-[74.4%]"
            style={{
              borderLeft: '1px solid #d2d2d7',
              borderSpacing: '1px',
            }}
          />
          {/* Horizontal solid line at bottom */}
          <div
            className="mx-8 absolute  left-0 right-0 -bottom-5"
            style={{ borderBottom: '1px solid gray' }}
          />

        </div>

        {/* 4-box grid layout - responsive */}
        <div className={`grid ${mobileGridCols} lg:grid-cols-4 gap-6 lg:gap-x-8 relative`}>
          {/* Box 1 */}
          <div className="w-full h-full">
            <AutoStoryIdContext.Provider value={isAutomatic ? (automaticStories[0]?.id ?? null) : null}>
              {isAutomatic
                ? isEditMode ? renderDropZone({}, 'box-0', 'min-h-[300px]') : (automaticCards[0] || null)
                : isEditMode
                  ? renderDropZone({}, 'box-0', 'min-h-[300px]')
                  : items[0] || null}
            </AutoStoryIdContext.Provider>
          </div>

          {/* Box 2 */}
          <div className="w-full h-full">
            <AutoStoryIdContext.Provider value={isAutomatic ? (automaticStories[1]?.id ?? null) : null}>
              {isAutomatic
                ? isEditMode ? renderDropZone({}, 'box-1', 'min-h-[300px]') : (automaticCards[1] || null)
                : isEditMode
                  ? renderDropZone({}, 'box-1', 'min-h-[300px]')
                  : items[1] || null}
            </AutoStoryIdContext.Provider>
          </div>

          {/* Box 3 */}
          <div className="w-full h-full">
            <AutoStoryIdContext.Provider value={isAutomatic ? (automaticStories[2]?.id ?? null) : null}>
              {isAutomatic
                ? isEditMode ? renderDropZone({}, 'box-2', 'min-h-[300px]') : (automaticCards[2] || null)
                : isEditMode
                  ? renderDropZone({}, 'box-2', 'min-h-[300px]')
                  : items[2] || null}
            </AutoStoryIdContext.Provider>
          </div>

          {/* Box 4 */}
          <div className="w-full h-full">
            <AutoStoryIdContext.Provider value={isAutomatic ? (automaticStories[3]?.id ?? null) : null}>
              {isAutomatic
                ? isEditMode ? renderDropZone({}, 'box-3', 'min-h-[300px]') : (automaticCards[3] || null)
                : isEditMode
                  ? renderDropZone({}, 'box-3', 'min-h-[300px]')
                  : items[3] || null}
            </AutoStoryIdContext.Provider>
          </div>
        </div>
      </div>


    </section>
    </AutoCardAssignmentsContext.Provider>
  )
}
