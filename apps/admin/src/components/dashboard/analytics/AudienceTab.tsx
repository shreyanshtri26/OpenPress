import React, { useState, useEffect, useMemo, useRef } from 'react';
import DataGrid, {
    Column,
    Paging,
    FilterRow,
    SearchPanel,
    HeaderFilter,
    Pager,
    Toolbar,
    Item,
    RemoteOperations,
    GroupPanel,
    Grouping,
    ColumnChooser,
    Export,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/dx/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/dx/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/dx/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import CustomStore from '@/components/ui/dx/custom-store';
import { Chart, Series, ArgumentAxis, ValueAxis, Legend, Tooltip, Label, Animation } from '@/components/ui/dx/chart';
import { Card, CardTitle, Badge, ProgressBar } from './AnalyticsUIComponents';
import { BAR_COLORS, fetchAggregated } from '../../../utils/analyticsUtils';
import env from '../../../utils/env';
import apiFetch from '../../../utils/api';
import { UserContext } from '../../../context/UserContext';
import { 
    EngagementSegment, 
    BrowserShareItem, 
    OSShareItem, 
    LanguageShareItem 
} from '../../../types/analytics';

interface AudienceTabProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

interface AudienceUser {
    email: string;
    name: string;
    role: string;
    provider: string;
    isDonor: boolean;
    hasDonated: boolean;
    donationStatus: string;
    donationCount: number;
    donationTotalAmount: number;
    donationCurrency: string;
    lastDonationAmount: number;
    lastDonationAt: string;
    createdAt: string;
    updatedAt: string;
}

export const AudienceTab = ({
    fromDate,
    toDate,
    selectedUserId,
    cachedData,
    onCacheUpdate,
}: AudienceTabProps) => {
    const userContext = React.useContext(UserContext);
    const user = userContext?.user;
    const [loading, setLoading] = useState(!cachedData);
    const [deviceEngagement, setDeviceEngagement] = useState<any[]>(cachedData?.deviceEngagement || []);
    const [readerSegments, setReaderSegments] = useState<EngagementSegment[]>(cachedData?.readerSegments || []);
    const [cohortRetention, setCohortRetention] = useState<{ week: string; pct: number }[]>(cachedData?.cohortRetention || []);
    const [browserCoverage, setBrowserCoverage] = useState<BrowserShareItem[]>(cachedData?.browserCoverage || []);
    const [osCoverage, setOsCoverage] = useState<OSShareItem[]>(cachedData?.osCoverage || []);
    const [languageSegs, setLanguageSegs] = useState<LanguageShareItem[]>(cachedData?.languageSegs || []);

    const [hvMaxScore, setHvMaxScore] = useState(cachedData?.hvMaxScore || 0);
    const HV_PAGE_SIZE = 10;

    const hvDataSource = useMemo(() => {
        return new CustomStore({
            key: 'user_id',
            load: async (loadOptions) => {
                const params: Record<string, string> = {
                    from:       fromDate,
                    to:         toDate,
                    offset:     String(loadOptions.skip || 0),
                    limit:      String(loadOptions.take || HV_PAGE_SIZE),
                };
                if (selectedUserId) params.user_id = selectedUserId;

                // Sort fallback
                params.sort_field = "score";
                params.sort_order = "desc";

                if (loadOptions.sort && Array.isArray(loadOptions.sort) && loadOptions.sort.length > 0) {
                    const sort = loadOptions.sort[0] as any;
                    params.sort_field = sort.selector;
                    params.sort_order = sort.desc ? 'desc' : 'asc';
                }

                if (loadOptions.searchValue) {
                    params.search = loadOptions.searchValue;
                }

                // Parse filters
                const parseFilter = (filter: any) => {
                    if (!filter) return;
                    if (Array.isArray(filter[0])) {
                        filter.forEach((item: any) => {
                            if (Array.isArray(item)) parseFilter(item);
                        });
                    } else if (typeof filter[0] === 'string' && filter.length >= 3) {
                        const [field, op, val] = filter;
                        params[`filter_${field}`] = String(val);
                        let bop = op;
                        if (op === '=') bop = 'equals';
                        if (op === '<>') bop = 'not_equals';
                        params[`filter_${field}_op`] = bop;
                    }
                };
                parseFilter(loadOptions.filter);

                try {
                    const isInitialPage = !loadOptions.sort && !loadOptions.filter && !loadOptions.searchValue && loadOptions.skip === 0;
                    if (isInitialPage && cachedData?.hvUsersData) {
                        setHvMaxScore(cachedData.hvMaxScore || 0);
                        return { data: cachedData.hvUsersData, totalCount: cachedData.hvTotal || 0 };
                    }

                    const hv = await fetchAggregated<{ data: any[], total: number, max_score: number }>(
                        'table/audience/high-value-users', params
                    );
                    setHvMaxScore(hv.max_score);
                    
                    if (isInitialPage) {
                        onCacheUpdate({
                            hvMaxScore: hv.max_score,
                            hvUsersData: hv.data,
                            hvTotal: hv.total
                        });
                    }
                    
                    return {
                        data: hv.data,
                        totalCount: hv.total
                    };
                } catch (e) {
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [fromDate, toDate, selectedUserId, cachedData]);

    const [audienceUsers, setAudienceUsers] = useState<AudienceUser[]>(cachedData?.audienceUsers || []);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userFilter, setUserFilter] = useState<'all' | 'donor' | 'non-donor'>('all');

    const lastFetchKeyRef = useRef<string | null>(cachedData?.filterKey ?? null);
    const lastUserFilterRef = useRef<string | null>(cachedData?.audienceUsers ? (cachedData?.userFilter ?? null) : null);

    const handleExportingUsers = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Audience Users');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Audience_Logged_In_Users.xlsx');
                });
            });
            e.cancel = true;
        } else if (e.format === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4');
            exportDataGridPDF({
                jsPDFDocument: doc,
                component: e.component,
                selectedRowsOnly,
                indent: 5,
            }).then(() => {
                doc.save('Audience_Logged_In_Users.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingBrowser = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Browser Share');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Audience_Browser_Share.xlsx');
                });
            });
            e.cancel = true;
        } else if (e.format === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4');
            exportDataGridPDF({
                jsPDFDocument: doc,
                component: e.component,
                selectedRowsOnly,
                indent: 5,
            }).then(() => {
                doc.save('Audience_Browser_Share.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingOS = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('OS Share');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Audience_OS_Share.xlsx');
                });
            });
            e.cancel = true;
        } else if (e.format === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4');
            exportDataGridPDF({
                jsPDFDocument: doc,
                component: e.component,
                selectedRowsOnly,
                indent: 5,
            }).then(() => {
                doc.save('Audience_OS_Share.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingHV = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('High Value Users');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Audience_High_Value_Users.xlsx');
                });
            });
            e.cancel = true;
        } else if (e.format === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4');
            exportDataGridPDF({
                jsPDFDocument: doc,
                component: e.component,
                selectedRowsOnly,
                indent: 5,
            }).then(() => {
                doc.save('Audience_High_Value_Users.pdf');
            });
            e.cancel = true;
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        const currentKey = `${fromDate}|${toDate}|${selectedUserId}`;

        const fetchAnalytics = async () => {
            if (lastFetchKeyRef.current === currentKey) return;
            setLoading(true);
            const params: Record<string, string> = { from: fromDate, to: toDate };
            if (selectedUserId) params.user_id = selectedUserId;

            try {
                const p1 = fetchAggregated<{ data: any[] }>('chart/audience/device-engagement', params, 3, signal).then(res => { setDeviceEngagement(res.data); return res.data; });
                const p2 = fetchAggregated<{ segments: EngagementSegment[] }>('stats/audience/reader-segments', params, 3, signal).then(res => { setReaderSegments(res.segments); return res.segments; });
                const p3 = fetchAggregated<{ data: { week: string; pct: number }[] }>('chart/audience/cohort-retention', params, 3, signal).then(res => { setCohortRetention(res.data); return res.data; });
                const p4 = fetchAggregated<{ data: BrowserShareItem[] }>('stats/audience/browser-share', params, 3, signal).then(res => { setBrowserCoverage(res.data); return res.data; });
                const p5 = fetchAggregated<{ data: OSShareItem[] }>('stats/audience/os-share', params, 3, signal).then(res => { setOsCoverage(res.data); return res.data; });
                const p6 = fetchAggregated<{ data: LanguageShareItem[] }>('stats/audience/languages', params, 3, signal).then(res => { setLanguageSegs(res.data); return res.data; });

                const [de, rs, cr, bs, os, ls] = await Promise.all([p1, p2, p3, p4, p5, p6]);

                onCacheUpdate({
                    deviceEngagement: de,
                    readerSegments: rs,
                    cohortRetention: cr,
                    browserCoverage: bs,
                    osCoverage: os,
                    languageSegs: ls,
                    hvMaxScore: hvMaxScore,
                    filterKey: currentKey
                });
                lastFetchKeyRef.current = currentKey;
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Audience analytics fetch failed", e);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        const fetchAudienceUsers = async () => {
        if (lastUserFilterRef.current === userFilter) return;
        // Fetch audience users sequentially if token exists
        if (user?.token) {
            setLoadingUsers(true);
            try {
                const qs = userFilter === 'all' ? '' : `?donation=${userFilter}`;
                const res = await apiFetch(`${env.backendApi}/api/audience/users${qs}`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (!signal.aborted) {
                        setAudienceUsers(data.users || []);
                        onCacheUpdate({
                            audienceUsers: data.users || [],
                            userFilter: userFilter
                        });
                        lastUserFilterRef.current = userFilter;
                    }
                }
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Audience users fetch failed", e);
                }
            } finally {
                if (!signal.aborted) setLoadingUsers(false);
            }
        }
    };

    fetchAnalytics();
    fetchAudienceUsers();

    return () => controller.abort();
}, [fromDate, toDate, selectedUserId, userFilter, user?.token]);

    return (
        <div className="flex flex-col gap-6">

            {/* Device + segments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card isLoading={loading && !deviceEngagement.length} className="col-span-1">
                    <CardTitle title="Device engagement" sub="Device type · sessions · avg time · avg interactions" />
                    <Chart dataSource={deviceEngagement} height={260}>
                        <Animation enabled={true} />
                        <ArgumentAxis />
                        <ValueAxis name="sessionsAxis" position="left" />
                        <ValueAxis name="timeAxis" position="right" title="seconds / interactions" />
                        <Series valueField="sessions" argumentField="device" name="Sessions" type="bar" color="#111111" axis="sessionsAxis" cornerRadius={3} />
                        <Series valueField="avg_time_s" argumentField="device" name="Avg time (s)" type="bar" color="#555555" axis="timeAxis" cornerRadius={3} />
                        <Series valueField="avg_interactions" argumentField="device" name="Avg interactions" type="bar" color="#999999" axis="timeAxis" cornerRadius={3} />
                        <Legend visible />
                        <Tooltip enabled />
                    </Chart>
                </Card>
                <Card isLoading={loading && !readerSegments?.length} className="col-span-1">
                    <CardTitle title="Reader value segments" sub="Composite score: loyalty + reading depth" />
                    {readerSegments?.map((s, i) => (
                        <div key={s.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                                <span style={{ fontWeight: 500 }}>
                                    {s.label}
                                    {s.desc && (
                                        <span style={{ color: '#86868b', fontSize: 11 }}> ({s.desc})</span>
                                    )}
                                </span>
                                <span style={{ fontWeight: 700 }}>{s.val}%</span>
                            </div>
                            <ProgressBar pct={s.val} color={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                        </div>
                    ))}
                </Card>
            </div>

            {/* Audience Users Table */}
            <Card noPadding isLoading={(loading || loadingUsers) && !audienceUsers?.length} skeletonType="table">
                <div className="pt-4 px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                        <CardTitle title="Logged-in Audience Users" sub="Review MT audience members and donation status" />
                        <div className="flex items-center gap-2">
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value as any)}
                                className="px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-white text-slate-800"
                            >
                                <option value="all">All Users</option>
                                <option value="donor">Donors</option>
                                <option value="non-donor">Non-Donors</option>
                            </select>
                            {loadingUsers && <span className="text-[10px] text-gray-400 animate-pulse">Loading...</span>}
                        </div>
                    </div>
                </div>
                <DataGrid
                    dataSource={audienceUsers}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    width="100%"
                    onExporting={handleExportingUsers}
                >
                    <Toolbar>
                        <Item location="before" name="groupPanel" />
                        <Item location="after" name="searchPanel" />
                        <Item location="after" name="columnChooserButton" />
                        <Item location="after" name="exportButton" />
                    </Toolbar>
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                    <Grouping autoExpandAll={false} />
                    <ColumnChooser enabled={true} mode="select" />
                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                    <Selection mode="multiple" showCheckBoxesMode="always" />
                    <FilterRow visible applyFilter="auto" />
                    <FilterPanel visible={true} />
                    <FilterBuilderPopup width={700} height={500} />
                    <HeaderFilter visible />
                    <SearchPanel visible width={200} />
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />

                    <Column dataField="name" caption="Name" minWidth={150} />
                    <Column dataField="email" caption="Email" minWidth={180} />
                    <Column dataField="hasDonated" caption="Donated?" width={90} alignment="center"
                        cellRender={(d: any) => (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${d.value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {d.value ? 'YES' : 'NO'}
                            </div>
                        )} />
                    <Column dataField="donationCount" caption="Donation Count" width={110} alignment="right" />
                    <Column dataField="donationTotalAmount" caption="Total Donated" width={120} alignment="right"
                        cellRender={(d: any) => (
                            <span className="font-medium text-xs">
                                {d.data.donationCurrency} {d.value?.toLocaleString() || '0'}
                            </span>
                        )} />
                    <Column dataField="lastDonationAt" caption="Last Donation" width={140} alignment="right" dataType="date" format="dd MMM yyyy" />
                    <Column dataField="provider" caption="Provider" width={90} alignment="center"
                        cellRender={(d: any) => <Badge value={d.value} />} />
                </DataGrid>
            </Card>

            {/* Cohort retention */}
            <Card isLoading={loading && !cohortRetention?.length}>
                <CardTitle title="Cohort retention" sub="% of users returning each week after first visit" />
                <Chart dataSource={cohortRetention} height={260}>
                    <Animation enabled={true} />
                    <ArgumentAxis />
                    <ValueAxis>
                        <Label format={(v: number) => `${v}%`} />
                    </ValueAxis>
                    <Series valueField="pct" argumentField="week" type="splinearea" color="#333333" opacity={0.12} />
                    <Series valueField="pct" argumentField="week" type="spline" color="#000000" width={2.5} />
                    <Legend visible={false} />
                    <Tooltip enabled />
                </Chart>
            </Card>

            {/* Browser + OS + Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card noPadding isLoading={loading && !browserCoverage?.length} skeletonType="table">
                    <div className="p-3 pb-0">
                        <CardTitle title="Browser share" sub="Browser name" />
                    </div>
                    <DataGrid
                        dataSource={browserCoverage}
                        showBorders={false}
                        hoverStateEnabled
                        showColumnLines={false}
                        showRowLines={false}
                        elementAttr={{ class: 'allstories-datagrid' }}
                        allowColumnResizing
                        allowColumnReordering={true}
                        width="100%"
                        onExporting={handleExportingBrowser}
                    >
                        <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                        <Grouping autoExpandAll={false} />
                        <ColumnChooser enabled={true} mode="select" />
                        <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                        <Selection mode="multiple" showCheckBoxesMode="always" />
                        <FilterRow visible applyFilter="auto" />
                        <FilterPanel visible={true} />
                        <FilterBuilderPopup width={700} height={500} />
                        <Paging defaultPageSize={10} />
                        <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                        <HeaderFilter visible />
                        <Column dataField="key" caption="Browser" />
                        <Column dataField="count" caption="Sessions" />
                    </DataGrid>
                </Card>
                <Card noPadding isLoading={loading && !osCoverage?.length} skeletonType="table">
                    <div className="p-3 pb-0">
                        <CardTitle title="OS share" sub="Os name" />
                    </div>
                    <DataGrid
                        dataSource={osCoverage}
                        showBorders={false}
                        hoverStateEnabled
                        showColumnLines={false}
                        showRowLines={false}
                        elementAttr={{ class: 'allstories-datagrid' }}
                        allowColumnResizing
                        allowColumnReordering={true}
                        width="100%"
                        onExporting={handleExportingOS}
                    >
                        <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                        <Grouping autoExpandAll={false} />
                        <ColumnChooser enabled={true} mode="select" />
                        <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                        <Selection mode="multiple" showCheckBoxesMode="always" />
                        <FilterRow visible applyFilter="auto" />
                        <FilterPanel visible={true} />
                        <FilterBuilderPopup width={700} height={500} />
                        <Paging defaultPageSize={10} />
                        <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                        <HeaderFilter visible />
                        <Column dataField="key" caption="OS" />
                        <Column dataField="count" caption="Sessions" />
                    </DataGrid>
                </Card>
                <Card isLoading={loading && !languageSegs?.length} className="col-span-1">
                    <CardTitle title="Language segments" sub="Browser language" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        {languageSegs?.map((l, i) => (
                            <span key={`${l.key}-${i}`} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px', background: '#f5f5f7',
                                borderRadius: 980, border: '1px solid #e2e2e7', fontSize: 12,
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: BAR_COLORS[i % BAR_COLORS.length], display: 'inline-block' }} />
                                {l.key} · {l.count}
                            </span>
                        ))}
                    </div>
                </Card>
            </div>

            {/* High-value users */}
            <Card noPadding isLoading={loading} skeletonType="table">
                <div className="pt-4 px-4">
                    <CardTitle title="High-value user detection" sub="User id · sessions · shares · Page views composite score" />
                </div>
                <DataGrid
                    dataSource={hvDataSource}
                    remoteOperations={true}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    width="100%"
                    onExporting={handleExportingHV}
                >
                    <Toolbar>
                        <Item location="before" name="groupPanel" />
                        <Item location="after" name="searchPanel" />
                        <Item location="after" name="columnChooserButton" />
                        <Item location="after" name="exportButton" />
                    </Toolbar>
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                    <Grouping autoExpandAll={false} />
                    <ColumnChooser enabled={true} mode="select" />
                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                    <Selection mode="multiple" showCheckBoxesMode="always" />
                    <FilterRow visible applyFilter="auto" />
                    <FilterPanel visible={true} />
                    <FilterBuilderPopup width={700} height={500} />
                    <HeaderFilter visible />
                    <SearchPanel visible width={200} />
                    <Paging defaultPageSize={HV_PAGE_SIZE} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />

                    <Column dataField="user_id" caption="User" minWidth={150} />
                    <Column dataField="sessions" caption="Sessions" width={80} alignment="right" />
                    <Column dataField="page_views" caption="Page views" width={90} alignment="right" />
                    <Column dataField="shares" caption="Shares" width={70} alignment="right" />
                    <Column dataField="top_category" caption="Top category" width={110}
                        cellRender={(d: any) => <Badge value={d.value} />} />
                    <Column dataField="score" caption="Value score" width={150}
                        cellRender={(d: any) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ProgressBar pct={Math.round((d.value / (hvMaxScore || 1)) * 100)} color="#333333" />
                                <span style={{ fontSize: 11, fontWeight: 600, width: 36, textAlign: 'right' }}>{d.value}</span>
                            </div>
                        )} />
                </DataGrid>
            </Card>
        </div>
    );
};