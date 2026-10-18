
import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import MediaLibrary from "../../components/dashboard/MediaLibrary";

export default function LibraryPage() {
  const router = useRouter();

  return (
    <AuthGuard allowedRoles={["admin", "editor", "journalist"]}>
      <AdminDashboardLayout
        onShowDashboard={() => router.push("/dashboard")}
        onShowAllStories={() => router.push("/all_stories")}
        onShowMediaLibrary={() => router.push("/media")}
      >
        <MediaLibrary onBack={() => router.push("/dashboard")} />
      </AdminDashboardLayout>
    </AuthGuard>
  );
}
