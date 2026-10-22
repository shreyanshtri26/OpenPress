import { type ReactNode, useMemo } from 'react'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
import { useAutoGridCardAssignments } from './useAutoGridCardAssignments'

const POPULAR_GRID_ZONES = ['left', 'right-1', 'right-2']

export type PopularGridProps = {
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

export function PopularGridBlock({
  id,
  mode = 'manual',
  autoStoryIds = [],
  children,
  className = '',
  puck,
}: PopularGridProps) {
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
    return puck.renderDropZone({ zone: `popular-grid-${zoneName}`, className: `w-full ${extraClass}` })
  }

  const storyIdsByCardId = useAutoGridCardAssignments(
    id,
    'popular-grid',
    POPULAR_GRID_ZONES,
    autoStoryIds
  )

  const renderSlot = (slotIndex: number, zoneName: string, extraClass = ''): ReactNode => {
    if (isAutomatic && isEditMode) return dz(zoneName, extraClass)
    if (items[slotIndex]) return items[slotIndex];
    if (isEditMode) return dz(zoneName, extraClass);
    return null;
  };

  return (
    <AutoCardAssignmentsContext.Provider value={isAutomatic ? { storyIdsByCardId } : null}>
    <section id={id} className={`w-full bg-white lg:pt-6 px-0 lg:px-16 pb-10 relative ${className}`}>
      <div className="relative mx-auto w-full max-w-7xl px-4 lg:px-8 pb-4">


        {/* ✅ Horizontal line (same as HeroGrid) */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="hidden lg:block mx-8 absolute left-0 right-0 -bottom-5"
            style={{ borderBottom: '1px solid gray' }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-12 lg:items-start">

          {/* Left Column */}
          <div className="lg:col-span-9">
            <div className="w-full h-auto overflow-hidden rounded min-h-[20rem]">
              {renderSlot(0, 'left', 'h-full w-full')}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 flex flex-col gap-1">
            {[1, 2].map((index) => (
              <div key={index} className="h-full">
                {renderSlot(index, `right-${index}`, 'h-full w-full')}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
    </AutoCardAssignmentsContext.Provider>
  )
}
