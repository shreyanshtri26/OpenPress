import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { useRouter } from '../../hooks/useRouter';
import { AuthGuard } from '../../context/AuthGuard';
import {
    AdminDashboardLayout,
    AdminMobileSidebarToggle,
} from '../../components/SideBar/AdminDashboardLayout';
import MetricCard from '../../components/campaigns/MetricCard';
import AudienceInsightsChart from '../../components/campaigns/AudienceInsightsChart';
import PlacementPerformanceGrid from '../../components/campaigns/PlacementPerformanceGrid';
import CreateCampaignView from '../../components/campaigns/CreateCampaignView';
import apiFetch from '../../utils/api';
import env from '../../utils/env';
import { UserContext } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { republishAllCampaignPages } from '../../helpers/republishAllCampaignPages';

import { mapBackendCampaignToFrontend } from '../../helpers/campaignMapper';


const mockChartData = [
    { date: 'Jan 1', value: 300 },
    { date: 'Jan 2', value: 200 },
    { date: 'Jan 3', value: 1500 },
    { date: 'Jan 4', value: 800 },
    { date: 'Jan 5', value: 1100 },
    { date: 'Jan 6', value: 2400 },
    { date: 'Jan 7', value: 1800 },
    { date: 'Jan 8', value: 900 },
    { date: 'Jan 9', value: 1600 },
    { date: 'Jan 10', value: 1100 },
    { date: 'Jan 11', value: 700 },
    { date: 'Jan 12', value: 1300 }
];

const mockGridData = [
    { placement: 'Leaderboard', impressions: 10000, clicks: 1200, ctr: '12%' },
    { placement: 'In story', impressions: 5000, clicks: 1200, ctr: '24%' },
    { placement: 'Sidebar rectangle', impressions: 2000, clicks: 500, ctr: '25%' },
];

