import { useRouter } from '@/hooks/useRouter';
import { AuthGuard } from "../../context/AuthGuard";
import { AdminDashboardLayout } from "../../components/SideBar/AdminDashboardLayout";
import ContactInquiries from "../../components/dashboard/ContactInquiries";

export default function ContactInquiriesPage() {
    const router = useRouter();

    return (
        <AuthGuard allowedRoles={["admin", "editor"]}>
            <AdminDashboardLayout
                onShowDashboard={() => router.push("/dashboard")}
                onShowAllStories={() => router.push("/all_stories")}
                onShowMediaLibrary={() => router.push("/media")}
                onShowAnalytics={() => router.push("/analytics")}
            >
                <ContactInquiries />
            </AdminDashboardLayout>
        </AuthGuard>
    );
}
