import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import { AuthGuard } from '../../context/AuthGuard';
import {
    AdminDashboardLayout,
} from '../../components/SideBar/AdminDashboardLayout';
import CampaignsManager from '../../components/campaigns/CampaignsManager';

export default function CampaignsIndexPage() {
    const router = useRouter();

    const handleShowDashboard = () => router.push('/dashboard');
    const handleShowAllStories = () => router.push('/all_stories');
    const handleShowMediaLibrary = () => router.push('/media');

    return (
        <AuthGuard allowedRoles={['admin', 'editor', 'journalist']}>
            <AdminDashboardLayout
                onShowDashboard={handleShowDashboard}
                onShowAllStories={handleShowAllStories}
                onShowMediaLibrary={handleShowMediaLibrary}
                defaultSidebarOpen={false}
            >
                <div className="flex flex-1 flex-col overflow-hidden bg-white">
                    <CampaignsManager />
                </div>
            </AdminDashboardLayout>
        </AuthGuard>
    );
}
