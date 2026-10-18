import React, { useCallback, useState, useEffect, useContext } from 'react';
import ScrollView from '@/components/ui/dx/scroll-view';
import Sortable from '@/components/ui/dx/sortable';
import toast from 'react-hot-toast';
import { Dialog } from "@headlessui/react";
import { UserContext } from '../../context/UserContext';

// Helper functions for DevExtreme Sortable
function getLists(statusArray, taskArray) {
  const tasksMap = taskArray.reduce((result, task) => {
    if (result[task.status]) {
      result[task.status].push(task);
    } else {
      result[task.status] = [task];
    }
    return result;
  }, {});
  return statusArray.map((status) => tasksMap[status] || []);
}

function removeItem(array, removeIdx) {
  return array.filter((_, idx) => idx !== removeIdx);
}

function insertItem(array, item, insertIdx) {
  const newArray = [...array];
  newArray.splice(insertIdx, 0, item);
  return newArray;
}

function reorderItem(array, fromIdx, toIdx) {
  const item = array[fromIdx];
  const result = removeItem(array, fromIdx);
  return insertItem(result, item, toIdx);
}

// Status configuration
const taskStatuses = ['Suggested', 'In_progress', 'In_review', 'Published'];
const statusTitles = {
  'Suggested': '💡 Suggested',
  'In_progress': '⏳ In Progress',
  'In_review': '🔍 In Review',
  'Published': '✅ Published'
};

