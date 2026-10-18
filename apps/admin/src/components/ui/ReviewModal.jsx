import { useState, useEffect } from 'react';

function ReviewModal({ isOpen, onClose, onSubmit, article, isSubmitting }) {
  const [remarks, setRemarks] = useState('');
  const [selectedAction, setSelectedAction] = useState('submit-for-review');

  useEffect(() => {
    if (isOpen && article) {
      setRemarks(article.remarks || '');
      setSelectedAction('submit-for-review');
    }
  }, [isOpen, article]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert('Please add remarks before submitting.');
      return;
    }
    onSubmit(remarks, selectedAction , article._id);
  };

  const handleClose = () => {
    setRemarks('');
    setSelectedAction('submit-for-review');
    onClose();
  };

  if (!isOpen) return null;

  const actionOptions = [
    { value: 'submit-for-review', label: 'Submit for Review (Send back to journalist)', color: 'yellow' },
    { value: 'approve', label: 'Approve Article', color: 'green' },
    { value: 'reject', label: 'Reject Article', color: 'red' }
  ];

  const getButtonColor = () => {
    switch(selectedAction) {
      case 'approve': return 'bg-green-500 hover:bg-green-600';
      case 'reject': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-yellow-500 hover:bg-yellow-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Review Article</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {article && (
          <div className="mb-4">
            <h3 className="font-medium text-gray-700">Article: {article.title}</h3>
            <p className="text-sm text-gray-500">By: {article.author_name || 'Unknown Author'}</p>
            
            {article.reviewedBy && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="text-yellow-700">
                  Previously reviewed by: {article.reviewedBy}
                </p>
                <p className="text-yellow-600 text-xs">
                  on {new Date(article.reviewedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Action *
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {actionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
              Remarks/Comments *
            </label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              rows="4"
              placeholder={
                selectedAction === 'submit-for-review' 
                  ? "Provide feedback for the journalist to revise the article..."
                  : selectedAction === 'approve'
                  ? "Add any final comments (optional)..."
                  : "Explain why this article is being rejected..."
              }
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
            {selectedAction === 'submit-for-review' && (
              <p className="text-gray-700">
                📝 This will send the article back to the journalist with your remarks for revision.
              </p>
            )}
            {selectedAction === 'approve' && (
              <p className="text-green-700">
                ✅ This will publish the article immediately.
              </p>
            )}
            {selectedAction === 'reject' && (
              <p className="text-red-700">
                ❌ This will reject the article.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${getButtonColor()}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 
               selectedAction === 'submit-for-review' ? 'Submit for Review' :
               selectedAction === 'approve' ? 'Approve Article' : 'Reject Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
