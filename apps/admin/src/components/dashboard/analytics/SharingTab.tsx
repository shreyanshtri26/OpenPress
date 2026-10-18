import React, { useState, useEffect, useRef } from 'react';
import DataGrid, {
    Column,
    Paging,
    FilterRow,
    SearchPanel,
    HeaderFilter,
    Toolbar,
    Item,
    GroupPanel,
    Grouping,
    ColumnChooser,
    Export,
    Selection,
    Pager,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/dx/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/dx/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/dx/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import PieChart, { Series as PieSeries, Label as PieLabel, Connector, Animation } from '@/components/ui/dx/pie-chart';
import { Card, CardTitle, KpiTile, ProgressBar } from './AnalyticsUIComponents';
import { BAR_COLORS, fetchAggregated } from '../../../utils/analyticsUtils';
import { SharingEvent, SharingByPlatformItem, SharingByUserItem } from '../../../types/analytics';

interface SharingTabProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

export const SharingTab = ({
    fromDate,
    toDate,
    selectedUserId,
    cachedData,
    onCacheUpdate,
}: SharingTabProps) => {
    const [loading, setLoading] = useState(!cachedData);
    const [counts, setCounts] = useState(cachedData?.counts || {
        total_shares: 0,
        total_views: 0,
    });
    const [shareByPlatform, setShareByPlatform] = useState<SharingByPlatformItem[]>(cachedData?.shareByPlatform || []);
    const [sharesByUser, setSharesByUser] = useState<SharingByUserItem[]>(cachedData?.sharesByUser || []);
    const [sharingLogs, setSharingLogs] = useState<SharingEvent[]>(cachedData?.sharingLogs || []);
    const [daysInRange, setDaysInRange] = useState(cachedData?.daysInRange || 30);

    const lastFetchKeyRef = useRef<string | null>(cachedData?.filterKey ?? null);

    const handleExportingUser = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Shares by User');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Sharing_Shares_by_User.xlsx');
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
                doc.save('Sharing_Shares_by_User.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingEvents = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Sharing and Ad Events');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Sharing_and_Ad_Events.xlsx');
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
                doc.save('Sharing_and_Ad_Events.pdf');
            });
            e.cancel = true;
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const currentKey = `${fromDate}|${toDate}|${selectedUserId}`;

        const fetchData = async () => {
            if (lastFetchKeyRef.current === currentKey) return;
            setLoading(true);
            const params: Record<string, string> = { from: fromDate, to: toDate };
            if (selectedUserId) params.user_id = selectedUserId;

            try {
                const start = new Date(fromDate);
                const end = new Date(toDate);
                const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
                setDaysInRange(diff > 0 ? diff : 1);

                const p1 = fetchAggregated<{
                    total_shares: number;
                    total_views: number;
                }>('stats/sharing/counts', params, 3, signal).then(res => { setCounts(res); return res; });
                const p2 = fetchAggregated<{ data: SharingByPlatformItem[] }>('stats/sharing/by-platform', params, 3, signal).then(res => { setShareByPlatform(res.data); return res.data; });
                const p3 = fetchAggregated<{ data: SharingByUserItem[] }>('table/sharing/by-user', params, 3, signal).then(res => { setSharesByUser(res.data); return res.data; });
                const p4 = fetchAggregated<{ data: SharingEvent[] }>('table/sharing/events', params, 3, signal).then(res => { setSharingLogs(res.data); return res.data; });

                const [c, sbp, sbu, logs] = await Promise.all([p1, p2, p3, p4]);

                onCacheUpdate({
                    counts: c,
                    shareByPlatform: sbp,
                    sharesByUser: sbu,
                    sharingLogs: logs,
                    daysInRange: diff > 0 ? diff : 1,
                    filterKey: currentKey
                });
                lastFetchKeyRef.current = currentKey;
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Sharing data fetch failed", e);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [fromDate, toDate, selectedUserId]);

    const totalSharesGlobal = counts.total_shares;
    const totalPageViews = counts.total_views;
    const totalShares = counts.total_shares;

    return (
        <div className="flex flex-col gap-6">

            {/* KPIs */}
            <div className="bg-white p-3 flex flex-wrap items-center gap-y-5 gap-x-3 sm:gap-x-6 mb-8 rounded-2xl">
                <KpiTile 
                    isLoading={loading && counts.total_shares === 0 && counts.total_views === 0}
                    label="Total shares" value={totalSharesGlobal.toLocaleString()} sub="share events" trend="up" trendLabel="40%" showArrow />
                <KpiTile 
                    isLoading={loading && counts.total_shares === 0 && counts.total_views === 0}
                    label="Avg Shares / day" value={(totalSharesGlobal / (daysInRange || 1)).toFixed(1)} sub={`${daysInRange} day period`} showArrow />
                <KpiTile
                    isLoading={loading && counts.total_shares === 0 && counts.total_views === 0}
                    label="Share Conversion"
                    value={totalPageViews ? ((totalSharesGlobal / totalPageViews) * 100).toFixed(1) + '%' : '0%'}
                    sub="views to shares"
                    trend="up"
                    trendLabel="1.2%"
                />
            </div>

            {/* Share by platform + pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card isLoading={loading && !shareByPlatform.length}>
                    <CardTitle title="Shares by platform" sub="Share platform breakdown" />
                    {shareByPlatform.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                            {shareByPlatform.map((s, i) => (
                                <div key={s.platform} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 90, fontSize: 13, fontWeight: 500, color: '#0f172a', flexShrink: 0, textTransform: 'capitalize' }}>
                                        {s.platform.replace('_', ' ')}
                                    </div>
                                    <div style={{ flex: 1, height: 28, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                                        <div style={{
                                            width: `${Math.round((s.count / (shareByPlatform[0]?.count || 1)) * 100)}%`,
                                            height: '100%',
                                            background: BAR_COLORS[i % BAR_COLORS.length],
                                            borderRadius: 6,
                                            opacity: 0.85,
                                        }} />
                                        <span style={{ position: 'absolute', left: 10, top: 5, fontSize: 12, fontWeight: 600, color: '#fff' }}>
                                            {s.count} shares
                                        </span>
                                    </div>
                                    <div style={{ width: 40, fontSize: 12, color: '#64748b', textAlign: 'right', flexShrink: 0 }}>
                                        {Math.round((s.count / totalShares) * 100)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: 24, color: '#86868b', fontSize: 13 }}>No share events found.</div>
                    )}
                </Card>

                <Card isLoading={loading && !shareByPlatform.length}>
                    <CardTitle title="Platform share distribution" sub="% of total shares per platform" />
                    <PieChart dataSource={shareByPlatform} height={280} palette={BAR_COLORS as any}>
                        <Animation enabled={true} />
                        <PieSeries argumentField="platform" valueField="count">
                            <PieLabel visible position="outside">
                                <Connector visible />
                            </PieLabel>
                        </PieSeries>
                    </PieChart>
                </Card>
            </div>

            {/* Shares by user */}
            <Card noPadding isLoading={loading && !sharesByUser.length} skeletonType="table">
                <div className="pt-4 px-4">
                    <CardTitle title="Shares by user" sub="User id · total shares · top platform · platforms used" />
                </div>
                <DataGrid
                    dataSource={sharesByUser}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    width="100%"
                    onExporting={handleExportingUser}
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
                    <SearchPanel visible width={250} />
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                    <Column dataField="user_id" caption="User" alignment="left" minWidth={250} />
                    <Column dataField="total" caption="Total shares" width={100} alignment="left" />
                    <Column dataField="top_platform" caption="Top platform" width={120} alignment="left"
                        cellRender={(d: any) => (
                            <span style={{ textTransform: 'capitalize' }}>{d.value.replace('_', ' ')}</span>
                        )} />
                    <Column dataField="platforms_used" caption="Platforms used" width={110} alignment="left" />
                    <Column caption="Share bar" alignment="left"
                        cellRender={(d: any) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ProgressBar pct={Math.round((d.data.total / (sharesByUser[0]?.total || 1)) * 100)} color="#333333" />
                                <span style={{ fontSize: 11, fontWeight: 600, width: 24 }}>{d.data.total}</span>
                            </div>
                        )} />
                </DataGrid>
            </Card>

            {/* All sharing events raw grid */}
            <Card noPadding isLoading={loading && !sharingLogs.length} skeletonType="table">
                <div className="pt-4 px-4">
                    <CardTitle title="Sharing and ad events" sub="Includes share, ad impression, and ad click events" />
                </div>
                <DataGrid
                    dataSource={sharingLogs.filter(e => ['share_button_click', 'ad_click', 'ad_impression', 'click', 'impression', 'render'].includes((e.event_type || '').toLowerCase()))}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    width="100%"
                    onExporting={handleExportingEvents}
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
                    <SearchPanel visible width={250} />
                    <Paging defaultPageSize={15} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 15, 20, 50, 'all']} />
                    <Column dataField="user_id" caption="User" alignment="left" width={220} />
                    <Column dataField="session_id" caption="Session" alignment="left" width={220} />
                    <Column dataField="event_type" caption="Event type" alignment="left" />
                    <Column dataField="share_platform" caption="Platform" alignment="left" width={120}
                        cellRender={(d: any) => d.value ? <span style={{ textTransform: 'capitalize' }}>{d.value.replace('_', ' ')}</span> : '—'} />
                    <Column dataField="event_timestamp_ms" caption="Timestamp" alignment="left" width={180}
                        cellRender={(d: any) => new Date(d.value).toISOString().slice(0, 19).replace('T', ' ')} />
                </DataGrid>
            </Card>
        </div>
    );
};