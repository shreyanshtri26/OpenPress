import { type ReactNode, useMemo } from 'react'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
import { useAutoGridCardAssignments } from './useAutoGridCardAssignments'

const MULTIMEDIA_GRID_ZONES = ['left', 'right-0', 'right-1', 'right-2', 'right-3']

export type MultimediaGridProps = {
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

export function MultimediaGridBlock({
  id,
  mode = 'manual',
  autoStoryIds = [],
  children,
  className = '',
  puck,
}: MultimediaGridProps) {
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
    return puck.renderDropZone({ zone: `multimedia-grid-${zoneName}`, className: `w-full ${extraClass}` })
  }

  const storyIdsByCardId = useAutoGridCardAssignments(
    id,
    'multimedia-grid',
    MULTIMEDIA_GRID_ZONES,
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
    <section id={id} className={`w-full bg-white px-0 py-8 lg:pt-8 lg:px-16 lg:pb-12 relative ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 relative pb-4">
        {/* Vertical dotted line between left and right columns */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 hidden lg:block"
            style={{
              top: 0,
              bottom: '18px',
              borderLeft: '1px solid #d2d2d7',
            }}
          />
          <div
            className="hidden lg:block mx-8 absolute  left-0 right-0 -bottom-5"
            style={{ borderBottom: '1px solid gray' }}
          />        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-12 relative">
          {/* Left column — large video/main card */}
          <div className="lg:col-span-6">
            <div className="w-full h-full bg-white overflow-hidden min-h-[300px]">
              {renderSlot(0, 'left', 'min-h-[300px]')}
            </div>
          </div>

          {/* Right column — 2x2 grid */}
          <div className="lg:col-span-6 grid grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6 relative">
            {/* Dotted grid lines inside right section */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-0 bottom-[52.5%] left-1/2"
                style={{ borderLeft: '1px solid #d2d2d7' }}
              />
              <div
                className="absolute top-[52.5%] bottom-0 left-1/2"
                style={{ borderLeft: '1px solid #d2d2d7' }}
              />
              <div
                className="absolute top-1/2 left-0 right-0"
                style={{ borderTop: '1px solid #d2d2d7' }}
              />
            </div>

            {/* Each small right-side card (total 4) */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-auto min-h-[150px]">
                {renderSlot(i + 1, `right-${i}`, 'min-h-[150px]')}
              </div>
            ))}
          </div>
        </div>
      </div>


    </section>
    </AutoCardAssignmentsContext.Provider>
  )
}
