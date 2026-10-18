import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import Signals from "../../components/dashboard/Signals";

export default function SignalsPage() {
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
        <Signals onBack={handleBack} />
      </AdminDashboardLayout>
    </AuthGuard>
  );
}
