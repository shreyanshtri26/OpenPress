// src/components/KanbanBoard/KanbanBoard.tsx

import React, { useState, useRef, useEffect, useContext } from 'react';
import Image from '@/components/common/Image';
import type { StaticImageData } from '@/types/images';
import { useKanbanContext, Story } from '../../context/KanbanContext';
import { UserContext, RolePermissions } from '../../context/UserContext';
import toast from 'react-hot-toast';
import Bulb2 from '../../assets/Bulb2.svg';
import FastForward from '../../assets/FastForward.svg';
import Book from '../../assets/Book.svg';
import Web from '../../assets/Web.svg';
import DesktopKanban from '../common/Kanban/DesktopKanban';
import MobileKanban from '../common/Kanban/MobileKanban';
import { checkStoryPermission } from '../../utils/storyPermissions';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
import {
  removeStoryFromCache,
  upsertStoryInCache,
} from '../../utils/storiesCache';

// --- Type Definitions ---
interface Card {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  authorName: string;
  assignedToName: string[];
}
type ColumnKey = 'ideas' | 'inProgress' | 'inReview' | 'published';

interface Column {
  name: string;
  icon: StaticImageData;
  items: Card[];
}

interface UpdateStory {
  storyId: string;
  state: string;
  status: string;
}

type Columns = Record<ColumnKey, Column>;
interface DraggedItemInfo {
  item: Card;
  sourceColumnId: ColumnKey;
}
interface DragOverInfo {
  columnId: ColumnKey;
  index: number;
}

// Props for the component, including the click handler
interface KanbanBoardProps {
  handleEditStoryClick: (storyData: Story) => void;
}

