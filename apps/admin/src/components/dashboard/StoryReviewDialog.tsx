// @ts-nocheck
import React, { useRef, useState, useEffect, useContext } from 'react';
import { X, MessageCircle, CheckCircle, Clock, Plus, Edit, RotateCcw, Trash2, Pause, Check, FileText, Bell } from 'lucide-react';
import env from '@/utils/env';
import apiFetch from '../../utils/api';
// import toast from 'react-hot-toast';

// Mock toast and UserContext for demo
const toast = {
    success: (msg) => console.log('Success:', msg),
    error: (msg) => console.log('Error:', msg)
};

const UserContext = React.createContext({
    user: { id: 'editor1', token: 'token123', role: 'editor' }
});

export default function StoryReviewDialog({
    story,
    onClose = () => console.log('Dialog closed'),
    isOpen
}) {
    console.log("story >>", story);

    const { user } = useContext(UserContext);

    // ✅ NEW: Check if story is read-only (rejected)
    const isReadOnly = story?.status === 'Rejected' || story?.isReadOnly;

    const [allComments, setAllComments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Selection and comment creation states
    const [selectedText, setSelectedText] = useState('');
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [activeField, setActiveField] = useState('');
    const [selectionRange, setSelectionRange] = useState(null);
    const [commentBoxPosition, setCommentBoxPosition] = useState({ x: 0, y: 0 });
    const [editorNotesText, setEditorNotesText] = useState('');

    // Editor note states
    const [editorNote, setEditorNote] = useState(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [editNoteText, setEditNoteText] = useState('');

    // UI states
    const [activeCommentId, setActiveCommentId] = useState(null);
    const [highlightedComment, setHighlightedComment] = useState(null);
    //edit and delete states
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editText, setEditText] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);

    // Add these new state variables for hold functionality
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdUntilDate, setHoldUntilDate] = useState('');
    const [holdUntilTime, setHoldUntilTime] = useState('');
    const [holdReason, setHoldReason] = useState('');

    const [holdData, setHoldData] = useState({
        holdUntilDate: '',
        holdUntilTime: '',
        holdReason: '',
        isPrivate: false,
        reminderDate: '',
        reminderTime: '',
        reminderNote: '',
        notifyAuthor: true,
        notifyEditor: true
    });

    const commentBoxRef = useRef(null);
    const fieldRefs = {
        title: useRef(null),
        description: useRef(null),
        category: useRef(null),
        section: useRef(null),
        date: useRef(null),
        editorName: useRef(null),
    };

    const fieldDisplayNames = {
        title: "Title",
        description: "Description",
        category: "Category",
        section: "Section",
        date: "Proposed Date",
        editorName: "Editor Assignment",
        editorNotes: "Editor Notes"
    };

    // ✅ UPDATED: Disable text selection and comment creation for read-only mode
    useEffect(() => {
        if (isReadOnly) return; // Don't add event listeners if read-only

        const handleMouseUp = (event) => {
            // Don't close comment box if clicking inside it
            if (commentBoxRef.current && commentBoxRef.current.contains(event.target)) {
                return;
            }

            const selection = window.getSelection();
            const selected = selection.toString().trim();

            if (selected.length === 0) {
                if (showCommentBox && !commentBoxRef.current?.contains(event.target)) {
                    setShowCommentBox(false);
                }
                return;
            }

            // Check which field was selected
            for (const field in fieldRefs) {
                const ref = fieldRefs[field];
                if (ref.current && ref.current.contains(selection.anchorNode)) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    // Position comment box above the selection
                    setCommentBoxPosition({
                        x: rect.right + (rect.width / 2),
                        y: rect.bottom - 10
                    });

                    const fieldTextContent = ref.current.textContent || ref.current.innerText || '';
                    const beforeRange = range.cloneRange();
                    beforeRange.selectNodeContents(ref.current);
                    beforeRange.setEnd(range.startContainer, range.startOffset);
                    const startOffset = beforeRange.toString().length;
                    const endOffset = startOffset + selected.length;

                    setSelectedText(selected);
                    setActiveField(field);
                    setSelectionRange({ startOffset, endOffset });
                    setShowCommentBox(true);
                    return;
                }
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [showCommentBox, isReadOnly]);

    // ✅ UPDATED: Disable adding comments for read-only mode
    const addComment = async () => {
        if (isReadOnly || !selectedText || !activeField || !commentText) return;

        try {
            const newComment = {
                field: activeField,
                selectedText,
                commentText,
                meta: {
                    startOffset: selectionRange.startOffset,
                    endOffset: selectionRange.endOffset
                },
                createdBy: "editor",
            };

            const payload = {
                storyId: story?.storyId,
                comment: newComment
            };

            const res = await apiFetch(`${env.backendApi}/api/postCommentsDynamo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('New comment added successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });

                fetchComments();
                // Reset states
                setSelectedText('');
                setCommentText('');
                setShowCommentBox(false);
                setActiveField('');
                setSelectionRange(null);
            } else {
                const errorData = await res.json();
                toast.error(`Failed to add comment: ${errorData.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error raising a comment on a story:', err);
            toast.error(`Failed to add a comment in a story: ${err?.message}`);
        }
    };

    const cancelComment = () => {
        setSelectedText('');
        setCommentText('');
        setShowCommentBox(false);
        setActiveField('');
        setSelectionRange(null);
    };

    // Handle comment card click to highlight text
    const handleCommentClick = (comment) => {
        if (isReadOnly) return; // Disable in read-only mode

        setHighlightedComment(comment);
        setActiveCommentId(comment.id);

        const fieldRef = fieldRefs[comment.field];
        if (fieldRef?.current) {
            fieldRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            fieldRef.current.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
                if (fieldRef.current) {
                    fieldRef.current.style.boxShadow = '';
                }
            }, 2000);
        }
    };

    // Close comment box when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showCommentBox && commentBoxRef.current && !commentBoxRef.current.contains(event.target)) {
                setShowCommentBox(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCommentBox]);

    // Fetch all comments for this story on component mount
    const fetchComments = async () => {
        ``
        try {
            setLoading(true);
            const res = await apiFetch(`${env.backendApi}/api/stories/comments?storyId=${story.storyId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
            });

            if (res.ok) {
                const data = await res.json();
                const comments = data?.data || [];
                console.log("comments data of a story >>", comments);

                // Filter out resolved comments
                const pendingComments = comments.filter(c => c.status !== "resolve");

                // Separate editor notes from regular comments
                const editorNotes = pendingComments.filter(c => c.field === "editorNotes");
                const regularComments = pendingComments.filter(c => c.field !== "editorNotes");

                // Set the editor note (only the first one)
                setEditorNote(editorNotes.length > 0 ? editorNotes[0] : null);

                // Sorting logic based on field order for regular comments
                const fieldOrder = ["title", "description", "category", "section", "date", "editorName"];

                const sortedComments = regularComments.sort((a, b) => {
                    return fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field);
                });

                setAllComments(sortedComments);

            } else {
                toast.error('Failed to fetch comments');
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
            toast.error('Failed to fetch comments');
        } finally {
            setLoading(false);
        }
    };

    // ✅ UPDATED: Disable adding editor notes for read-only mode
    const addEditorNote = async () => {
        if (isReadOnly || !editorNotesText.trim()) return;

        try {
            const newComment = {
                field: "editorNotes", // Special field for editor notes
                selectedText: "", // No selected text for editor notes
                commentText: editorNotesText.trim(),
                meta: {
                    startOffset: 0,
                    endOffset: 0
                },
                createdBy: "editor",
            };

            const payload = {
                storyId: story?.storyId,
                comment: newComment
            };

            const res = await apiFetch(`${env.backendApi}/api/postCommentsDynamo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('Editor note added successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });

                fetchComments();
                // Reset editor notes text
                setEditorNotesText('');
            } else {
                const errorData = await res.json();
                toast.error(`Failed to add editor note: ${errorData.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error adding editor note:', err);
            toast.error(`Failed to add editor note: ${err?.message}`);
        }
    };

    useEffect(() => {
        fetchComments();
    }, []);

    const handleEditComment = async (commentId, newText) => {
        console.log("commentId>>", commentId);

        if (isReadOnly) return; // Disable in read-only mode

        console.log('Starting edit comment...'); // Debug log

        if (!newText.trim()) {
            toast.error('Comment text cannot be empty');
            return;
        }

        try {
            const payload = {
                storyId: story?.storyId,
                commentId,
                commentText: newText.trim()
            };

            const res = await apiFetch(`${env.backendApi}/api/editComment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                console.log('Edit successful, showing toast...'); // Debug log
                toast.success('Comment updated successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });
                setEditingCommentId(null);
                setEditText('');
                // Reset note editing states
                setIsEditingNote(false);
                setEditNoteText('');
                fetchComments();
            } else {
                const errorData = await res.json();
                toast.error(`Failed to update comment: ${errorData.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error editing comment:', err);
            toast.error(`Failed to edit comment: ${err?.message}`);
        }
    };

    // Delete Handler
    const handleDeleteComment = async () => {
        if (isReadOnly || !commentToDelete) return; // Disable in read-only mode

        console.log('Starting delete comment...');

        try {
            const res = await apiFetch(
                `${env.backendApi}/api/story/deleteComment?storyId=${story?.storyId}&commentId=${commentToDelete.commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        "Content-Type": "application/json",
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                        // ...(user?.role && { 'x-user-role': user.role }),
                        // ...(user?.id && { 'x-user-id': user.id }),
                    },
                }
            );

            const data = await res.json().catch(() => ({})); // always try to parse JSON

            if (res.ok) {
                console.log('Delete response:', data);
                toast.success('Comment deleted successfully!', {
                    duration: 3000,
                    position: 'top-right',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    },
                });
                setShowDeleteModal(false);
                setCommentToDelete(null);
                fetchComments();
            } else {
                toast.error(`Failed to delete comment: ${data.error || data.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
            toast.error(`Failed to delete comment: ${err?.message}`);
        }
    };


    // ✅ UPDATED: Render story field with disabled selection for read-only
    const renderStoryField = (field, label, isRichText = false) => {
        const value = story[field];
        const isHighlighted = highlightedComment?.field === field;

        if (isRichText) {
            return (
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">{label}</label>
                    <div
                        ref={fieldRefs[field]}
                        className={`p-3 border rounded-lg bg-gray-50 max-h-[200px] overflow-y-auto prose prose-sm max-w-none transition-all duration-200 ${isReadOnly ? 'select-none cursor-default' : 'select-text'
                            } ${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}
                        dangerouslySetInnerHTML={{ __html: value }}
                    />
                </div>
            );
        }

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">{label}</label>
                <div
                    ref={fieldRefs[field]}
                    className={`p-3 border rounded-lg bg-gray-50 transition-all duration-200 ${isReadOnly ? 'select-none cursor-default' : 'select-text'
                        } ${isHighlighted ? 'ring-2 ring-blue-400' : ''}`}
                >
                    {value}
                </div>
            </div>
        );
    };

    // State for action modals
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedCommentForAction, setSelectedCommentForAction] = useState(null);
    const [actionType, setActionType] = useState('');
    const [actionNote, setActionNote] = useState('');

    // Open action modal
    const openActionModal = (comment, action) => {
        if (isReadOnly) return; // Disable in read-only mode

        setSelectedCommentForAction(comment);
        setActionType(action);
        setShowActionModal(true);
        setActionNote('');
    };

    // Close action modal
    const closeActionModal = () => {
        setShowActionModal(false);
        setSelectedCommentForAction(null);
        setActionNote('');
        setActionType('');
    };

    // Handle comment actions (resolve, reopen, add review)
    const handleCommentAction = async (actionText = '') => {
        if (isReadOnly || !selectedCommentForAction) return; // Disable in read-only mode

        console.log("selected comment>>", selectedCommentForAction);

        console.log("selected comment for action >>", selectedCommentForAction);

        if ((actionType === 'reopen' || actionType === 'review') && !actionText.trim()) {
            toast.error('Please provide a comment');
            return;
        }

        try {
            console.log(`${actionType} comment:`, selectedCommentForAction.commentId, actionText);

            let actionData = {
                actionType: actionType === 'review' ? 'update' : actionType,
                actionText: actionNote,
                actionDate: new Date().toISOString(),
                performedBy: "editor",
                storyId: story?.storyId,
                commentId: selectedCommentForAction?.commentId
            };

            console.log("action Data>>", actionData);

            const res = await apiFetch(`${env.backendApi}/api/story/postCommentAction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
                body: JSON.stringify(actionData),
            });

            if (res.ok) {
                const data = await res.json();
                console.log("response >>", data);
                toast.success(`Comment ${actionType}d successfully!`);
                closeActionModal();
                fetchComments();
            }

        } catch (err) {
            console.error(`Error ${actionType}ing comment:`, err);
            toast.error(`Failed to ${actionType} comment`);
        }
    };

    // ✅ UPDATED: Render comment card with read-only support
    const renderCommentCard = (comment, tabType) => {
        console.log("comment>>", comment);


        const isHighlighted = highlightedComment?._id === comment?._id;
        const canManage = comment.createdBy === user?.role || comment.createdBy === user?.id;
        const isEditing = editingCommentId === comment._id;

        return (
            <div
                key={comment?._id}
                onClick={() => !isEditing && !isReadOnly && handleCommentClick(comment)}
                className={`p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 ${isEditing || isReadOnly ? 'cursor-default' : 'cursor-pointer'
                    } ${isHighlighted ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-blue-500 mt-0.5" />
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {fieldDisplayNames[comment.field]}
                        </span>
                    </div>
                    <div className="flex items-center flex-col gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            {new Date(comment.createdAt || Date.now()).toLocaleDateString()}
                            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                <span className="text-gray-400 ml-1">(edited)</span>
                            )}
                        </div>

                        {/* ✅ Hide edit/delete buttons in read-only mode */}
                        {canManage && !isEditing && !isReadOnly && (
                            <div className="flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => {
                                        setEditingCommentId(comment._id);
                                        setEditText(comment.commentText);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit comment"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        setCommentToDelete(comment);
                                        setShowDeleteModal(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete comment"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {comment.selectedText && (
                    <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-200 rounded">
                        <p className="text-xs text-gray-600 mb-1">Selected text:</p>
                        <p className="text-sm italic font-medium">"{comment.selectedText}"</p>
                    </div>
                )}

                <div className="mb-3">
                    {isEditing ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full p-2 border rounded text-sm resize-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditComment(comment.commentId, editText)}
                                    disabled={!editText.trim() || editText.trim() === comment.commentText}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                >
                                    <CheckCircle size={12} />
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setEditText('');
                                    }}
                                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                            {comment.commentText}
                        </p>
                    )}
                </div>

                {comment.actions && comment.actions.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                        <p className="font-medium text-gray-700 mb-1">Action History:</p>
                        {comment.actions.map((action, index) => (
                            <div key={index} className="text-gray-600 mb-1">
                                <span className="font-medium capitalize">{action.actionType}:</span> {action.actionText}
                                <span className="text-gray-400 ml-2">
                                    ({new Date(action.actionDate).toLocaleDateString()})
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ✅ Hide action buttons (Resolve, Update, Reopen) in read-only mode */}
                {comment.field !== "editorNotes" && !isReadOnly && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {(comment?.status === "pending" || comment?.status === "update") ? (
                            <>
                                <button
                                    onClick={() => openActionModal(comment, 'resolve')}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                >
                                    <CheckCircle size={12} />
                                    Resolve
                                </button>
                                <button
                                    onClick={() => openActionModal(comment, 'update')}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                >
                                    <Edit size={12} />
                                    Update
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => openActionModal(comment, 'reopen')}
                                className="flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                            >
                                <RotateCcw size={12} />
                                Reopen
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleStoryAction = async (status, additionalData = {}) => {
        if (isReadOnly) return; // Disable in read-only mode

        try {
            const payload = {
                status: status,
                ...additionalData
            };

            const res = await apiFetch(`${env.backendApi}/api/updateStory?storyId=${story.storyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    // ...(user?.role && { 'x-user-role': user.role }),
                    // ...(user?.id && { 'x-user-id': user.id }),
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(`Story ${status.toLowerCase().replace('_', ' ')} successfully!`);
                onClose();
            } else {
                const errorData = await res.json();
                toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${errorData.message || 'Unknown error'}`);
            }

            console.log("Story action response:", res);
        } catch (err) {
            console.error('Error updating story:', err);
            toast.error(`Failed to ${status.toLowerCase().replace('_', ' ')} story: ${err?.message}`);
        }
    };

    // Handle hold button click - opens the hold modal
    const handleHoldClick = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultDate = tomorrow.toISOString().split('T')[0];

        setHoldData({
            holdUntilDate: defaultDate,
            holdUntilTime: '09:00',
            holdReason: '',
            isPrivate: false,
            reminderDate: defaultDate,
            reminderTime: '09:00',
            reminderNote: '',
            notifyAuthor: true,
            notifyEditor: true
        });
        setShowHoldModal(true);
    };

    // Handle hold confirmation
    const handleHoldConfirm = async () => {
        if (!holdData.holdUntilDate || !holdData.holdUntilTime) {
            toast.error('Please select hold until date and time');
            return;
        }

        if (!holdData.holdReason.trim()) {
            toast.error('Please provide a reason for the hold');
            return;
        }

        const holdUntilDateTime = `${holdData.holdUntilDate}T${holdData.holdUntilTime}:00.000Z`;
        const reminderDateTime = holdData.reminderDate && holdData.reminderTime
            ? `${holdData.reminderDate}T${holdData.reminderTime}:00.000Z`
            : null;

        const payload = {
            holdUntil: holdUntilDateTime,
            holdReason: holdData.holdReason.trim(),
            isPrivateHold: holdData.isPrivate,
            reminderSettings: {
                enabled: !!reminderDateTime,
                reminderAt: reminderDateTime,
                reminderNote: holdData.reminderNote.trim(),
                notifyAuthor: holdData.notifyAuthor,
                notifyEditor: holdData.notifyEditor,
                reminderSent: false
            },
            notifications: {
                twentyFourHour: {
                    scheduledFor: new Date(new Date(holdUntilDateTime).getTime() - 24 * 60 * 60 * 1000).toISOString(),
                    sent: false
                },
                twelveHour: {
                    scheduledFor: new Date(new Date(holdUntilDateTime).getTime() - 12 * 60 * 60 * 1000).toISOString(),
                    sent: false
                }
            }
        };

        try {
            await handleStoryAction('On_hold', payload);
            setShowHoldModal(false);

            // Show success message with reminder info
            if (reminderDateTime) {
                toast.success(
                    `Story placed on hold with reminder set for ${new Date(reminderDateTime).toLocaleString()}`,
                    { duration: 5000 }
                );
            }
        } catch (error) {
            toast.error('Failed to place story on hold');
        }
    };

    // Close hold modal
    const closeHoldModal = () => {
        setShowHoldModal(false);
        setHoldUntilDate('');
        setHoldUntilTime('');
        setHoldReason('');
    };


    // ✅ UPDATED: Render editor note section with read-only support
    const renderEditorNoteSection = () => {
        const canManage = !editorNote || editorNote.createdBy === user?.role || editorNote.createdBy === user?.id;

        if (editorNote && !isEditingNote) {
            return (
                <div className="border-t pt-6 mt-6 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            <span className="font-semibold text-gray-800">Editor Notes</span>
                        </div>
                        {/* ✅ Hide edit/delete buttons in read-only mode */}
                        {canManage && !isReadOnly && (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => {
                                        setIsEditingNote(true);
                                        setEditNoteText(editorNote.commentText);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit note"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        setCommentToDelete(editorNote);
                                        setShowDeleteModal(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete note"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {editorNote.commentText}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <Clock size={12} />
                            {new Date(editorNote.createdAt || Date.now()).toLocaleDateString()}
                            {editorNote.updatedAt && editorNote.updatedAt !== editorNote.createdAt && (
                                <span className="text-gray-400 ml-1">(edited)</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (isEditingNote && !isReadOnly) {
            return (
                <div className="border-t pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={18} className="text-blue-600" />
                        <span className="font-semibold text-gray-800">Editor Notes</span>
                    </div>

                    <div className="space-y-3">
                        <textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            placeholder="Edit your overall feedback or summary here..."
                            className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            {console.log("editorNote>>", editorNote)}
                            <button
                                onClick={() => handleEditComment(editorNote.commentId, editNoteText)}
                                disabled={!editNoteText.trim() || editNoteText.trim() === editorNote.commentText}
                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            >
                                <CheckCircle size={14} />
                                Save Note
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingNote(false);
                                    setEditNoteText('');
                                }}
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // ✅ Don't show "Add new note" section for read-only mode
        if (isReadOnly) return null;

        return (
            <div className="border-t pt-6 mt-6">
                <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-blue-600" />
                    <span className="font-semibold text-gray-800">Editor Notes</span>
                </div>

                <div className="space-y-3">
                    <textarea
                        value={editorNotesText}
                        onChange={(e) => setEditorNotesText(e.target.value)}
                        placeholder="Add your overall feedback or summary here..."
                        className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                    />
                    <button
                        onClick={addEditorNote}
                        disabled={!editorNotesText.trim()}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <Plus size={14} />
                        Add Note
                    </button>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-7xl rounded-lg shadow-lg relative flex flex-col max-h-[95vh]">

                {/* Header with Read-Only Indicator */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">
                            {isReadOnly ? 'View Story (Read-Only)' : 'Review Suggested Story'}
                        </h2>
                        {isReadOnly && (
                            <p className="text-sm text-red-600 mt-1">
                                This story has been rejected and cannot be modified
                            </p>
                        )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 gap-6 p-6 overflow-hidden">
                    {/* Story Content */}
                    <div className="flex-1 pr-6 relative max-h-[520px] overflow-y-auto no-scrollbar">
                        {renderStoryField('title', 'Title')}
                        {renderStoryField('description', 'Description', true)}
                        {renderStoryField('category', 'Category')}
                        {renderStoryField('section', 'Section')}
                        {renderStoryField('date', 'Proposed Date')}
                        {renderStoryField('editorName', 'Editor Assignment')}

                        {/* Editor Notes Section */}
                        {renderEditorNoteSection()}

                        {/* ✅ Don't show floating comment box in read-only mode */}
                        {showCommentBox && !isReadOnly && (
                            <div
                                ref={commentBoxRef}
                                className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
                                style={{
                                    left: `${commentBoxPosition.x}px`,
                                    top: `${commentBoxPosition.y}px`,
                                }}
                            >
                                <div className="bg-white border rounded-lg shadow-lg p-4 max-w-sm">
                                    <div className="text-sm text-gray-600 mb-3">
                                        <div className="font-medium">Commenting on {fieldDisplayNames[activeField]}:</div>
                                        <div className="italic text-gray-500 mt-1">"{selectedText}"</div>
                                    </div>
                                    <textarea
                                        placeholder="Enter your comment..."
                                        className="w-full border rounded p-2 text-sm resize-none"
                                        rows={3}
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={addComment}
                                            disabled={!commentText.trim()}
                                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                                        >
                                            <Plus size={12} />
                                            Add Comment
                                        </button>
                                        <button
                                            onClick={cancelComment}
                                            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {/* Arrow pointer */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comments Sidebar */}
                    <div className="w-96 border-l pl-6">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                            Comments {isReadOnly && <span className="text-sm text-gray-500">(Read-Only)</span>}
                        </h3>

                        {/* Comments List */}
                        <div className="space-y-4 max-h-[500px] overflow-y-auto overflow-x-hidden no-scrollbar">
                            {loading ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-500">Loading comments...</p>
                                </div>
                            ) : (
                                <>
                                    {allComments.length === 0 ? (
                                        <div className="text-center py-8">
                                            <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                                            <p className="text-sm text-gray-500">No comments!</p>
                                        </div>
                                    ) : (
                                        allComments.map((comment) => renderCommentCard(comment))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ✅ UPDATED: Bottom Action Buttons - Hide for read-only */}
                {!isReadOnly && (
                    <div className="border-t px-6 py-4 bg-gray-50">
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => handleStoryAction('Rejected')}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                            >
                                <X size={16} />
                                Reject
                            </button>
                            <button
                                onClick={handleHoldClick}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-yellow-50 transition-colors"
                            >
                                <Pause size={16} />
                                Hold
                            </button>
                            <button
                                onClick={() => handleStoryAction('In_progress')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                <Check size={16} />
                                Accept
                            </button>
                        </div>
                    </div>
                )}



                {/* Action Modal - Only show if not read-only */}
                {showActionModal && !isReadOnly && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-60">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <h3 className="text-lg font-semibold mb-4 capitalize">
                                {actionType === 'reopen' ? 'Reopen Comment' :
                                    actionType === 'review' ? 'Add Review' :
                                        actionType === 'resolve' ? 'Resolve Comment' : 'Action'}
                            </h3>

                            {/* Comment Details */}
                            <div className="mb-4 p-3 bg-gray-50 rounded">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Field:</strong> {fieldDisplayNames[selectedCommentForAction?.field]}
                                </p>
                                {selectedCommentForAction?.selectedText && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        <strong>Selected Text:</strong> "{selectedCommentForAction.selectedText}"
                                    </p>
                                )}
                                <p className="text-sm text-gray-600">
                                    <strong>Original Comment:</strong> {selectedCommentForAction?.commentText}
                                </p>
                            </div>

                            {/* Show Action History if exists */}
                            {selectedCommentForAction?.actions && selectedCommentForAction.actions.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 rounded">
                                    <h4 className="text-sm font-semibold mb-2 text-blue-800">Action History:</h4>
                                    <div className="text-sm space-y-1">
                                        {selectedCommentForAction.actions.map((action, index) => (
                                            <div key={index} className="text-blue-700">
                                                <span className="font-medium capitalize">{action.actionType}:</span> {action.actionText}
                                                <span className="text-blue-500 ml-2 text-xs">
                                                    ({new Date(action.actionDate).toLocaleDateString()})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Note */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">
                                    {actionType === 'reopen' && 'Why are you reopening this comment?'}
                                    {actionType === 'review' && 'Add your review comment:'}
                                    {actionType === 'resolve' && 'How was this resolved?'}
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    placeholder={`Describe the ${actionType} action...`}
                                    className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={closeActionModal}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleCommentAction(actionNote)}
                                    className={`px-4 py-2 text-white rounded capitalize ${actionType === 'reopen' ? 'bg-orange-600 hover:bg-orange-700' :
                                        actionType === 'review' ? 'bg-blue-600 hover:bg-blue-700' :
                                            'bg-green-600 hover:bg-green-700'
                                        }`}
                                    disabled={!actionNote.trim()}
                                >
                                    {actionType === 'reopen' ? 'Reopen Comment' :
                                        actionType === 'review' ? 'Add Review' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal - Only show if not read-only */}
                {showDeleteModal && commentToDelete && !isReadOnly && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-70">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Comment</h3>

                            <div className="mb-4 p-3 bg-gray-50 rounded">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Field:</strong> {fieldDisplayNames[commentToDelete?.field]}
                                </p>
                                {commentToDelete?.selectedText && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        <strong>Selected Text:</strong> "{commentToDelete.selectedText}"
                                    </p>
                                )}
                                <p className="text-sm text-gray-600">
                                    <strong>Comment:</strong> {commentToDelete?.commentText}
                                </p>
                            </div>

                            <p className="text-sm text-gray-700 mb-4">
                                Are you sure you want to delete this comment? This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCommentToDelete(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteComment}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Delete Comment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            {/* Hold Modal - Only show if not read-only */}
            {/* Enhanced Hold Modal */}
            {showHoldModal && !isReadOnly && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-70">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4 text-yellow-600 flex items-center gap-2">
                            <Pause size={20} />
                            Hold Story with Reminder
                        </h3>

                        <div className="space-y-6">
                            {/* Hold Until Section */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="font-medium text-gray-800 mb-3">Hold Duration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hold Until Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={holdData.holdUntilDate}
                                            onChange={(e) => setHoldData(prev => ({ ...prev, holdUntilDate: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hold Until Time *
                                        </label>
                                        <input
                                            type="time"
                                            value={holdData.holdUntilTime}
                                            onChange={(e) => setHoldData(prev => ({ ...prev, holdUntilTime: e.target.value }))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Hold Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Hold *
                                </label>
                                <textarea
                                    value={holdData.holdReason}
                                    onChange={(e) => setHoldData(prev => ({ ...prev, holdReason: e.target.value }))}
                                    placeholder="Explain why this story is being put on hold..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 resize-none"
                                    rows={3}
                                    required
                                />
                            </div>

                            {/* Privacy Setting */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="privateHold"
                                        checked={holdData.isPrivate}
                                        onChange={(e) => setHoldData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                                        className="mt-1 w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    />
                                    <div>
                                        <label htmlFor="privateHold" className="font-medium text-gray-800">
                                            Private Hold (Editor Only)
                                        </label>
                                        <p className="text-sm text-gray-600 mt-1">
                                            When enabled, only editors can see the hold reason. Author will see "Story under editorial review."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Reminder Settings */}
                            <div className="border rounded-lg p-4 bg-blue-50">
                                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                    <Bell size={16} />
                                    Reminder Settings (Optional)
                                </h4>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Reminder Date
                                        </label>
                                        <input
                                            type="date"
                                            value={holdData.reminderDate}
                                            onChange={(e) => setHoldData(prev => ({ ...prev, reminderDate: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            max={holdData.holdUntilDate}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Reminder Time
                                        </label>
                                        <input
                                            type="time"
                                            value={holdData.reminderTime}
                                            onChange={(e) => setHoldData(prev => ({ ...prev, reminderTime: e.target.value }))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Reminder Note
                                    </label>
                                    <textarea
                                        value={holdData.reminderNote}
                                        onChange={(e) => setHoldData(prev => ({ ...prev, reminderNote: e.target.value }))}
                                        placeholder="Additional notes for the reminder (optional)..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={2}
                                    />
                                </div>

                                {/* Notification Recipients */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Send reminder notifications to:</p>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={holdData.notifyEditor}
                                                onChange={(e) => setHoldData(prev => ({ ...prev, notifyEditor: e.target.checked }))}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">Editor (You)</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={holdData.notifyAuthor}
                                                onChange={(e) => setHoldData(prev => ({ ...prev, notifyAuthor: e.target.checked }))}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">Author</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            {holdData.holdUntilDate && holdData.holdUntilTime && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h4 className="font-medium text-yellow-800 mb-2">Hold Summary:</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• Story will be on hold until: <strong>{new Date(`${holdData.holdUntilDate}T${holdData.holdUntilTime}`).toLocaleString()}</strong></li>
                                        <li>• Visibility: <strong>{holdData.isPrivate ? 'Private (Editor Only)' : 'Visible to Author'}</strong></li>
                                        {holdData.reminderDate && holdData.reminderTime && (
                                            <li>• Reminder set for: <strong>{new Date(`${holdData.reminderDate}T${holdData.reminderTime}`).toLocaleString()}</strong></li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setShowHoldModal(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHoldConfirm}
                                disabled={!holdData.holdUntilDate || !holdData.holdUntilTime || !holdData.holdReason.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                <Pause size={16} />
                                Confirm Hold
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}