// Card component
const Card = ({ story, user, handleReviewStory, timeAgo }) => {
  const isSuggested = story.status === "Suggested";
  const isAuthor = story.authorId === user?.userId;
  const isEditor = story.assignedTo === user?.userId;

  const handleCardClick = () => {
    if (!isAuthor && !isEditor) {
      toast.error('You are not Authorized for this.');
    } else if (isSuggested) {
      handleReviewStory(story, isAuthor);
    }
  };

  return (
    <div
      className="dx-card story-card"
      onClick={handleCardClick}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #6b7280',
        borderRadius: '8px',
        padding: '12px',
        margin: '8px 0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px',
        lineHeight: '1.4',
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}>
        {story.title}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        whiteSpace: 'pre-line',
        lineHeight: '1.4',
        marginBottom: '8px',
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}>
        📝 {story.description}
      </div>

      {/* Category */}
      <div style={{
        fontSize: '12px',
        color: '#374151',
        fontWeight: '500',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        📂 {story.category}
      </div>

      {/* Author */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        fontStyle: 'italic',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        👤 name
      </div>

      {/* Created Time */}
      <div style={{
        fontSize: '11px',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        🕒 {timeAgo(story.createdAt)}
      </div>
    </div>
  );
};

// List component with column-specific border colors
const List = ({ title, index, stories, user, handleReviewStory, onTaskDrop, timeAgo }) => {
  // Column-specific border colors
  const getBorderColor = (index) => {
    const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#10b981'];
    return colors[index] || '#6b7280';
  };

  return (
    <div className="list" style={{
      backgroundColor: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      flex: 1,
      gap: '20px',
      minWidth: '280px',
      maxWidth: 'none',
      boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 160px)',
      overflowY: 'auto'
    }}>
      <div className="list-title" style={{
        backgroundColor: 'transparent',
        border: 'none',
        padding: '0 0 12px 0',
        marginBottom: '12px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '600',
        color: '#6b7280'
      }}>
        {title}
      </div>
      <ScrollView
        className="scrollable-list"
        direction="vertical"
        showScrollbar="always"
        style={{ height: '100%' }}
      >
        <Sortable
          className="sortable-cards"
          group="cardsGroup"
          data={index}
          onReorder={onTaskDrop}
          onAdd={onTaskDrop}
        >
          {stories.map((story) => (
            <div
              key={story.id}
              style={{
                borderLeft: `4px solid ${getBorderColor(index)}`,
                marginLeft: '12px'
              }}
            >
              <Card
                story={story}
                user={user}
                handleReviewStory={handleReviewStory}
                timeAgo={timeAgo}
              />
            </div>
          ))}
        </Sortable>
      </ScrollView>
    </div>
  );
};

const ControlledBoard = ({ handleReviewStory, stories, handleUpdateStory }) => {
  const { user } = useContext(UserContext);
  const [statuses, setStatuses] = useState(taskStatuses);
  const [lists, setLists] = useState([]);
  const [pendingMove, setPendingMove] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const statusMap = {
    Suggested: "💡 Suggested",
    In_progress: '⏳ In Progress',
    In_review: '🔍 In Review',
    Published: '✅ Published',
  };

  // Column ID to status mapping
  const columnIdToStatus = {
    0: 'Suggested',
    1: 'In_progress',
    2: 'In_review',
    3: 'Published',
  };

  // Column ID to name mapping
  const columnIdToName = {
    0: "Suggested",
    1: "In Progress",
    2: "In Review",
    3: "Published",
  };

  // Allowed moves
  const allowedMoves = {
    0: [1], // Suggested → In Progress
    2: [3], // In Review → Published
  };

  const timeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.floor((now - created) / 1000);

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} day(s) ago`;
    return created.toLocaleDateString();
  };

  function cleanText(str = "") {
    return str
      .replace(/&nbsp;/g, " ")   // replace &nbsp; with normal space
      .replace(/<br\s*\/?>/gi, " ") // replace <br> with space
      .trim();                   // remove leading/trailing spaces
  }

  const fetchAllStories = useCallback(() => {
    try {
      if (stories && stories.length > 0) {
        // Reverse stories array and transform
        const reversedStories = stories.slice().reverse();

        const transformedStories = reversedStories.map(story => {
          let plainDescription = "";

          if (story.description) {
            if (typeof story.description === "string") {
              // old Quill HTML case
              plainDescription = cleanText(story.description.replace(/<[^>]+>/g, ""));
            } else if (story.description.blocks && Array.isArray(story.description.blocks)) {
              // new EditorJS case
              plainDescription = story.description.blocks
                .map(block => cleanText(block.data?.text || ""))
                .filter(text => text.length > 0) // drop empty blocks
                .join("\n");
            }
          }

          return {
            id: story.storyId,
            title: cleanText(story.title) || "Untitled",   // ✅ clean title also
            description: plainDescription || "No description",
            category: story.category,
            authorId: story.authorId,
            createdAt: story.createdAt,
            state: story.state,
            status: story.status || "Suggested",
            assignedTo: story.assignedTo
          };
        });

        const newLists = getLists(taskStatuses, transformedStories);
        setLists(newLists);
      } else {
        setLists(taskStatuses.map(() => []));
      }
    } catch (err) {
      console.error('Error fetching all story:', err);
      toast.error('Failed to fetch all story');
    }
  }, [stories]);

  useEffect(() => {
    fetchAllStories();
  }, [fetchAllStories]);

  // Confirmation functions
  const confirmMove = () => {
    if (!pendingMove) return;
    const { card, fromIndex, toIndex, fromData, toData } = pendingMove;

    // Update the lists
    const updatedLists = [...lists];
    const item = updatedLists[fromData][fromIndex];
    updatedLists[fromData] = removeItem(updatedLists[fromData], fromIndex);
    updatedLists[toData] = insertItem(updatedLists[toData], item, toIndex);

    // Update story status
    handleUpdateStory(card.id, card.state, columnIdToStatus[toData]);
    toast.success("Story status has been updated to In Progress");

    setLists(updatedLists);
    setPendingMove(null);
    setDialogOpen(false);
  };

  const cancelMove = () => {
    setPendingMove(null);
    setDialogOpen(false);
  };

  const onListReorder = useCallback(({ fromIndex, toIndex }) => {
    setLists((state) => reorderItem(state, fromIndex, toIndex));
    setStatuses((state) => reorderItem(state, fromIndex, toIndex));
  }, []);

  const handleCardMove = useCallback(
    ({ fromData, toData, fromIndex, toIndex }) => {
      const card = lists[fromData][fromIndex];

      if (!card) return;

      console.log("editor id", card.assignedTo, "user id", user?.userId);

      // Authorization check
      if (card.assignedTo !== user?.userId) {
        toast.error(`You are not Authorized for this.`);
        return;
      }

      console.log("Authorization passed");

      const isAllowed = allowedMoves[fromData]?.includes(toData);

      if (!isAllowed) {
        // Dynamic error message
        const fromName = columnIdToName[fromData];
        const toName = columnIdToName[toData];
        toast.error(`You cannot move from ${fromName} to ${toName}`);
        return;
      }

      // Show confirmation dialog for Suggested → In Progress
      if (fromData === 0 && toData === 1) {
        setPendingMove({ card, fromIndex, toIndex, fromData, toData });
        setDialogOpen(true);
        return;
      }

      // Direct move for other allowed transitions
      const updatedLists = [...lists];
      const item = updatedLists[fromData][fromIndex];
      updatedLists[fromData] = removeItem(updatedLists[fromData], fromIndex);
      updatedLists[toData] = insertItem(updatedLists[toData], item, toIndex);

      // Update story status
      handleUpdateStory(card.id, card.state, columnIdToStatus[toData]);

      setLists(updatedLists);
    },
    [lists, user, handleUpdateStory, allowedMoves, columnIdToName, columnIdToStatus],
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      padding: '20px',
      overflow: 'hidden',
      // border: '2px solid black'
    }}>
      <ScrollView
        className="scrollable-board"
        direction="horizontal"
        showScrollbar="always"
        style={{
          backgroundColor: '#ffffff',
          padding: 0,
          width: '100%',
          paddingBottom: '16px'
        }}
      >
        <Sortable
          className="sortable-lists"
          itemOrientation="horizontal"
          handle=".list-title"
          onReorder={onListReorder}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            overflowX: 'auto',
            overflowY: 'hidden',
            // minWidth: 'max-content',
            width: '100%'
          }}>
            {lists.map((stories, listIndex) => {
              const status = statuses[listIndex];
              const title = statusTitles[status] || status;
              return (
                <List
                  key={status}
                  title={title}
                  index={listIndex}
                  stories={stories || []}
                  user={user}
                  handleReviewStory={handleReviewStory}
                  onTaskDrop={handleCardMove}
                  timeAgo={timeAgo}
                />
              );
            })}
          </div>
        </Sortable>
      </ScrollView>

      {/* Confirmation Dialog */}
      {isDialogOpen && (
        <Dialog
          open={isDialogOpen}
          onClose={cancelMove}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Background overlay */}
          <div className="fixed inset-0 bg-black/50" aria-hidden="true"></div>

          {/* Dialog content */}
          <div className="relative z-10 bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Move Confirmation</h2>
            <p className="mb-6">
              Are you sure you want to move this story from <b>Suggested</b> to{" "}
              <b>In Progress</b>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={cancelMove}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={confirmMove}
              >
                Yes, Move
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default ControlledBoard;

