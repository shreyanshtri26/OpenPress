import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from '../../context/AuthGuard';
import { AdminDashboardLayout } from '../../components/SideBar/AdminDashboardLayout';
import SurveysManager from '../../components/surveys/SurveysManager';

export default function SurveysPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={['admin', 'editor']}>
      <AdminDashboardLayout
        onShowDashboard={() => router.push('/dashboard')}
        onShowAllStories={() => router.push('/all_stories')}
        onShowMediaLibrary={() => router.push('/media')}
        onShowAnalytics={() => router.push('/analytics')}
        defaultSidebarOpen={false}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <SurveysManager />
        </div>
      </AdminDashboardLayout>
    </AuthGuard>
  );
}
