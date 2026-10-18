import React from 'react';
import Image from '@/components/common/Image';
import type { StaticImageData } from '@/types/images';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/utils/appleMotion';

// --- Types reused from the parent -----------------------
type ColumnKey = 'ideas' | 'inProgress' | 'inReview' | 'published';

interface Card {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  authorName: string;
  assignedToName: string[];
}

interface Column {
  name: string;
  icon: StaticImageData;
  items: Card[];
}

interface DragOverInfo {
  columnId: ColumnKey;
  index: number;
}

// --- Props for this child component ---------------------
interface DesktopKanbanProps {
  columnId: ColumnKey;
  column: Column;
  scrollContainerRefs: React.MutableRefObject<
    Record<ColumnKey, HTMLDivElement | null>
  >;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>, destColumnId: ColumnKey) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, destColumnId: ColumnKey) => void;
  handleDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    item: Card,
    sourceColumnId: ColumnKey
  ) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  handleCardClick: (item: Card) => void;
  handleDeleteStory: (storyId: string) => void;
  canDeleteStory: (storyId: string) => boolean;
  dragOverInfo: DragOverInfo | null;
}

// --- Component -----------------------------------------
const DesktopKanban: React.FC<DesktopKanbanProps> = ({
  columnId,
  column,
  scrollContainerRefs,
  handleDragOver,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  handleCardClick,
  handleDeleteStory,
  canDeleteStory,
  dragOverInfo,
}) => {
  return (
    <div className="flex flex-1 min-w-0 flex-col min-h-0 bg-gray-50/75 rounded-2xl border border-black/[0.04] p-3 shadow-inner">
      {/* Column Header */}
      <div className="flex items-center gap-x-2 justify-between px-1.5 py-1 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {column.icon && (
            <Image src={column.icon} alt="Swim Lane Icon" className="h-4 w-4 object-contain opacity-80" />
          )}
          <span className="text-sm font-semibold text-gray-900 tracking-tight truncate">{column.name}</span>
        </div>
        <span className="text-[11px] font-semibold text-gray-500 bg-black/[0.05] rounded-full px-2 py-0.5 tabular-nums">
          {column.items.length}
        </span>
      </div>

      {/* Scrollable Column Content */}
      <div
        ref={(el) => {
          scrollContainerRefs.current[columnId] = el;
        }}
        className="flex-1 overflow-y-auto kanban-scroll-container no-scrollbar min-h-0 space-y-2.5 px-0.5 pb-2"
        onDragOver={(e) => handleDragOver(e, columnId)}
        onDrop={(e) => {
          triggerHaptic('selection');
          handleDrop(e, columnId);
        }}
        style={{ isolation: "isolate", contain: "layout style paint" }}
      >
        {(() => {
          const cardElements = column.items.map((item) => (
            <div
              key={item.id}
              data-id={item.id}
              draggable
              onDragStart={(e) => {
                triggerHaptic('selection');
                handleDragStart(e, item, columnId);
              }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                triggerHaptic('selection');
                handleCardClick(item);
              }}
              className="group relative select-none rounded-xl border border-black/[0.08] bg-white p-3.5 text-gray-900 shadow-sm hover:shadow-md hover:border-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex-shrink-0"
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-medium text-xs text-gray-500 tracking-tight truncate">{item.authorName}</span>
                {item.category && (
                  <div className="rounded-full bg-black/[0.04] border border-black/[0.06] px-2 py-0.5 flex-shrink-0">
                    <span className="font-medium text-[11px] text-gray-700 tracking-tight">{item.category}</span>
                  </div>
                )}
              </div>
              <div className="font-semibold text-sm leading-snug tracking-tight text-gray-900 mb-2 line-clamp-2">
                {item.title}
              </div>
              <div className="flex flex-col text-xs text-gray-500">
                {item.assignedToName && item.assignedToName.length > 0 && (
                  <span className="mb-1.5 truncate">
                    Assigned: {' '}
                    <span className="font-medium text-gray-700">
                      {item.assignedToName.join(', ')}
                    </span>
                  </span>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.04]">
                  <span className="text-[11px] font-medium text-gray-400">{item.timeAgo}</span>
                  {canDeleteStory(item.id) && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('selection');
                        handleDeleteStory(item.id);
                      }}
                      title="Delete story"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      <span className="sr-only">Delete story</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ));

          // Drop Indicator
          if (dragOverInfo?.columnId === columnId) {
            const indicator = (
              <div
                key="drop-indicator"
                className="pointer-events-none h-1.5 rounded-full bg-black/80 my-2 mx-1 shadow-sm transition-all duration-150 flex-shrink-0"
              />
            );
            cardElements.splice(dragOverInfo.index, 0, indicator);
          }

          return cardElements;
        })()}
      </div>
    </div>
  );
};

export default DesktopKanban;