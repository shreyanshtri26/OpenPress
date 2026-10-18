import { useState, useEffect } from 'react';
import env from '@/utils/env';
import apiFetch from '../../utils/api';

export default function FeedbackViewer({ articleId, feedback = [], user }) {
  const [remarks, setRemarks] = useState('');
  const [article, setArticle] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (articleId) {
      fetchRemarks();
      fetchArticle();
    }
  }, [articleId]);

  const fetchRemarks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Replaced hardcoded localhost with env.backendApi for consistency
      const response = await apiFetch(`${env.backendApi}/api/articles/${articleId}/onlyremarks`, {
        headers: {
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          ...(user?.role && { 'x-user-role': user.role }),
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setRemarks(data.remarks);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch remarks:', err);
    } finally {
      setLoading(false);
    }
  };

  // const fetchArticle = async () => {
  //   try {
  //     // Fixed: Use GET request to fetch article data (not the edit endpoint)
  //     const response = await apiFetch(`http://localhost:4000/api/articles/${articleId}`, {
  //       headers: {
  //         ...(user?.token && { Authorization: `Bearer ${user.token}` }),
  //         ...(user?.role && { 'x-user-role': user.role }),
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Error: ${response.status}`);
  //     }

  //     const data = await response.json();
  //     setArticle(data);
  //     setEditedContent(data.content);
  //     setEditedTitle(data.title);
  //   } catch (err) {
  //     setError(err.message);
  //     console.error('Failed to fetch article:', err);
  //   }
  // };

  const fetchArticle = async () => {
    try {
      const response = await apiFetch(`${env.backendApi}/api/articles/getById`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
        },
        body: JSON.stringify({ id: articleId }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setArticle(data);
      setEditedContent(data.content);
      setEditedTitle(data.title);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch article:', err);
    }
  };


  const updateArticle = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await apiFetch(`${env.backendApi}/api/articles/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
          // ...(user?.id && { 'x-user-id': user.id }),
        },
        body: JSON.stringify({
          id: articleId,
          title: editedTitle,
          content: editedContent,
          status: 'pending', // ✅ Always reset to pending on edit
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setArticle(prev => ({ ...prev, title: editedTitle, content: editedContent, status: 'pending' }));
      setIsEditing(false);
      console.log('Article updated successfully');
    } catch (err) {
      setError(err.message);
      console.error('Failed to update article:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTitle(article?.title || '');
    setEditedContent(article?.content || '');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(article?.title || '');
    setEditedContent(article?.content || '');
    setError(null);
  };

  const handleSave = () => {
    updateArticle();
  };

  if (feedback.length === 0 && !remarks && !loading && !article) {
    return <p className="text-gray-500">No feedback yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Display loading state */}
      {loading && (
        <div className="border p-3 rounded bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </div>
      )}

      {/* Display error state */}
      {error && (
        <div className="border p-3 rounded bg-red-50">
          <p className="text-red-500">Error: {error}</p>
        </div>
      )}

      {/* Display remarks (read-only) */}
      {remarks && !loading && (
        <div className="border p-3 rounded bg-yellow-50">
          <h3 className="font-semibold text-yellow-800 mb-2">Editor Remarks:</h3>
          <p className="text-yellow-700 whitespace-pre-wrap">{remarks}</p>
        </div>
      )}

      {/* Display article content for editing */}
      {article && !loading && (
        <div className="border p-3 rounded bg-white shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-800">Article Content:</h3>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={saving}
              >
                Edit Article
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              {/* Title Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Article title..."
                />
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded resize-vertical min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Article content..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-800">Title:</h4>
                <p className="text-gray-700">{article.title}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Content:</h4>
                <div className="text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-200 p-2 rounded">
                  {article.content}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Status: <span className="capitalize font-medium">{article.status}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display existing feedback */}
      {feedback.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Feedback:</h3>
          <ul className="space-y-2">
            {feedback.map((fb, idx) => (
              <li key={idx} className="border p-2 rounded bg-gray-50">
                {fb.body}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
