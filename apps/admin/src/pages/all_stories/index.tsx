import { useContext, useState } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import AllStories from "../../components/dashboard/AllStories";
import { Story } from "../../context/KanbanContext";
import { UserContext } from "../../context/UserContext";
import env from "@/utils/env";
import apiFetch from '../../utils/api';
import toast from "react-hot-toast";

export default function AllStoriesPage() {
  const router = useRouter();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const API = `${env.backendApi}`;
  const [isLoadingStory, setIsLoadingStory] = useState(false);

  const handleBack = () => {
    router.push("/dashboard");
  };

  // ✅ UPDATED: Fetch full story before redirecting (same as dashboard)
  const handleEditStory = async (storyData: Story) => {
    // ✅ Show loading state
    setIsLoadingStory(true);

    try {
      // ✅ Fetch full story with description
      const res = await apiFetch(
        `${API}/story/fetchStoryById?storyId=${storyData.storyId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
            // ...(user?.role && { 'x-user-role': user.role }),
            // ...(user?.id && { 'x-user-id': user.id }),
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch full story');

      const response = await res.json();

      if (response.data) {
        // ✅ Save the FULL story data to sessionStorage
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("dashboard_edit_story", JSON.stringify(response.data));
        }
        router.push("/dashboard");
      } else {
        throw new Error('No story data in response');
      }
    } catch (error) {
      console.error('Fetch full story error:', error);
      toast.error('Could not load full story details. Opening with available data...');

      // ✅ Fallback: save partial data and redirect
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("dashboard_edit_story", JSON.stringify(storyData));
        }
      } catch { }
      router.push("/dashboard");
    } finally {
      setIsLoadingStory(false);
    }
  };

  // ✅ Show loading overlay when fetching full story
  if (isLoadingStory) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">Loading story details...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin", "editor", "journalist"]}>
      <AdminDashboardLayout
        onShowDashboard={() => { void router.push("/dashboard"); }}
        onShowAllStories={() => { void router.push("/all_stories"); }}
        onShowMediaLibrary={() => { void router.push("/media"); }}
      >
        <AllStories onBack={handleBack} handleEditStory={handleEditStory} />
      </AdminDashboardLayout>
    </AuthGuard>
  );
}