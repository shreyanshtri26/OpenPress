// src/components/common/Kanban/MobileKanban.tsx
import React from 'react';
import Image from '@/components/common/Image';
import type { StaticImageData } from '@/types/images';
import MinimalArrow from '../../../assets/MinimalArrow.svg'
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '@/utils/appleMotion';

// Re-use the same shapes the parent uses
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

interface MobileKanbanProps {
    columnId: ColumnKey;
    column: Column;
    toggleAccordion: (columnId: ColumnKey) => void;
    openAccordions: Record<ColumnKey, boolean>;
    handleCardClick: (item: Card) => void;
    handleDeleteStory: (storyId: string) => void;
    canDeleteStory: (storyId: string) => boolean;
}

const MobileKanban: React.FC<MobileKanbanProps> = ({
    columnId,
    column,
    toggleAccordion,
    openAccordions,
    handleCardClick,
    handleDeleteStory,
    canDeleteStory,
}) => {
    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white shadow-sm overflow-hidden transition-all duration-200">
            <button
                onClick={() => {
                    triggerHaptic('selection');
                    toggleAccordion(columnId);
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/60 active:scale-[0.99] transition-all duration-150"
            >
                <div className="flex items-center gap-x-2.5">
                    {column.icon && (
                        <Image
                            src={column.icon}
                            alt="Swim Lane Icon"
                            className="h-4 w-4 opacity-80"
                        />
                    )}
                    <span className="text-sm font-semibold text-gray-900 tracking-tight">{column.name}</span>
                    <span className="text-xs font-semibold text-gray-500 bg-black/[0.05] rounded-full px-2 py-0.5 tabular-nums">
                        {column.items.length}
                    </span>
                </div>
                <Image
                    src={MinimalArrow}
                    alt="Arrow Icon"
                    className={`h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${openAccordions[columnId] ? 'rotate-180' : ''
                        }`}
                />
            </button>

            <div
                className={`grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${openAccordions[columnId]
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                    }`}
            >
                <div className="min-h-0">
                    <div className="border-t border-black/[0.06] p-2 space-y-2 bg-gray-50/30">
                        {column.items.length === 0 ? (
                            <div className="p-4 text-xs text-gray-400 italic text-center">
                                No stories in this column
                            </div>
                        ) : (
                            column.items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        triggerHaptic('selection');
                                        handleCardClick(item);
                                    }}
                                    className="rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-xs hover:border-black/20 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1.5">
                                        <div className="font-semibold text-sm leading-snug tracking-tight text-gray-900 flex-1">
                                            {item.title}
                                        </div>
                                        {item.category && (
                                            <div className="rounded-full bg-black/[0.04] border border-black/[0.06] px-2 py-0.5 flex justify-center items-center flex-shrink-0">
                                                <span className="font-medium text-[11px] text-gray-700">
                                                    {item.category}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-black/[0.04]">
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
                                            >
                                                <Trash2 size={13} aria-hidden="true" />
                                                <span className="sr-only">Delete story</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileKanban;