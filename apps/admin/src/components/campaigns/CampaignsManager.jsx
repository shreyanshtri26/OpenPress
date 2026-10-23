import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../../hooks/useRouter';
import {
    AdminMobileSidebarToggle,
} from '../../components/SideBar/AdminDashboardLayout';
import DataGrid, {
    Column,
    Paging,
    Scrolling,
    Selection,
    FilterRow,
    HeaderFilter,
    ColumnChooser,
    Export,
    Grouping,
    GroupPanel,
    Pager,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { createGridExportHandler } from '../../utils/dataGridExport';
import CreateCampaignView from '../../components/campaigns/CreateCampaignView';
import CampaignCalendar, { CampaignStatusLegend } from '../../components/campaigns/CampaignCalendar';
import { AllStoriesHeader } from '../../components/dashboard/all-stories/AllStoriesHeader';
import apiFetch from '../../utils/api';
import env from '../../utils/env';
import { UserContext } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Play, Pause } from 'lucide-react';
import { republishAllCampaignPages } from '../../helpers/republishAllCampaignPages';
import { mapBackendCampaignToFrontend } from '../../helpers/campaignMapper';
import { CAMPAIGN_STATUS_LOOKUP } from './constants';

const DUMMY_CAMPAIGNS = [
    { id: 'mock-1', name: 'Summer Sale 2025', advertiser: 'Global Brands', status: 'Active', startDate: '2025-01-31', endDate: '2025-05-20', clicks: 2000, impressions: 21100, ctr: '9.47%' },
    { id: 'mock-2', name: 'Holiday Special', advertiser: 'Tech Innovators', status: 'Pause', startDate: '2024-11-15', endDate: '2024-12-31', clicks: 5400, impressions: 45000, ctr: '12.0%' }
];

// A campaign holds an array of placements, so there is no single value to group
// by. Collapse the list into one label — campaigns running the same set of
// placements group together. Declared at module scope so its identity is stable
// across renders; an inline closure makes the grid kit rebuild the column.
const calculatePlacementsValue = (rowData) => {
    const jobs = rowData?.jobs || [];
    return jobs.length ? jobs.map((j) => j.placement).join(', ') : 'None';
};

export default function CampaignsManager() {
    const router = useRouter();
    const userContext = useContext(UserContext);
    const user = userContext?.user;
    const loading = userContext?.loading;
    const token = user?.token;

    const [currentView, setCurrentView] = useState('library'); // 'library' or 'create'
    const [campaignTab, setCampaignTab] = useState('calendar'); // 'table' or 'calendar'
    const [campaigns, setCampaigns] = useState([]);
    const [placementNames, setPlacementNames] = useState([]);
    const [fetching, setFetching] = useState(false);

    const authHeaders = useMemo(
        () => ({
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        [token]
    );

    // Helper function to determine effective campaign status
    const getEffectiveStatus = useCallback((campaign) => {
        const now = new Date();
        const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
        const isExpired = endDate && now > endDate;

        if (isExpired) {
            return 'expired';
        }

        const status = (campaign.status || '').toLowerCase();
        if (status === 'start now' || status === 'start_now' || status === 'active') {
            return 'start_now';
        }
        if (status === 'pause' || status === 'paused') {
            return 'paused';
        }
        if (status === 'draft') {
            return 'draft';
        }
        if (status === 'start later' || status === 'start_later' || status === 'scheduled') {
            return 'start_later';
        }

        return status;
    }, []);

    // Enrich campaigns with statusValue for filtering
    const campaignsWithStatusValue = useMemo(() => {
        return campaigns.map((campaign) => ({
            ...campaign,
            statusValue: getEffectiveStatus(campaign),
        }));
    }, [campaigns, getEffectiveStatus]);

    // Create status lookup data for filter dropdown
    const statusLookupData = useMemo(() => {
        return [
            { value: 'start_now', label: CAMPAIGN_STATUS_LOOKUP.start_now.label },
            { value: 'paused', label: CAMPAIGN_STATUS_LOOKUP.paused.label },
            { value: 'expired', label: CAMPAIGN_STATUS_LOOKUP.expired.label },
            { value: 'draft', label: CAMPAIGN_STATUS_LOOKUP.draft.label },
            { value: 'start_later', label: CAMPAIGN_STATUS_LOOKUP.start_later.label },
        ];
    }, []);

    const fetchCampaigns = useCallback(async () => {
        if (!token) return; // Guard against fetching without a token

        try {
            setFetching(true);
            const res = await apiFetch(`${env.backendApi}/getCampaigns`, {
                method: 'GET',
                headers: authHeaders,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed to fetch campaigns');

            const apiCampaigns = (json.campaigns || []).map(mapBackendCampaignToFrontend);
            setCampaigns([...apiCampaigns]);

            // Detect campaigns that expired while still marked active — update DB + republish pages
            const now = new Date();
            const staleActive = apiCampaigns.filter(c => {
                if ((c.status || '').toLowerCase() !== 'start now') return false;
                const end = c.endDate ? new Date(c.endDate) : null;
                return end && end < now;
            });
            if (staleActive.length > 0) {
                staleActive.forEach(c =>
                    apiFetch(`${env.backendApi}/updateCampaign`, {
                        method: 'PUT',
                        headers: authHeaders,
                        body: JSON.stringify({ campaignId: c.id, status: 'expired' }),
                    }).catch(() => {})
                );
                republishAllCampaignPages(token).catch(() => {});
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to load campaigns');
            setCampaigns(DUMMY_CAMPAIGNS);
        } finally {
            setFetching(false);
        }
    }, [authHeaders, token]);

    const fetchPlacements = useCallback(async () => {
        if (!token) return;

        try {
            const res = await apiFetch(`${env.backendApi}/placements`, {
                method: 'GET',
                headers: authHeaders,
            });

            if (!res.ok) return;

            const data = await res.json();
            const placements = data?.placements || data || [];
            const names = Array.from(
                new Set((placements || []).map((p) => p?.name).filter(Boolean))
            );
            setPlacementNames(names);
        } catch (e) {
            console.error('Failed to load placements', e);
            setPlacementNames([]);
        }
    }, [authHeaders, token]);

    useEffect(() => {
        if (loading || !token) return; // Wait until authenticated and token is available
        fetchCampaigns();
        fetchPlacements();
    }, [fetchCampaigns, fetchPlacements, loading, token]);

    useEffect(() => {
        if (!token) return;
        const intervalId = setInterval(() => {
            fetchCampaigns();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [fetchCampaigns, token]);

    // Set timers for currently-active campaigns so pages republish the moment they expire.
    // setTimeout's delay is capped at a 32-bit signed int (~24.8 days); anything past that
    // silently fires immediately instead of waiting, so long-running campaigns need to be
    // scheduled in safe-sized chunks rather than one setTimeout for the full remaining time.
    const MAX_TIMEOUT_MS = 2147483647;
    useEffect(() => {
        if (!token) return;
        const timers = [];
        (campaigns || []).forEach(c => {
            if ((c.status || '').toLowerCase() !== 'start now') return;
            const end = c.endDate ? new Date(c.endDate) : null;
            if (!end || end <= new Date()) return;

            const scheduleUntil = (targetTime) => {
                const remaining = targetTime - Date.now();
                if (remaining > MAX_TIMEOUT_MS) {
                    const t = setTimeout(() => scheduleUntil(targetTime), MAX_TIMEOUT_MS);
                    timers.push(t);
                    return;
                }
                const t = setTimeout(() => {
                    apiFetch(`${env.backendApi}/updateCampaign`, {
                        method: 'PUT',
                        headers: authHeaders,
                        body: JSON.stringify({ campaignId: c.id, status: 'expired' }),
                    }).catch(() => {});
                    republishAllCampaignPages(token).catch(() => {});
                    fetchCampaigns();
                }, Math.max(remaining, 0));
                timers.push(t);
            };
            scheduleUntil(end.getTime());
        });
        return () => timers.forEach(clearTimeout);
    }, [campaigns, authHeaders, token, fetchCampaigns]);

    const handleShowDashboard = () => router.push('/dashboard');
    const handleShowAllStories = () => router.push('/all_stories');
    const handleShowMediaLibrary = () => router.push('/media');

    const handleEdit = (cp) => {
        window.editingCampaign = cp;
        setCurrentView('create');
    };

    const handleDelete = async (cp) => {
        if (!window.confirm(`Are you sure you want to delete the campaign "${cp.name}"?`)) return;

        try {
            const res = await apiFetch(`${env.backendApi}/deleteCampaign`, {
                method: 'DELETE',
                headers: authHeaders,
                body: JSON.stringify({ campaignId: cp.id }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.message || 'Failed to delete campaign');
            }

            toast.success('Campaign deleted successfully');
            fetchCampaigns();
        } catch (e) {
            console.error(e);
            toast.error(e.message || 'Failed to delete campaign');
        }
    };

    const handleToggleStatus = async (cp) => {
        const isCurrentlyActive = cp.status === 'Start now';
        const newStatus = isCurrentlyActive ? 'pause' : 'start_now';

        // Confirmation for pausing
        if (isCurrentlyActive) {
            const confirmPause = window.confirm('Are you sure you want to pause this campaign? The campaign will remain reserved for its current placement and time slot while paused.');
            if (!confirmPause) return;
        }

        // Pro-Developer Check: If unpausing, verify there are no conflicts with other active campaigns
        if (!isCurrentlyActive) {
            const hasConflict = (campaigns || []).some(otherCp => {
                if (String(otherCp.id) === String(cp.id)) return false;

                const otherStatus = (otherCp.status || '').toLowerCase();
                const isOtherBlocking = otherStatus === 'start now' || otherStatus === 'start_now' || otherStatus === 'schedule' || otherStatus === 'active';
                if (!isOtherBlocking) return false;

                // Treat as expired if the other campaign's end date (by calendar day) is today or earlier
                if (otherCp.endDate) {
                    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
                    const otherEndDay = new Date(otherCp.endDate); otherEndDay.setHours(0, 0, 0, 0);
                    if (otherEndDay <= todayStart) return false;
                }

                return (cp.jobs || []).some(job => {
                    const normalizedPlacement = (job.placement || '').toLowerCase().replace(/\s+/g, '-');

                    return (otherCp.jobs || []).some(otherJob => {
                        const otherNormalizedP = (otherJob.placement || '').toLowerCase().replace(/\s+/g, '-');
                        if (otherNormalizedP !== normalizedPlacement) return false;

                        if (!job.startTime || !job.endTime || !otherJob.startTime || !otherJob.endTime) return false;

                        const startA = new Date(job.startTime); startA.setHours(0, 0, 0, 0);
                        const endA = new Date(job.endTime); endA.setHours(23, 59, 59, 999);
                        const startB = new Date(otherJob.startTime); startB.setHours(0, 0, 0, 0);
                        const endB = new Date(otherJob.endTime); endB.setHours(23, 59, 59, 999);

                        const overlap = (startA <= endB && endA >= startB);
                        if (overlap) {
                        }
                        return overlap;
                    });
                });
            });

            if (hasConflict) {
                toast.error('Cannot unpause: This slot is now occupied by another active campaign. Please reschedule first.');
                return;
            }
        }

        try {
            const res = await apiFetch(`${env.backendApi}/updateCampaign`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({
                    campaignId: cp.id,
                    status: newStatus
                }),
            });

            if (!res.ok) throw new Error('Status update failed');
            toast.success(`Campaign ${isCurrentlyActive ? 'paused' : 'started'} successfully`);
            fetchCampaigns();
 
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

    const onRowClick = (e) => {
        if (e.rowType === 'data') {
            router.push(`/campaign-hub/detail?id=${e.data.id}`);
        }
    };

    // the grid kit counts group rows against the page size, so expanding a group
    // fills the page with that group's rows and pushes the remaining groups
    // onto the next page. Turn paging off while a grouping is applied so the
    // whole tree stays browsable, and restore it when grouping is cleared.
    //
    // This is done imperatively rather than through React state on purpose: a
    // re-render re-creates the inline cellRender/calculateCellValue closures on
    // the <Column> children, which makes the grid kit rebuild the columns and
    // drop the groupIndex the user just set — the drop appears to bounce back.
    const onGridOptionChanged = useCallback((e) => {
        if (!e.fullName || !e.fullName.includes('groupIndex')) return;
        const grouped = e.component
            .getVisibleColumns()
            .some((col) => typeof col.groupIndex === 'number' && col.groupIndex >= 0);
        if (e.component.option('paging.enabled') !== !grouped) {
            e.component.option('paging.enabled', !grouped);
        }
        if (e.component.option('pager.visible') !== !grouped) {
            e.component.option('pager.visible', !grouped);
        }
    }, []);

    const handleCampaignClick = useCallback((cp) => {
        if (!cp?.id) return;
        router.push(`/campaign-hub/detail?id=${cp.id}`);
    }, [router]);

    const handleCreateCampaign = useCallback(() => {
        setCurrentView('create');
    }, []);

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <style>{`
            `}</style>
            {currentView === 'library' && (
                <>
                    <AllStoriesHeader onBack={handleShowDashboard} />

                    <div className="flex-1 overflow-y-auto">
                        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                            <div className="mb-4 md:hidden">
                                <AdminMobileSidebarToggle className="border border-gray-300" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campaign Hub</h1>
                                <button
                                    className="rounded-full bg-[#1d1d1f] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3a3a3c]"
                                    onClick={() => setCurrentView('create')}
                                >
                                    Create Campaign
                                </button>
                            </div>

                            {/* Tab switcher */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex gap-0 border border-gray-200 rounded-full overflow-hidden w-fit bg-white">
                                    <button
                                        onClick={() => setCampaignTab('calendar')}
                                        className={`px-5 py-2 text-sm font-semibold transition-colors ${
                                            campaignTab === 'calendar'
                                                ? 'bg-[#1d1d1f] text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Calendar
                                    </button>
                                    <button
                                        onClick={() => setCampaignTab('table')}
                                        className={`px-5 py-2 text-sm font-semibold transition-colors border-l border-gray-300 ${
                                            campaignTab === 'table'
                                                ? 'bg-[#1d1d1f] text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Table
                                    </button>
                                </div>
                                {campaignTab === 'calendar' && <CampaignStatusLegend />}
                            </div>

                            {/* Calendar view */}
                            {campaignTab === 'calendar' && (
                                <CampaignCalendar
                                    campaigns={campaigns}
                                    placementNames={placementNames}
                                    onCampaignClick={handleCampaignClick}
                                    loading={fetching}
                                    onCreateCampaign={handleCreateCampaign}
                                    onRefresh={fetchCampaigns}
                                />
                            )}

                            {/* Campaigns Grid (table view) */}
                            {campaignTab === 'table' && <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                <DataGrid
                                    dataSource={campaignsWithStatusValue}
                                    showBorders={false}
                                    showRowLines={true}
                                    hoverStateEnabled={false}
                                    onRowClick={onRowClick}
                                    allowColumnResizing
                                    allowColumnReordering
                                    columnAutoWidth
                                    className="campaigns-datagrid w-full cursor-pointer"
                                    onExporting={createGridExportHandler('Campaigns')}
                                    onOptionChanged={onGridOptionChanged}
                                >
                                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                                    <Grouping autoExpandAll={false} />
                                    <ColumnChooser enabled={true} mode="select" />
                                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                                    <FilterRow visible={true} applyFilter="auto" />
                                    <FilterPanel visible={true} />
                                    <FilterBuilderPopup width={700} height={500} />
                                    <HeaderFilter visible />
                                    <Scrolling mode="standard" />
                                    <Paging defaultPageSize={10} />
                                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                                    <Selection mode="multiple" showCheckBoxesMode="always" />
                                    <Column dataField="name" caption="Campaign Name" cssClass="font-semibold text-gray-900" allowHeaderFiltering={false} allowGrouping />
                                    <Column dataField="advertiser" caption="Advertiser" allowHeaderFiltering={false} allowGrouping />
                                    <Column
                                        name="placements"
                                        caption="Placements"
                                        allowHeaderFiltering={false}
                                        allowGrouping
                                        calculateCellValue={calculatePlacementsValue}
                                        cellRender={(data) => {
                                            const jobs = data.data.jobs || [];
                                            return (
                                                <div className="flex flex-wrap gap-1">
                                                    {jobs.length > 0 ? jobs.map((j, i) => (
                                                        <span key={i} className="text-[10px] bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                            {j.placement}
                                                        </span>
                                                    )) : <span className="text-[10px] text-gray-400">None</span>}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Column dataField="statusValue" caption="Status" width={100}
                                        allowFiltering={true}
                                        allowHeaderFiltering={true}
                                        lookup={{
                                            dataSource: statusLookupData,
                                            valueExpr: 'value',
                                            displayExpr: 'label',
                                        }}
                                        cellRender={(data) => {
                                            const statusValue = data.data.statusValue;
                                            const rowData = data.data;
                                            const now = new Date();
                                            const end = rowData.endDate ? new Date(rowData.endDate) : null;
                                            const isExpired = end && now > end;

                                            // Determine effective status considering isExpired
                                            const effectiveStatus = (statusValue === 'expired' || isExpired) ? 'expired' : statusValue;
                                            
                                            // Get lookup entry, default to gray if not found
                                            const statusLookup = CAMPAIGN_STATUS_LOOKUP[effectiveStatus] || {
                                                label: effectiveStatus?.toUpperCase() || 'UNKNOWN',
                                                colorClass: 'text-gray-800',
                                                bgClass: 'bg-gray-100',
                                            };

                                            return (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded ${statusLookup.bgClass} ${statusLookup.colorClass}`}>
                                                    {statusLookup.label}
                                                </span>
                                            );
                                        }}
                                    />
                                    <Column dataField="startDate" caption="Start Date" dataType="date" format="dd/MM/yyyy" allowHeaderFiltering={false} allowGrouping />
                                    <Column dataField="endDate" caption="End Date" dataType="date" format="dd/MM/yyyy" allowHeaderFiltering={false} allowGrouping />
                                    <Column dataField="impressions" caption="Impressions" dataType="number" format="#,##0" allowHeaderFiltering={false} allowGrouping={false} />
                                    <Column dataField="clicks" caption="Clicks" dataType="number" format="#,##0" allowHeaderFiltering={false} allowGrouping={false} />
                                    <Column dataField="ctr" caption="CTR" alignment="right" allowHeaderFiltering={false} allowGrouping={false} />
                                    <Column
                                        caption="Actions"
                                        width={120}
                                        alignment="center"
                                        allowHeaderFiltering={false}
                                        allowGrouping={false}
                                        allowExporting={false}
                                        allowFiltering={false}
                                        cellRender={(data) => {
                                            const cp = data.data;
                                            const isActive = cp.status === 'Start now';
                                            const isDraft = cp.status?.toLowerCase() === 'draft';
                                            const now = new Date();
                                            const end = cp.endDate ? new Date(cp.endDate) : null;
                                            const isExpired = end && now > end;

                                            return (
                                                <div className="flex items-center justify-center gap-2">
                                                    {!isExpired && !isDraft && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleStatus(cp);
                                                            }}
                                                            className={`p-1 hover:bg-gray-100 rounded transition-colors ${isActive ? 'text-orange-600' : 'text-green-600'}`}
                                                            title={isActive ? "Pause" : "Play"}
                                                        >
                                                            {isActive ? <Pause size={16} /> : <Play size={16} />}
                                                        </button>
                                                    )}
                                                    {!isExpired && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(cp);
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded transition-colors text-blue-600"
                                                            title="Edit"
                                                        >
                                                            <img
                                                                src="/images/edit.svg"
                                                                alt="Edit"
                                                                className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                                                            />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(cp);
                                                        }}
                                                        className="p-1 hover:bg-gray-100 rounded transition-colors text-red-600"
                                                        title="Delete"
                                                    >
                                                        <img
                                                            src="/images/delete.svg"
                                                            alt="Delete"
                                                            className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                                                        />
                                                    </button>
                                                </div>
                                            );
                                        }}
                                    />
                                </DataGrid>
                            </div>}
                        </div>
                    </div>
                </>
            )}

            {currentView === 'create' && (
                <CreateCampaignView
                    onBack={() => {
                        if (window.editingCampaign) {
                            delete window.editingCampaign;
                        }
                        setCurrentView('library');
                    }}
                    editData={window.editingCampaign}
                    allCampaigns={campaigns}
                    onSave={(data) => {
                        if (window.editingCampaign) {
                            delete window.editingCampaign;
                        }
                        fetchCampaigns();
                        setCurrentView('library');
                    }}
                />
            )}
        </div>
    );
}
