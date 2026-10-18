import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import Queries from "../../components/dashboard/Queries";

export default function QueriesPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <AuthGuard allowedRoles={["admin", "editor", "journalist"]}>
      <AdminDashboardLayout
        onShowDashboard={() => { void router.push("/dashboard"); }}
        onShowAllStories={() => { void router.push("/all_stories"); }}
        onShowMediaLibrary={() => { void router.push("/media"); }}
      >
        <Queries onBack={handleBack} />
      </AdminDashboardLayout>
    </AuthGuard>
  );
}
