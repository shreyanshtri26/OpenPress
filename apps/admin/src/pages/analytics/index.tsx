import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import AnalyticsDashboard from "../../components/dashboard/AnalyticsDashboard";

export default function AnalyticsPage() {
    const router = useRouter();

    const handleBack = () => {
        router.push("/dashboard");
    };

    return (
        <AuthGuard allowedRoles={["admin", "editor", "journalist"]}>
            <AdminDashboardLayout
                onShowDashboard={() => router.push("/dashboard")}
                onShowAllStories={() => router.push("/all_stories")}
                onShowMediaLibrary={() => router.push("/media")}
                onShowAnalytics={() => router.push("/analytics")}
            >
                <AnalyticsDashboard onBack={handleBack} />
            </AdminDashboardLayout>
        </AuthGuard>
    );
}