export default function CampaignDetailPage() {
    const router = useRouter();
    const campaignIdFromUrl = new URLSearchParams(window.location.search).get('id');
    const { user } = useContext(UserContext) ?? {};
    const token = user?.token;

    const [currentView, setCurrentView] = useState('detail'); // 'detail' or 'create'
    const [campaign, setCampaign] = useState(null);
    const [chartData, setChartData] = useState(mockChartData);
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(
        () => ({
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    const fetchCampaignDetail = useCallback(async () => {
        if (!campaignIdFromUrl) return;
        try {
            setLoading(true);
            const res = await apiFetch(`${env.backendApi}/getCampaigns`, {
                method: 'GET',
                headers: authHeaders,
            });
            const json = await res.json();
            if (!res.ok) throw new Error('Failed to fetch campaign');

            const found = (json.campaigns || []).find(c => c.campaignId === campaignIdFromUrl);
            if (found) {
                const mapped = mapBackendCampaignToFrontend(found);
                setCampaign(mapped);
                // Fetch campaign events for chart data
                fetchCampaignEvents(campaignIdFromUrl);
            } else {
                toast.error('Campaign not found');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error loading campaign details');
        } finally {
            setLoading(false);
        }
    }, [authHeaders, campaignIdFromUrl]);

    const fetchCampaignEvents = useCallback(async (campaignId) => {
        try {
            // First, try the dedicated events endpoint
            try {
                const res = await apiFetch(`${env.backendApi}/getCampaignEvents`, {
                    method: 'GET',
                    headers: authHeaders,
                });
                const json = await res.json();
                if (res.ok && json.events && json.events.length > 0) {
                    // Process events to aggregate by date
                    const eventsByDate = {};
                    
                    json.events.forEach(event => {
                        const eventDate = new Date(event.createdAt || event.timestamp || event.date);
                        const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        if (!eventsByDate[dateStr]) {
                            eventsByDate[dateStr] = 0;
                        }
                        
                        // Count impressions for the chart
                        if (event.eventType === 'impression') {
                            eventsByDate[dateStr] += 1;
                        }
                    });

                    // Convert to chart data format
                    const chartDataFromEvents = Object.entries(eventsByDate)
                        .map(([date, value]) => ({
                            date,
                            value
                        }))
                        .sort((a, b) => new Date(a.date) - new Date(b.date));

                    if (chartDataFromEvents.length > 0) {
                        setChartData(chartDataFromEvents);
                        return;
                    }
                }
            } catch (e) {
                console.warn('getCampaignEvents endpoint not available');
            }

            // Fallback: If no events endpoint or no data, use mock data
            // In production, this should be replaced with actual data fetching
            setChartData(mockChartData);
        } catch (e) {
            console.warn('Error fetching campaign events:', e);
            setChartData(mockChartData);
        }
    }, [authHeaders]);

    useEffect(() => {
        fetchCampaignDetail();
    }, [fetchCampaignDetail]);

    const handleToggleStatus = async (newStatus) => {
        if (!campaign) return;
        try {
            const res = await apiFetch(`${env.backendApi}/updateCampaign`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({
                    campaignId: campaign.campaignId,
                    status: newStatus
                }),
            });

            if (!res.ok) throw new Error('Status update failed');
            toast.success(`Campaign ${newStatus === 'pause' ? 'paused' : 'started'} successfully`);
            fetchCampaignDetail();
 
            if (newStatus === 'pause' || newStatus === 'start_now') {
                try {
                    republishAllCampaignPages(token);
                } catch (e) {
                    console.error('Failed to re-publish home page:', e);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const handleShowDashboard = () => router.push('/dashboard');
    const handleShowAllStories = () => router.push('/all_stories');
    const handleShowMediaLibrary = () => router.push('/media');
    const isExpired = useMemo(() => {
        if (!campaign?.endDate) return false;
        return new Date() > new Date(campaign.endDate);
    }, [campaign?.endDate]);

    return (
        <AuthGuard allowedRoles={['admin', 'editor', 'journalist']}>
            <AdminDashboardLayout
                onShowDashboard={handleShowDashboard}
                onShowAllStories={handleShowAllStories}
                onShowMediaLibrary={handleShowMediaLibrary}
                defaultSidebarOpen={false}
            >
                <div className="flex flex-1 flex-col overflow-hidden bg-white">
                    <main className="flex-1 overflow-y-auto">
                        <div className="px-4 md:px-8 py-6">
                            <div className="mb-4 md:hidden">
                                <AdminMobileSidebarToggle className="border border-gray-300" />
                            </div>

                            {currentView === 'detail' && (
                                <>
                                    {/* Breadcrumbs */}
                                    <div className="text-sm font-medium text-gray-800 mb-6 flex items-center space-x-2">
                                        <span className="cursor-pointer hover:underline" onClick={() => router.push('/dashboard')}>Dashboard</span>
                                        <span className="text-gray-500">&gt;</span>
                                        <span className="cursor-pointer hover:underline" onClick={() => router.push('/campaign-hub')}>Campaign Hub</span>
                                        <span className="text-gray-500">&gt;</span>
                                        <span>Campaign detail</span>
                                    </div>

                                    {/* Header */}
                                    <div className="mb-6 flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign?.campaignName || 'Loading...'}</h1>
                                            <div className="flex items-center gap-4 text-xs tracking-widest font-bold mt-4">
                                                <button
                                                    className={`uppercase pb-1 transition-colors ${campaign?.status === 'Start now' ? 'text-black border-b border-black' : 'text-gray-500 hover:text-gray-800'}`}
                                                >
                                                    ACTIVE
                                                </button>
                                                <button
                                                    className={`uppercase pb-1 transition-colors ${campaign?.status === 'Pause' ? 'text-black border-b border-black' : 'text-gray-500 hover:text-gray-800'}`}
                                                >
                                                    PAUSE
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {!isExpired && (
                                                <button
                                                    className="border border-black text-black px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                                    onClick={() => setCurrentView('create')}
                                                >
                                                    Edit Campaign
                                                </button>
                                            )}
                                            <button
                                                className="bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
                                                onClick={() => {
                                                    setCampaign(null);
                                                    setCurrentView('create');
                                                }}
                                            >
                                                Create Campaign
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex items-center gap-6 mt-8 pb-8 border-b border-gray-300">
                                        <MetricCard label="Impressions" value={campaign?.impressions !== undefined ? campaign.impressions.toLocaleString() : '0'} />
                                        <svg className="h-10 w-10 text-gray-400 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <MetricCard label="Clicks" value={campaign?.clicks !== undefined ? campaign.clicks.toLocaleString() : '0'} />
                                        <svg className="h-10 w-10 text-gray-400 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <MetricCard label="CTR" value={campaign?.ctr || '0%'} />
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                                        {/* Left Column (Chart + Grid) */}
                                        <div className="lg:col-span-3">
                                            <div className="mb-6 flex items-center justify-between">
                                                <h2 className="text-xl font-bold text-gray-900">Audience insights</h2>
                                                <div className="flex text-xs font-bold text-gray-500">
                                                    <button className="border border-gray-300 px-2 py-1 bg-white text-black hover:bg-gray-50">D</button>
                                                    <button className="px-2 py-1 hover:text-black hover:bg-gray-100 transition-colors">W</button>
                                                    <button className="px-2 py-1 hover:text-black hover:bg-gray-100 transition-colors">M</button>
                                                </div>
                                            </div>
                                            {/* the grid kit Chart Component */}
                                            <div className="mb-8">
                                                <AudienceInsightsChart data={chartData} />
                                            </div>

                                            {/* the grid kit DataGrid Component */}
                                            <div className="mt-12 w-full">
                                                <PlacementPerformanceGrid data={(campaign?.jobs || []).map(job => ({
                                                    placement: job.placement,
                                                    impressions: job.impressions ?? 0,
                                                    clicks: job.clicks ?? 0,
                                                    ctr: job.ctr ?? '0.00%',
                                                }))} />
                                            </div>
                                        </div>

                                        {/* Right Column (Metadata Sidebar) */}
                                        <div className="lg:col-span-1 lg:pl-8">
                                            <div className="mb-6">
                                                <div className="text-sm font-bold text-gray-900 mb-1">Advertiser</div>
                                                <div className="text-sm text-gray-700">{campaign?.advertiserName || '-'}</div>
                                            </div>
                                            <div className="w-full h-px bg-gray-300 my-4" />
                                            <div className="mb-6">
                                                <div className="text-sm font-bold text-gray-900 mb-1">Start date</div>
                                                <div className="text-sm text-gray-700">
                                                    {campaign?.startDate ? new Date(campaign.startDate).toLocaleDateString('en-GB') : '-'}
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-gray-300 my-4" />
                                            <div className="mb-6">
                                                <div className="text-sm font-bold text-gray-900 mb-1">End date</div>
                                                <div className="text-sm text-gray-700">
                                                    {campaign?.endDate ? new Date(campaign.endDate).toLocaleDateString('en-GB') : '-'}
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-gray-300 my-4" />
                                            <div className="mb-6">
                                                <div className="text-sm font-bold text-gray-900 mb-1">Placements</div>
                                                <div className="text-sm text-gray-700 leading-relaxed">
                                                    {campaign?.placements?.join(', ') || '-'}
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-gray-300 my-4" />
                                            <div className="mb-6">
                                                <div className="text-sm font-bold text-gray-900 mb-1">Landing page</div>
                                                <div className="text-sm text-gray-700 break-all">{campaign?.url || '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {currentView === 'create' && (
                                <CreateCampaignView
                                    onBack={() => setCurrentView('detail')}
                                    editData={campaign}
                                    onSave={(data) => {
                                        console.log("Saved campaign:", data);
                                        fetchCampaignDetail();
                                        setCurrentView('detail');
                                    }}
                                />
                            )}
                        </div>
                    </main>
                </div>
            </AdminDashboardLayout>
        </AuthGuard>
    );
}
