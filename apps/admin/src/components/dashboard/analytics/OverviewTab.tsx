import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DataGrid, {
    Column,
    Paging,
    FilterRow,
    HeaderFilter,
    GroupPanel,
    Grouping,
    ColumnChooser,
    Export,
    Selection,
    Pager,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/kit/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/kit/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Chart, Series, ArgumentAxis, ValueAxis, Legend, Tooltip } from '@/components/ui/kit/chart';
import { Card, CardTitle, KpiTile } from './AnalyticsUIComponents';
import { BAR_COLORS, fmtMs, fetchAggregated } from '../../../utils/analyticsUtils';
import { 
    OverviewCounts, 
    PerformanceChartItem, 
    NewVsReturningItem, 
    TrafficSourceItem, 
    FunnelItem, 
    SessionFrequencyItem,
    RealtimeSummary 
} from '../../../types/analytics';

interface OverviewTabProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    onGoToRealtime: () => void;
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

export const OverviewTab = ({
    fromDate,
    toDate,
    selectedUserId,
    onGoToRealtime,
    cachedData,
    onCacheUpdate,
}: OverviewTabProps) => {
    const [loading, setLoading] = useState(!cachedData);
    const [counts, setCounts] = useState<OverviewCounts | null>(cachedData?.counts || null);
    const [performanceData, setPerformanceData] = useState<PerformanceChartItem[]>(cachedData?.performanceData || []);
    const [newVsRetData, setNewVsRetData] = useState<NewVsReturningItem[]>(cachedData?.newVsRetData || []);
    const [trafficData, setTrafficData] = useState<TrafficSourceItem[]>(cachedData?.trafficData || []);
    const [funnelData, setFunnelData] = useState<FunnelItem[]>(cachedData?.funnelData || []);
    const [freqData, setFreqData] = useState<SessionFrequencyItem[]>(cachedData?.freqData || []);
    const [realtimeData, setRealtimeData] = useState<RealtimeSummary | null>(cachedData?.realtimeData || null);
    const [chartMetric, setChartMetric] = useState<'views' | 'active_users' | 'new_users' | 'sessions_per_user'>('views');

    const [trafficPage, setTrafficPage] = useState(1);
    const [trafficTotal, setTrafficTotal] = useState(cachedData?.trafficTotal || 0);
    const PAGE_SIZE = 10;

    const handleExportingNewVsRet = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('New vs Returning');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Overview_New_vs_Returning.xlsx');
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
                doc.save('Overview_New_vs_Returning.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingTraffic = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Traffic Sources');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Overview_Traffic_Sources.xlsx');
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
                doc.save('Overview_Traffic_Sources.pdf');
            });
            e.cancel = true;
        }
    }, []);

    // Tracks the filter combination already fetched by THIS component instance,
    // independent of the parent-supplied cachedData prop (which lags a render
    // behind on filter change and would otherwise cause skipped/duplicate fetches).
    const lastFetchKeyRef = useRef<string | null>(cachedData?.filterKey ?? null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        const currentKey = `${fromDate}|${toDate}|${selectedUserId}`;

        const fetchData = async (silent = false) => {
            if (!silent && lastFetchKeyRef.current === currentKey) return;
            if (!silent) setLoading(true);
            const params: Record<string, string> = { from: fromDate, to: toDate };
            if (selectedUserId) params.user_id = selectedUserId;
            
            try {
                // Priority defaults to 1
                const p1 = fetchAggregated<OverviewCounts>('stats/overview/counts', params, 3, signal).then(res => { setCounts(res); return res; });
                const p2 = fetchAggregated<{ data: NewVsReturningItem[] }>('stats/overview/new-vs-returning', params, 3, signal).then(res => { setNewVsRetData(res.data); return res.data; });
                const p3 = fetchAggregated<{ data: TrafficSourceItem[], total: number }>('table/overview/traffic-sources', { 
                    ...params, 
                    offset: String((trafficPage - 1) * PAGE_SIZE), 
                    limit: String(PAGE_SIZE) 
                }, 3, signal).then(res => { setTrafficData(res.data); setTrafficTotal(res.total); return res; });
                const p4 = fetchAggregated<{ data: FunnelItem[] }>('stats/overview/funnel', params, 3, signal).then(res => { setFunnelData(res.data); return res.data; });
                const p5 = fetchAggregated<{ data: SessionFrequencyItem[] }>('chart/overview/session-frequency', params, 3, signal).then(res => { setFreqData(res.data); return res.data; });

                const [c, nvr, t, f, fr] = await Promise.all([p1, p2, p3, p4, p5]);

                onCacheUpdate({
                    counts: c,
                    newVsRetData: nvr,
                    trafficData: t.data,
                    trafficTotal: t.total,
                    funnelData: f,
                    freqData: fr,
                    trafficPage,
                    filterKey: currentKey
                });
                lastFetchKeyRef.current = currentKey;
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Overview data fetch failed", e);
                }
            } finally {
                if (!signal.aborted && !silent) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [fromDate, toDate, selectedUserId]);

    const fetchRealtime = async () => {
        try {
            const res = await fetchAggregated<RealtimeSummary>('realtime/summary', {}, 3, undefined, 2, true);
            setRealtimeData(res);
            onCacheUpdate({ realtimeData: res });
        } catch (e: any) {
            console.error("Realtime fetch failed", e);
        }
    };

    const fetchPerformance = async () => {
        const currentKey = `${fromDate}|${toDate}|${selectedUserId}|${chartMetric}`;
        // If we have cached performance data for THIS filter+metric combo, don't refetch
        if (cachedData?.performanceData && cachedData?.performanceKey === currentKey) return;

        const params: Record<string, string> = { from: fromDate, to: toDate, metric: chartMetric };
        if (selectedUserId) params.user_id = selectedUserId;
        try {
            const res = await fetchAggregated<{ data: PerformanceChartItem[] }>('chart/overview/performance', params);
            setPerformanceData(res.data);

            // Also update cache with new performance data
            onCacheUpdate({
                performanceData: res.data,
                performanceMetric: chartMetric,
                performanceKey: currentKey
            });
        } catch (e: any) {
            console.error("Performance chart fetch failed", e);
        }
    };

    useEffect(() => {
        setTrafficPage(1); 
        fetchRealtime();
        
        const interval = setInterval(() => fetchRealtime(), 30000);
        return () => {
            clearInterval(interval);
        };
    }, [fromDate, toDate, selectedUserId]);

    useEffect(() => {
        fetchPerformance();
    }, [chartMetric, fromDate, toDate, selectedUserId]);

    useEffect(() => {
        if (!cachedData) return;
        // If we're on page 1 and have cached data, don't refetch on mount
        if (trafficPage === 1 && cachedData.trafficData) return;

        const fetchTrafficPage = async () => {
            const params: Record<string, string> = { from: fromDate, to: toDate };
            if (selectedUserId) params.user_id = selectedUserId;
            try {
                const t = await fetchAggregated<{ data: TrafficSourceItem[], total: number }>('table/overview/traffic-sources', { 
                    ...params, 
                    offset: String((trafficPage - 1) * PAGE_SIZE), 
                    limit: String(PAGE_SIZE) 
                });
                setTrafficData(t.data);
                setTrafficTotal(t.total);
            } catch (e) {
                console.error("Traffic page fetch failed", e);
            }
        };
        fetchTrafficPage();
    }, [trafficPage]);

    const performanceDataSource = performanceData.map(d => ({ ...d, hour: d.day, [chartMetric]: d.value }));

    const mappedNewVsRetData = useMemo(() => {
        return newVsRetData.map((item, index) => ({
            ...item,
            id: item.type || `nvr-${index}`,
        }));
    }, [newVsRetData]);

    const mappedTrafficData = useMemo(() => {
        return trafficData.map((item, index) => ({
            ...item,
            id: item.source ? `${item.source}-${index}` : `traffic-${index}`,
        }));
    }, [trafficData]);

    const customizeTooltip = (arg: any) => {
        const metricLabels: Record<string, string> = {
            views: 'Page views',
            active_users: 'Individual visitors',
            new_users: 'First-time visitors',
            sessions_per_user: 'Visits per person'
        };
        const descriptions: Record<string, string> = {
            views: 'Total page loads.',
            active_users: 'Unique people visiting.',
            new_users: 'First-time visitors.',
            sessions_per_user: 'Average visits per person.'
        };
        
        return {
            html: `
                <div class="p-2 font-sans">
                    <div class="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">${metricLabels[chartMetric]}</div>
                    <div class="text-lg font-black text-slate-900">${arg.valueText}</div>
                    <div class="text-[11px] text-slate-500 mt-1 leading-relaxed border-t border-slate-100 pt-1">
                        ${descriptions[chartMetric]}
                    </div>
                </div>
            `
        };
    };

    const customizeFrequencyTooltip = (arg: any) => {
        return {
            html: `
                <div class="p-2 font-sans">
                    <div class="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1 border border-black">Session Frequency</div>
                    <div class="text-lg font-black text-slate-900">${arg.valueText} users</div>
                    <div class="text-[11px] text-slate-500 mt-1 leading-relaxed border-t border-slate-100 pt-1">
                        This shows how many people visited the site exactly <b>${arg.argumentText}</b> times.
                    </div>
                </div>
            `
        };
    };

    const realtimeDataAgg = realtimeData ? {
        activeUsers: realtimeData.active_users,
        views: realtimeData.views_last_30m,
        topPages: realtimeData.top_pages,
        topCities: realtimeData.top_cities,
        minutes: realtimeData.minutes,
        lastUpdate: realtimeData.last_update
    } : null;

    return (
        <div className="flex flex-col gap-6">

            {/* KPI row */}
            <div className="bg-white p-3 flex flex-wrap items-center gap-y-5 gap-x-3 sm:gap-x-6 rounded-2xl">
                <KpiTile 
                    isLoading={loading && !counts}
                    label="Total sessions" value={counts?.total_sessions.toLocaleString() ?? '—'} sub={`${counts?.total_page_views.toLocaleString() ?? '—'} views`} showArrow trend="up" trendLabel="12%" />
                <KpiTile 
                    isLoading={loading && !counts}
                    label="Active users" value={counts?.active_users.toLocaleString() ?? '—'} sub="Across audience" showArrow trend="up" trendLabel="4%" />
                <KpiTile 
                    isLoading={loading && !counts}
                    label="Total events" value={counts?.total_events.toLocaleString() ?? '—'} sub="Layer records" showArrow trend="up" trendLabel="21%" />
                <KpiTile 
                    isLoading={loading && !counts}
                    label="Avg time on page" value={fmtMs(counts?.avg_time_on_page_ms ?? 0)} sub="Engagement" trend="down" trendLabel="2%" />
            </div>

            {/* Sessions over time + Realtime widget */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
                {/* Performance Overview Card */}
                <Card isLoading={loading && !performanceData.length}>
                    <div className="flex items-center justify-between pb-3 mb-2">
                        <h3 className="text-md font-semibold text-slate-900 tracking-tight">
                            Performance Overview
                        </h3>
                    </div>

                    {/* Metric tabs — horizontal strip at top */}
                    <div className="flex items-stretch border-b border-slate-200 mb-5 -mx-6 px-6 gap-0 overflow-x-auto">
                        {[
                            { id: 'views', label: 'Views', value: counts?.total_page_views.toLocaleString() ?? '—' },
                            { id: 'active_users', label: 'Active users', value: counts?.active_users.toLocaleString() ?? '—' },
                            { id: 'new_users', label: 'New users', value: newVsRetData.find(r => r.type === 'New users')?.count.toLocaleString() ?? '0' },
                            { id: 'sessions_per_user', label: 'Sessions per user', value: counts?.active_users ? (counts.total_sessions / counts.active_users).toFixed(1) : '—' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setChartMetric(m.id as any)}
                                className={`flex flex-col items-start px-5 py-3 transition-all border-b-2 whitespace-nowrap mr-2 ${chartMetric === m.id
                                    ? 'border-black text-black'
                                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-slate-300'}`}
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest mb-0.5">{m.label}</span>
                                <span className="text-xl font-black tracking-tight">{m.value}</span>
                            </button>
                        ))}
                    </div>

                    {/* Full-width chart */}
                    <Chart dataSource={performanceDataSource} height={240}>
                        <ArgumentAxis />
                        <ValueAxis />
                        <Series valueField={chartMetric} argumentField="hour" type="spline" color="#000000" width={2} />
                        <Legend visible={false} />
                        <Tooltip enabled customizeTooltip={customizeTooltip} />
                    </Chart>
                </Card>

                {/* GA-style Realtime Widget */}
                <Card isLoading={loading && !realtimeData}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Active users in last 30 minutes</p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-4xl font-black text-slate-900">
                                    {realtimeDataAgg?.activeUsers ?? '—'}
                                </span>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Live</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {realtimeDataAgg?.minutes && realtimeDataAgg.minutes.length > 0 ? (
                        <Chart dataSource={realtimeDataAgg.minutes} height={80} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                            <ArgumentAxis visible={false} />
                            <ValueAxis visible={false} />
                            <Series valueField="count" argumentField="minute" type="bar" color="#1a1a1a" cornerRadius={1} />
                            <Legend visible={false} />
                            <Tooltip enabled />
                        </Chart>
                    ) : (
                        <div className="h-[80px] flex items-center justify-center text-[10px] text-slate-400">No data</div>
                    )}

                    {/* Top Cities */}
                    {realtimeDataAgg?.topCities && realtimeDataAgg.topCities.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">City</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Active Users</span>
                            </div>
                            {realtimeDataAgg.topCities.map((c, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                                    <span className="text-[11px] font-medium text-slate-700 truncate">{c.city}</span>
                                    <span className="text-[11px] font-bold text-slate-900 ml-2">{c.count}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onGoToRealtime}
                        className="mt-4 w-full flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors group"
                    >
                        View realtime
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </Card>
            </div>

            {/* New vs returning + traffic source */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card isLoading={loading && !newVsRetData.length} skeletonType="table">
                    <div className="p-1">
                        <CardTitle title="New vs returning users" sub="User distribution by session count" />
                    </div>
                    <DataGrid
                        dataSource={mappedNewVsRetData}
                        keyExpr="id"
                        showBorders={false}
                        hoverStateEnabled
                        showColumnLines={false}
                        showRowLines={true}
                        elementAttr={{ class: 'allstories-datagrid' }}
                        allowColumnResizing
                        allowColumnReordering={true}
                        height={360}
                        onExporting={handleExportingNewVsRet}
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
                        <Column dataField="type" caption="User Type" />
                        <Column dataField="count" caption="Users" />
                    </DataGrid>
                </Card>
                <Card isLoading={loading && !trafficData.length} skeletonType="table">
                    <div className="p-1">
                        <CardTitle title="Traffic sources" sub="Descending order by count" />
                    </div>
                    <DataGrid
                        dataSource={mappedTrafficData}
                        keyExpr="id"
                        showBorders={false}
                        hoverStateEnabled
                        showColumnLines={false}
                        showRowLines={true}
                        elementAttr={{ class: 'allstories-datagrid' }}
                        allowColumnResizing
                        allowColumnReordering={true}
                        height={360}
                        onExporting={handleExportingTraffic}
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
                        <Column dataField="source" caption="Source Name" />
                        <Column dataField="count" caption="Sessions" />
                    </DataGrid>

                    {/* Pagination */}
                    {trafficTotal > PAGE_SIZE && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 px-1">
                            <span className="text-[10px] text-slate-500 font-medium">
                                {(trafficPage - 1) * PAGE_SIZE + 1}–{Math.min(trafficPage * PAGE_SIZE, trafficTotal)} of {trafficTotal}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setTrafficPage(p => p - 1)}
                                    disabled={trafficPage === 1}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-bold text-slate-700 min-w-[40px] text-center">
                                    {trafficPage} / {Math.ceil(trafficTotal / PAGE_SIZE)}
                                </span>
                                <button
                                    onClick={() => setTrafficPage(p => p + 1)}
                                    disabled={trafficPage >= Math.ceil(trafficTotal / PAGE_SIZE)}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Funnel + session frequency */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card isLoading={loading && !funnelData.length} className="lg:col-span-1">
                    <CardTitle title="Engagement funnel" sub="Per session" />
                    {funnelData.map((f, i) => {
                        const monoColors = ['#1a1a1a', '#4a4a4a', '#7a7a7a', '#aaaaaa'];
                        const textColor = i < 2 ? '#ffffff' : '#222222';
                        return (
                            <div key={f.stage} className="flex items-center gap-2 mb-2 group relative">
                                <div className="w-[90px] text-[12px] text-gray-500 shrink-0">{f.stage}</div>
                                <div
                                    className="flex-1 h-[36px] rounded-[4px] flex items-center px-[10px] text-[11px] font-semibold cursor-help"
                                    style={{ background: monoColors[i] || '#cccccc', color: textColor }}
                                >
                                    {f.pct}% · {f.count.toLocaleString()}
                                </div>
                                
                                {/* Simple Tooltip for Funnel */}
                                <div className="absolute left-[100px] top-0 z-50 hidden group-hover:block bg-white border border-black shadow-sm rounded-lg p-3 w-48 pointer-events-none">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">${f.stage}</div>
                                    <div className="text-[11px] text-slate-600 leading-relaxed font-normal">
                                        ${
                                            f.stage === 'Sessions' ? 'Total visits counted during this period.' :
                                            f.stage === 'Page views' ? 'Total number of pages read by users.' :
                                            f.stage === '2m+ reading' ? 'Users who spent at least 2 minutes reading a page.' :
                                            'Users who clicked a share button or performed a signup action.'
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </Card>
                <Card isLoading={loading && !freqData.length} className="lg:col-span-2">
                    <CardTitle title="Session frequency distribution" sub="Sessions per user" />
                    <Chart dataSource={freqData} height={260}>
                        <ArgumentAxis />
                        <Series valueField="v" argumentField="k" type="bar" color="#1a1a1a" cornerRadius={3} />
                        <Legend visible={false} />
                        <Tooltip enabled customizeTooltip={customizeFrequencyTooltip} />
                    </Chart>
                </Card>
            </div>
        </div>
    );
};
