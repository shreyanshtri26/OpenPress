import { type ReactNode } from 'react'
import { AutoCardAssignmentsContext } from './AutoCardAssignmentsContext'
import { useAutoGridCardAssignments } from './useAutoGridCardAssignments'

const ALL_STORIES_GRID_ZONES = ['left', 'right-top-1', 'right-top-2', 'right-top-3', 'right-bottom']

export type AllStoriesGridProps = {
  id?: string
  mode?: 'manual' | 'automatic'
  automaticCategory?: string
  autoStoryIds?: string[]
  children?: ReactNode
  className?: string
  puck?: {
    renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode
  }
  items?: ReactNode[]
}

// Helper to check if a child is a valid renderable item (not an empty object)
function isValidChild(child: unknown): boolean {
  if (child === null || child === undefined) return false;
  if (typeof child !== 'object') return true; // primitives are valid
  // Check if it's an empty object (no keys)
  if (Object.keys(child as object).length === 0 && (child as object).constructor === Object) {
    return false;
  }
  return true;
}

export function AllStoriesGrid({
  id,
  mode = 'manual',
  autoStoryIds = [],
  children,
  className = '',
  puck,
  items: itemsProp,
}: AllStoriesGridProps) {
  const rawItems = itemsProp || (children ? (Array.isArray(children) ? children : [children]) : []);
  const items = rawItems.filter(isValidChild);

  const isEditMode = Boolean(puck?.renderDropZone);
  const isAutomatic = mode === 'automatic';

  const dz = (zoneName: string, extraClass = '') => {
    if (!puck?.renderDropZone) return null;
    return puck.renderDropZone({ zone: `all-stories-grid-${zoneName}`, className: `w-full ${extraClass}` });
  };

  const storyIdsByCardId = useAutoGridCardAssignments(
    id,
    'all-stories-grid',
    ALL_STORIES_GRID_ZONES,
    autoStoryIds
  )

  const renderSlot = (slotIndex: number, zoneName: string, minH = ''): ReactNode => {
    if (isAutomatic && isEditMode) return dz(zoneName, minH)
    if (items[slotIndex]) return items[slotIndex];
    if (isEditMode) return dz(zoneName, minH);
    return null;
  };

  return (
    <AutoCardAssignmentsContext.Provider value={isAutomatic ? { storyIdsByCardId } : null}>
    <section id={id} className={`w-full bg-white sm:pt-6 ${className}`}>
      <div className="op-container">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:justify-between">
          {/* Left column */}
          <div className="w-full lg:w-[59.5%] flex-shrink-0">
            <div className="h-auto min-h-[20rem]">
              {renderSlot(0, 'left', 'h-full w-full')}
            </div>
          </div>

          {/* Right column */}
          <div className="w-full lg:w-[32.5%] flex-shrink-0 flex flex-col">
            <div className="h-auto min-h-[2rem]">{renderSlot(1, 'right-top-1', 'h-full w-full')}</div>
            <div className="h-auto min-h-[2rem]">{renderSlot(2, 'right-top-2', 'h-full w-full')}</div>
            <div className="h-auto min-h-[2rem]">{renderSlot(3, 'right-top-3', 'h-full w-full')}</div>
            <div className="h-auto min-h-[2rem]">{renderSlot(4, 'right-bottom', 'h-full w-full')}</div>
          </div>
        </div>
      </div>
    </section>
    </AutoCardAssignmentsContext.Provider>
  );
}
