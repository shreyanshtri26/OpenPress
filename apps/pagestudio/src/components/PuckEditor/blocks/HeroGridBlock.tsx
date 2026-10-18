import { type ReactNode, useMemo } from 'react'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
import { useAutoGridCardAssignments } from './useAutoGridCardAssignments'

const HERO_GRID_ZONES = ['left-0', 'left-1', 'center-0', 'right-0', 'right-1']

export type HeroGridProps = {
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

export function HeroGridBlock({
  id,
  mode = 'manual',
  autoStoryIds = [],
  children,
  className = '',
  puck,
}: HeroGridProps) {
  const items = useMemo(() => {
    if (!children) return []
    const childrenArray = Array.isArray(children) ? children : [children]
    // Filter out any falsy values or empty objects
    return childrenArray.filter(child => {
      if (!child) return false
      if (typeof child === 'object' && Object.keys(child).length === 0) return false
      return true
    })
  }, [children])

  const isEditMode = Boolean(puck?.renderDropZone)
  const isAutomatic = mode === 'automatic';

  const dz = (zoneName: string, extraClass = '') => {
    if (!puck?.renderDropZone) return null
    return puck.renderDropZone({ zone: `hero-grid-${zoneName}`, className: `w-full ${extraClass}` })
  }

  const storyIdsByCardId = useAutoGridCardAssignments(
    id,
    'hero-grid',
    HERO_GRID_ZONES,
    autoStoryIds
  )

  const renderSlot = (slotIndex: number, zoneName: string, extraClass = ''): ReactNode => {
    if (isAutomatic && isEditMode) {
      return dz(zoneName, extraClass)
    }

    if (items[slotIndex]) return items[slotIndex];
    if (isEditMode) return dz(zoneName, extraClass);
    return null;
  };

  return (
    <AutoCardAssignmentsContext.Provider value={isAutomatic ? { storyIdsByCardId } : null}>
    <section id={id} className={`w-full bg-white lg:pt-12 pt-4 px-0 lg:px-16 pb-0 mb-0 ${className}`}>
      <div className="relative mx-auto w-full max-w-7xl px-0 lg:px-8 pb-4">
        {/* Vertical dotted lines between columns */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="hidden lg:block absolute top-0 bottom-[1rem] left-[calc((25%)+0.75rem)]"
            style={{ borderLeft: '1px solid #d2d2d7' }}
          />
          <div
            className="hidden lg:block absolute top-0 bottom-[1rem] left-[calc((75%)-0.75rem)]"
            style={{ borderLeft: '1px solid #d2d2d7' }}
          />
        </div>
        {/* Main grid layout */}
        <div className="relative z-10 grid grid-cols-1 gap-4 sm:gap-5 lg:gap-x-6 gap-y-2 lg:grid-cols-12">
          {/* Left column */}
          <div className="order-2 lg:order-1 lg:col-span-3 flex flex-col gap-3 relative">
            <div className="h-auto order-1 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">
              {renderSlot(0, 'left-0', 'h-full')}
            </div>
            <hr className="border-t border-dotted border-black mb-3 flex-shrink-0 order-2 lg:order-none" />
            <div className="h-auto order-3 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">
              {renderSlot(1, 'left-1', 'h-full')}
            </div>
          </div>
          {/* Center column */}
          <div className="order-1 lg:order-2 lg:col-span-6 px-0 lg:px-2 grid grid-rows-[minmax(6rem,min-content)] relative">
            <div className="h-auto">{renderSlot(2, 'center-0', 'h-full min-h-[20rem]')}</div>
            <hr className="border-t border-dotted border-black my-4 lg:hidden" />
          </div>
          {/* Right column */}
          <div className="order-3 lg:order-3 lg:col-span-3 flex flex-col gap-3 relative">
            <div className="h-auto order-1 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">
              {renderSlot(3, 'right-0', 'h-full')}
            </div>
            <hr className="border-t border-dotted border-black mb-3 flex-shrink-0 order-2 lg:order-none" />
            <div className="h-auto order-3 lg:order-none [&_h3]:text-[1.5rem] lg:[&_h3]:text-[20px] sm:[&_h3]:text-lg">
              {renderSlot(4, 'right-1', 'h-full')}
            </div>
            <hr className="border-t border-dotted border-black my-4 lg:hidden order-4" />
          </div>
        </div>
      </div>
    </section>
    </AutoCardAssignmentsContext.Provider>
  )
}