// --- Helper Function ---
const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} MIN`;
  if (hours < 24) return `${hours} HOUR${hours > 1 ? 'S' : ''}`;
  return `${days} DAY${days > 1 ? 'S' : ''}`;
};

// --- Main Component ---
const createEmptyColumns = (): Columns => ({
  ideas: { name: 'Ideas', icon: Bulb2, items: [] },
  inProgress: { name: 'In Progress', icon: FastForward, items: [] },
  inReview: { name: 'In Review', icon: Book, items: [] },
  published: { name: 'Ready To Publish', icon: Web, items: [] },
});

// Note: Role-based move restrictions removed in favor of permission-based system
// Super users can move anywhere, others need "Decide" permission and can only move to next swimlane

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  handleEditStoryClick,
}) => {
  const { stories, setStories } = useKanbanContext();
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const isUserLoading = userContext?.loading ?? false;
  const permissions = userContext?.permissions ?? null;
  const [columns, setColumns] = useState<Columns>(createEmptyColumns());
  const [openAccordions, setOpenAccordions] = useState<Record<ColumnKey, boolean>>({
    ideas: true,
    inProgress: true,
    inReview: true,
    published: true,
  });
  const [draggedItemInfo, setDraggedItemInfo] =
    useState<DraggedItemInfo | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);
  const scrollContainerRefs = useRef<
    Record<ColumnKey, HTMLDivElement | null>
  >({
    ideas: null,
    inProgress: null,
    inReview: null,
    published: null,
  });
  // Sort stories by updatedAt descending (newest first)
  const sortedStories = [...stories].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return dateB - dateA; // descending order
  });
  const API = `${env.backendApi}`;

  useEffect(() => {
    const newColumns = createEmptyColumns();

    const getColumnIdFromStatus = (status: string): ColumnKey | null => {
      switch (status?.toLowerCase().replace(/ /g, '_')) {
        // case 'draft':
        // case 'ideas':
        case 'ideas':   // status
          return 'ideas';  // column Id
        case 'in_progress':
          return 'inProgress';
        case 'in_review':
        case 'on_hold':
          return 'inReview';
        case 'ready_to_publish':
          return 'published';
        default:
          return null;
      }
    };

    sortedStories.forEach((story) => {
      const columnId = getColumnIdFromStatus(story.status);
      if (columnId && newColumns[columnId]) {
        newColumns[columnId].items.push({
          id: story.storyId,
          title: story.title?.replace(/&nbsp;/g, ' ').trim() || 'Untitled',
          category: story.category || story.Category || story.Section || story.section || '',
          timeAgo: formatTimeAgo(story.updatedAt || story.createdAt),
          authorName: story.authorName || 'Unknown Author',
          assignedToName: Array.isArray(story.assignedToName)
            ? story.assignedToName
            : story.assignedToName
              ? [story.assignedToName]
              : [],

        });
      }
    });

    setColumns(newColumns);
  }, [stories]);

  const getStatusFromColumnId = (columnId: ColumnKey): string | null => {
    const statusMap: Record<ColumnKey, string> = {
      ideas: 'ideas',
      inProgress: 'in_progress',
      inReview: 'in_review',
      published: 'ready_to_publish',
    };
    return statusMap[columnId] || null;
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item: Card,
    sourceColumnId: ColumnKey,
  ) => {
    setDraggedItemInfo({ item, sourceColumnId });
    const target = e.currentTarget;

    const dragGhost = target.cloneNode(true) as HTMLElement;
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-1000px';
    dragGhost.style.width = `${target.offsetWidth}px`;
    dragGhost.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 0, 0);
    e.stopPropagation();

    setTimeout(() => {
      target.classList.add('dragging');
      document.body.removeChild(dragGhost);
    }, 0);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    destColumnId: ColumnKey,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItemInfo) return;
    const scrollContainer = scrollContainerRefs.current[destColumnId];
    if (!scrollContainer) return;

    const draggables = Array.from(
      scrollContainer.querySelectorAll<HTMLElement>(
        '[draggable="true"]:not(.dragging)',
      ),
    );
    let newIndex = draggables.length;

    for (let i = 0; i < draggables.length; i++) {
      const card = draggables[i];
      const box = card.getBoundingClientRect();
      if (e.clientY < box.top + box.height / 2) {
        newIndex = i;
        break;
      }
    }

    if (draggables.length === 0) newIndex = 0;

    if (
      dragOverInfo?.columnId !== destColumnId ||
      dragOverInfo?.index !== newIndex
    ) {
      setDragOverInfo({ columnId: destColumnId, index: newIndex });
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    e.stopPropagation();
    setDraggedItemInfo(null);
    setDragOverInfo(null);
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    destColumnId: ColumnKey,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItemInfo || !dragOverInfo) {
      setDraggedItemInfo(null);
      setDragOverInfo(null);
      return;
    }

    const { item: droppedItem, sourceColumnId } = draggedItemInfo;
    const originalColumns: Columns = {
      ideas: { ...columns.ideas, items: [...columns.ideas.items] },
      inProgress: {
        ...columns.inProgress,
        items: [...columns.inProgress.items],
      },
      inReview: { ...columns.inReview, items: [...columns.inReview.items] },
      published: { ...columns.published, items: [...columns.published.items] },
    };

    if (sourceColumnId === destColumnId) {
      setDraggedItemInfo(null);
      setDragOverInfo(null);
      return;
    }

    // --- PERMISSION CHECKS ---
    const storyData = stories.find((s) => s.storyId === droppedItem.id);
    if (!storyData) {
      toast.error('Could not find story data.');
      return;
    }

    const userRole = user?.role?.toLowerCase();
    const isSuperUser = userRole === 'super user';

    // Define the sequential order of swimlanes
    const swimlaneOrder: ColumnKey[] = ['ideas', 'inProgress', 'inReview', 'published'];

    // Get the next allowed swimlane for non-super users
    const getNextSwimlane = (currentColumn: ColumnKey): ColumnKey | null => {
      const currentIndex = swimlaneOrder.indexOf(currentColumn);
      if (currentIndex === -1 || currentIndex === swimlaneOrder.length - 1) {
        return null; // No next swimlane
      }
      return swimlaneOrder[currentIndex + 1];
    };

    // Map column IDs to status strings for permission checking
    const columnToStatusMap: Record<ColumnKey, string> = {
      ideas: 'ideas',
      inProgress: 'in_progress',
      inReview: 'in_review',
      published: 'ready_to_publish',
    };

    if (isSuperUser) {
      // Super user can move cards to any swimlane - no restrictions
    } else {
      // For non-super users:
      // 1. Check if user has "Decide" permission for the source swimlane
      const sourceStatus = columnToStatusMap[sourceColumnId];
      const hasDecidePermission = checkStoryPermission(
        permissions,
        sourceStatus,
        'Decide',
        user?.role
      );

      if (!hasDecidePermission) {
        toast.error('You do not have permission to move cards from this swimlane.');
        setDraggedItemInfo(null);
        setDragOverInfo(null);
        return;
      }

      // 2. Check if destination is the next sequential swimlane
      const nextAllowedSwimlane = getNextSwimlane(sourceColumnId);
      if (destColumnId !== nextAllowedSwimlane) {
        const nextSwimlaneName = nextAllowedSwimlane ? columns[nextAllowedSwimlane]?.name : 'none';
        toast.error(`You can only move cards to the next swimlane: ${nextSwimlaneName}`);
        setDraggedItemInfo(null);
        setDragOverInfo(null);
        return;
      }
    }
    // --- END PERMISSION CHECKS ---

    // Optimistically update UI
    setColumns((currentColumns) => {
      const sourceColumn = currentColumns[sourceColumnId];
      const destinationColumn = currentColumns[destColumnId];
      if (!sourceColumn || !destinationColumn) {
        return currentColumns;
      }

      const sourceItems = [...sourceColumn.items];
      const destinationItems = [...destinationColumn.items];
      const sourceIndex = sourceItems.findIndex((item) => item.id === droppedItem.id);

      if (sourceIndex > -1) {
        const [removedItem] = sourceItems.splice(sourceIndex, 1);
        destinationItems.splice(dragOverInfo.index, 0, removedItem);
      }

      return {
        ...currentColumns,
        [sourceColumnId]: { ...sourceColumn, items: sourceItems },
        [destColumnId]: { ...destinationColumn, items: destinationItems },
      };
    });

    setDraggedItemInfo(null);
    setDragOverInfo(null);

    const newStatus = getStatusFromColumnId(destColumnId);
    if (!newStatus) {
      toast.error('Cannot update to this status.');
      setColumns(originalColumns); // Revert UI
      return;
    }

    try {
      const response = await apiFetch(
        `${API}/api/updateStory?storyId=${droppedItem.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update story status on the server.');
      }

      const updatedAtIso = new Date().toISOString();

      // Update central state
      setStories((currentStories) =>
        currentStories.map((story) =>
          story.storyId === droppedItem.id
            ? {
              ...story,
              status: newStatus,
              updatedAt: updatedAtIso,
            }
            : story,
        ),
      );

      // Keep the dashboard's stories cache in sync so re-entering the
      // Kanban view does not snap the card back to its old swimlane.
      upsertStoryInCache({
        storyId: droppedItem.id,
        status: newStatus,
        updatedAt: updatedAtIso,
      });

      const destinationColumnName =
        columns[destColumnId]?.name ?? destColumnId;
      toast.success(`Story moved to "${destinationColumnName}"`);
    } catch (error) {
      console.error('API Error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update story.';
      toast.error(`Failed to update story. ${message}`.trim());
      setColumns(originalColumns); // Rollback on API error
    }
  };

  const toggleAccordion = (columnId: ColumnKey) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const handleUpdateStory = async ({ storyId, state, status }: UpdateStory) => {

    try {
      await apiFetch(
        `${env.backendApi}/api/updateStory?storyId=${storyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
          body: JSON.stringify({ state, status }),
        },
      );
    } catch (err) {
    }
  };


  const handleCardClick = (item: Card) => {
    const fullStoryData = stories.find((story) => story.storyId === item.id);

    if (!fullStoryData) {
      console.error('Story data not found for ID:', item.id);
      toast.error('Could not load story data');
      return;
    }

    // ✨ NEW: Check "Open" permission based on story status and user role
    const hasOpenPermission = checkStoryPermission(
      permissions,
      fullStoryData.status,
      'Open',
      user?.role
    );

    if (user?.role !== 'super user' && !hasOpenPermission) {
      toast.error('You do not have permission to open this story');
      return;
    }

    // Update story state if assigned to user and not opened
    if (fullStoryData.assignedTo === user?.userId && fullStoryData.state === "Not_opened") {
      handleUpdateStory({
        storyId: fullStoryData.storyId,
        state: "Opened",
        status: fullStoryData.status,
      });
    }

    // ✅ Allow opening the story
    handleEditStoryClick(fullStoryData);
  };

  const canDeleteStory = (storyId: string): boolean => {
    const story = stories.find((item) => item.storyId === storyId);
    if (!story || !user) return false;

    const isSuperUser = user.role?.toLowerCase() === 'super user';
    const isAssignedEditor = story.assignedTo === user.userId;
    const isAssignedReporter = story.authorId === user.userId;

    return isSuperUser || isAssignedEditor || isAssignedReporter;
  };

  const handleDeleteStory = async (storyId: string) => {
    const story = stories.find((item) => item.storyId === storyId);

    if (!story) {
      toast.error('Story not found.');
      return;
    }

    if (!canDeleteStory(storyId)) {
      toast.error('Only the assigned editor, assigned reporter, or super user can delete this story.');
      return;
    }

    const isConfirmed = window.confirm('Are you sure you want to delete this story?');
    if (!isConfirmed) return;

    try {
      const response = await apiFetch(
        `${env.backendApi}/api/deleteStoryPermanent?storyId=${encodeURIComponent(storyId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        },
      );

      let data: { message?: string } = {};
      try {
        data = await response.json();
      } catch (error) {
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete story.');
      }

      setStories((currentStories) =>
        currentStories.filter((currentStory) => currentStory.storyId !== storyId),
      );

      removeStoryFromCache(storyId);

      toast.success(data?.message || 'Story deleted successfully.');
    } catch (error) {
      console.error('Delete story error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete story.';
      toast.error(message);
    }
  };




  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
        Loading board...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
        Please log in to view the Kanban board.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .dragging { opacity: 0.4; }
        .kanban-scroll-container { scroll-behavior: smooth; overscroll-behavior: contain; }
        .kanban-scroll-container::-webkit-scrollbar { width: 8px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); border-radius: 4px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.3); }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 justify-around gap-4 font-sans p-[1.25rem] min-h-0 max-h-full overflow-hidden ">
        {(Object.entries(columns) as [ColumnKey, Column][]).map(
          ([columnId, column]) => (
            <DesktopKanban
              key={columnId}
              columnId={columnId}
              column={column}
              scrollContainerRefs={scrollContainerRefs}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleCardClick={handleCardClick}
              dragOverInfo={dragOverInfo}
              handleDeleteStory={handleDeleteStory}
              canDeleteStory={canDeleteStory}
            />
          ))}
      </div>

      {/* Mobile Layout - Accordion */}
      <div className="md:hidden flex flex-col font-sans p-4 space-y-4 overflow-y-auto flex-1 no-scrollbar">
        {(Object.entries(columns) as [ColumnKey, Column][]).map(
          ([columnId, column]) => (
            <MobileKanban
              key={columnId}
              columnId={columnId}
              column={column}
              toggleAccordion={toggleAccordion}
              openAccordions={openAccordions}
              handleCardClick={handleCardClick}
              handleDeleteStory={handleDeleteStory}
              canDeleteStory={canDeleteStory}
            />
          ))}
      </div>
    </>
  );
};