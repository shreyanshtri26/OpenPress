import React, { useEffect, useState } from 'react';
import apiFetch from '@/utils/api';
import BackToDashboardButton from '../common/BackToDashboardButton';

// ─── Types ────────────────────────────────────────────────────────────────────
import {
    TabId,
    AnalyticsDashboardProps,
} from '../../types/analytics';

// ─── Utils ────────────────────────────────────────────────────────────────────
import {
    DX_OVERRIDES,
    API_BASE,
    clearRequestCache,
    fetchAggregated
} from '../../utils/analyticsUtils';

// ─── Sub-components ───────────────────────────────────────────────────────────
import { FilterDrawer } from './analytics/FilterDrawer';
import { OverviewTab } from './analytics/OverviewTab';
import { ContentTab } from './analytics/ContentTab';
import { AudienceTab } from './analytics/AudienceTab';
import { GeographyTab } from './analytics/GeographyTab';
import { SharingTab } from './analytics/SharingTab';
import { RealtimeTab } from './analytics/RealtimeTab';
import { AdsTab } from './analytics/AdsTab';

const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'content', label: 'Content' },
    { id: 'users', label: 'Audience' },
    { id: 'geo', label: 'Geography' },
    { id: 'sharing', label: 'Actions' },
    { id: 'ads', label: 'Ad Analytics' },
    { id: 'realtime', label: 'Realtime Pass' },
];

export default function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [allUserIds, setAllUserIds] = useState<string[]>([]);
    const [dateError, setDateError] = useState<string | null>(null);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // ─── Centralized Data Cache ──────────────────────────────────────────────
    const [dashboardCache, setDashboardCache] = useState<Record<string, any>>({});

    // Clear cache when filters change so the active tab refetches with the new filters
    useEffect(() => {
        setDashboardCache(prev => ({
            realtime: prev.realtime // Keep realtime even when historical filters change
        }));
    }, [fromDate, toDate, selectedUserId]);

    const updateCache = (tabId: string, data: any) => {
        setDashboardCache(prev => ({
            ...prev,
            [tabId]: {
                ...(prev[tabId] || {}),
                ...data
            }
        }));
    };

    const handleExport = async (isSilent = false) => {
        if (!isSilent) setExporting(true);
        try {
            if (!API_BASE) {
                console.error("Dashboard API URL not found in environment variables");
                return;
            }
            const exportUrl = `${API_BASE}/export`;

            await apiFetch(exportUrl);

            // Always invalidate memory request cache so future queries load fresh data
            clearRequestCache();

            // Only force remount/reload on explicit user REFRESH button click
            if (!isSilent) {
                setDashboardCache({});
                setRefreshKey(prev => prev + 1);
            }
        } catch (e) {
            console.error("Export error:", e);
        } finally {
            if (!isSilent) setExporting(false);
        }
    };

    // Readers offered in the "Filter by user" drawer: the most valuable ones in the chosen dates
    useEffect(() => {
        fetchAggregated<{ data: { user_id: string }[] }>('table/audience/high-value-users', { from: fromDate, to: toDate, limit: '200' })
            .then((res) => setAllUserIds(res.data.map((u) => u.user_id)))
            .catch(() => setAllUserIds([]));
    }, [fromDate, toDate]);

    useEffect(() => {
        setLoading(false);
        handleExport(true); // Run on first render silently in background without resetting UI
        
        // Sync data silently in background while the dashboard stays open
        const interval = setInterval(() => {
            handleExport(true);
        }, 5 * 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto sm:overflow-hidden text-black font-sans">
            <style>{DX_OVERRIDES}</style>

            {/* Top bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <BackToDashboardButton onClick={onBack} />
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={() => handleExport()}
                        disabled={exporting}
                        className={`flex items-center gap-2 px-4 py-2 border border-black text-xs font-bold transition-all relative ${exporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                        {exporting ? (
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-black rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        {exporting ? 'REFRESHING...' : 'REFRESH'}
                    </button>
                    <button onClick={() => setIsFilterDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-black text-xs font-bold hover:bg-gray-50 transition-all relative">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        FILTERS
                        {(fromDate || toDate || selectedUserId) && (<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black border-2 border-white rounded-full" />)}
                    </button>
                </div>
            </div>

            {isFilterDrawerOpen && (
                <FilterDrawer
                    fromDate={fromDate} toDate={toDate}
                    selectedUserId={selectedUserId} allUserIds={allUserIds} dateError={dateError}
                    onReset={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 30);
                        setFromDate(d.toISOString().split('T')[0]);
                        setToDate(new Date().toISOString().split('T')[0]);
                        setSelectedUserId('');
                        setIsFilterDrawerOpen(false);
                    }}
                    onApply={(vals) => {
                        setFromDate(vals.fromDate);
                        setToDate(vals.toDate);
                        setSelectedUserId(vals.selectedUserId);
                        setIsFilterDrawerOpen(false);
                    }}
                    onClose={() => setIsFilterDrawerOpen(false)}
                />
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-4 sm:px-8 py-0 bg-white border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto py-6 sm:py-8">
                <div className="px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">

                    {activeTab === 'overview' && (
                        <OverviewTab
                            key={`overview_${refreshKey}`}
                            fromDate={fromDate}
                            toDate={toDate}
                            selectedUserId={selectedUserId}
                            cachedData={dashboardCache['overview']}
                            onCacheUpdate={(data) => updateCache('overview', data)}
                            onGoToRealtime={() => setActiveTab('realtime')}
                        />
                    )}
                    
                    {activeTab === 'content' && (
                        <ContentTab
                            key={`content_${refreshKey}`}
                            fromDate={fromDate}
                            toDate={toDate}
                            selectedUserId={selectedUserId}
                            cachedData={dashboardCache['content']}
                            onCacheUpdate={(data) => updateCache('content', data)}
                        />
                    )}

                    {activeTab === 'users' && (
                        <AudienceTab
                            key={`users_${refreshKey}`}
                            fromDate={fromDate}
                            toDate={toDate}
                            selectedUserId={selectedUserId}
                            cachedData={dashboardCache['users']}
                            onCacheUpdate={(data) => updateCache('users', data)}
                        />
                    )}

                    {activeTab === 'geo' && (
                        <GeographyTab
                            key={`geo_${refreshKey}`}
                            fromDate={fromDate}
                            toDate={toDate}
                            selectedUserId={selectedUserId}
                            cachedData={dashboardCache['geo']}
                            onCacheUpdate={(data) => updateCache('geo', data)}
                        />
                    )}

                    {activeTab === 'sharing' && (
                        <SharingTab
                            key={`sharing_${refreshKey}`}
                            fromDate={fromDate}
                            toDate={toDate}
                            selectedUserId={selectedUserId}
                            cachedData={dashboardCache['sharing']}
                            onCacheUpdate={(data) => updateCache('sharing', data)}
                        />
                    )}

                    {activeTab === 'ads' && (
                        <AdsTab
                            key={`ads_${refreshKey}`}
                            cachedData={dashboardCache['ads']}
                            onCacheUpdate={(data) => updateCache('ads', data)}
                        />
                    )}

                    {activeTab === 'realtime' && (
                        <RealtimeTab 
                            key={`realtime_${refreshKey}`}
                            cachedData={dashboardCache['realtime']}
                            onCacheUpdate={(data) => updateCache('realtime', data)}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}