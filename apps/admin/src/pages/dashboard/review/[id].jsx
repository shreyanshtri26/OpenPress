import { useRouter } from '@/hooks/useRouter';
import { useEffect, useState, useContext } from 'react';
import env from '@/utils/env';
import apiFetch from '../../../utils/api';
import { UserContext } from '../../../context/UserContext';
import {
  AdminDashboardLayout,
  AdminMobileSidebarToggle,
} from '../../../components/SideBar/AdminDashboardLayout';
import FeedbackViewer from '../../../components/ui/FeedbackViewer';
import ArticleEditor from '../../../components/ui/ArticleEditor';
import toast from 'react-hot-toast';

function StoryReviewPage() {
  const { id } = useRouter().query;
  const { user } = useContext(UserContext);
  const API =
    `${env.backendApi}`;

  const [article, setArticle] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchArticle = async () => {
      try {
        const res = await apiFetch(`${API}/api/articles/getById`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
          },
          body: JSON.stringify({ id }),
        });

        if (res.ok) {
          const data = await res.json();
          setArticle(data);
          setFeedback(data.feedback || []);
        } else {
          toast.error('Failed to fetch article details.');
        }
      } catch (err) {
        console.error('Failed to fetch article', err);
        toast.error('An error occurred while fetching the article.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, user, API]);

  const handleSave = async (data) => {
    try {
      await apiFetch(`${API}/api/articles/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          // ...(user?.role && { 'x-user-role': user.role }),
        },
        body: JSON.stringify({ id, ...data }),
      });
      toast.success('Review saved successfully!');
    } catch (err) {
      console.error('Error saving review', err);
      toast.error('Failed to save review.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          Loading...
        </div>
      );
    }

    return (
      <div className="flex-1 p-4 md:p-6">
        <AdminMobileSidebarToggle />
        <h1 className="text-xl font-semibold mb-4">Review Article</h1>

        {article?.remarks && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-medium text-yellow-800 mb-2">
              Current Review Remarks:
            </h3>
            <p className="text-yellow-700">{article.remarks}</p>
            {article.reviewedBy && (
              <p className="text-sm text-yellow-600 mt-2">
                Reviewed by: {article.reviewedBy} on{' '}
                {new Date(article.reviewedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {article && <ArticleEditor initialData={article} onSave={handleSave} />}

        <div className="mt-6">
          <h2 className="font-semibold mb-2">Feedback History</h2>
          <FeedbackViewer feedback={feedback} />
        </div>
      </div>
    );
  };

  return <AdminDashboardLayout>{renderContent()}</AdminDashboardLayout>;
}

// Set permissions for the AuthGuard in _app.js
StoryReviewPage.auth = {
  roles: ['admin', 'editor', 'journalist'], // Allows roles to view the review page
};

export default StoryReviewPage;
