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
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-stretch">
          {/* Left column */}
          <div className="min-w-0 w-full lg:flex-[1.85] lg:flex lg:flex-col lg:[&_[data-puck-dnd]]:flex-1 lg:[&_[data-puck-dnd]]:flex lg:[&_[data-puck-dnd]]:flex-col lg:[&_a]:flex-1 lg:[&_a]:flex lg:[&_a]:flex-col lg:[&_img]:flex-1 lg:[&_img]:min-h-[18rem] lg:[&_img]:aspect-auto">
            <div className="h-auto min-h-[20rem] lg:flex-1 lg:flex lg:flex-col">
              {renderSlot(0, 'left', 'h-full w-full lg:flex-1')}
            </div>
          </div>

          {/* Right column */}
          <div className="min-w-0 w-full lg:flex-1 flex flex-col gap-6 lg:divide-y lg:divide-[#d2d2d7] lg:[&>div]:pt-6 lg:[&>div:first-child]:pt-0 lg:[&_h2]:text-[21px] lg:[&_h2]:leading-[1.2] lg:[&_a>div]:grid lg:[&_a>div]:grid-cols-[9rem_minmax(0,1fr)] lg:[&_a>div]:items-start lg:[&_a>div]:gap-4 lg:[&_img]:aspect-[4/3] lg:[&_img]:w-full">
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
