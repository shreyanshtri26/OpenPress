import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
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
import { Chart, Series, ValueAxis, ArgumentAxis, Legend, Tooltip } from '@/components/ui/dx/chart';
import { Card, CardTitle, KpiTile } from './AnalyticsUIComponents';
import { BAR_COLORS } from '../../../utils/analyticsUtils';
import { UserContext } from '../../../context/UserContext';
import apiFetch from '../../../utils/api';
import env from '../../../utils/env';

interface AdsJobRow {
    jobId: string;
    placement: string;
    adFormat: string;
    impressions: number;
    clicks: number;
    ctr: string;
}

interface AdsCampaignRow {
    campaignId: string;
    campaignName: string;
    advertiserName: string;
    status: string;
    type: string;
    impressions: number;
    clicks: number;
    ctr: string;
    startTime: string | null;
    endTime: string | null;
    jobs: AdsJobRow[];
}

interface AdsTabProps {
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

const REFRESH_MS = 30_000;

export const AdsTab = ({ cachedData, onCacheUpdate }: AdsTabProps) => {
    const { user } = useContext(UserContext) ?? {};
    const token = user?.token;

    const handleExportingCampaigns = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Campaigns Performance');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Ads_Campaign_Performance.xlsx');
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
                doc.save('Ads_Campaign_Performance.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingJobs = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Job Level Performance');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Ads_Job_Level_Performance.xlsx');
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
                doc.save('Ads_Job_Level_Performance.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);

    const [loading, setLoading] = useState(!cachedData);
    const [campaigns, setCampaigns] = useState<AdsCampaignRow[]>(cachedData?.campaigns || []);
    const [lastUpdated, setLastUpdated] = useState<string>(cachedData?.lastUpdated || '');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiFetch(`${env.backendApi}/getCampaigns`, {
                method: 'GET',
                headers: authHeaders,
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            const rows: AdsCampaignRow[] = (json.campaigns || []).map((c: any) => ({
                campaignId: c.campaignId,
                campaignName: c.campaignName || '—',
                advertiserName: c.advertiserName || '—',
                status: c.status || '—',
                type: c.type || '—',
                impressions: Number(c.impressions || 0),
                clicks: Number(c.clicks || 0),
                ctr: c.ctr || '0%',
                startTime: c.startTime || null,
                endTime: c.endTime || null,
                jobs: (c.jobs || []).map((j: any) => ({
                    jobId: j.jobId || '',
                    placement: j.placement || '—',
                    adFormat: j.adFormat || '—',
                    impressions: Number(j.impressions || 0),
                    clicks: Number(j.clicks || 0),
                    ctr: j.ctr || '0%',
                })),
            }));
            const now = new Date().toLocaleTimeString();
            setCampaigns(rows);
            setLastUpdated(now);
            onCacheUpdate({ campaigns: rows, lastUpdated: now });
        } catch (e) {
            console.error('[AdsTab] fetch failed', e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(() => fetchData(true), REFRESH_MS);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [token]);

    const totals = useMemo(() => {
        const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
        const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        const active = campaigns.filter(c => ['start_now', 'active', 'running'].includes(c.status.toLowerCase())).length;
        return { impressions, clicks, ctr, active };
    }, [campaigns]);

    // Aggregate by placement type for the bar chart
    const byType = useMemo(() => {
        const map: Record<string, { impressions: number; clicks: number }> = {};
        campaigns.forEach(c => {
            const t = c.type || 'standard';
            if (!map[t]) map[t] = { impressions: 0, clicks: 0 };
            map[t].impressions += c.impressions;
            map[t].clicks += c.clicks;
        });
        return Object.entries(map)
            .map(([type, v]) => ({ type, ...v }))
            .sort((a, b) => b.impressions - a.impressions);
    }, [campaigns]);

    return (
        <div className="flex flex-col gap-6">

            {/* KPIs */}
            <div className="bg-white p-3 flex flex-wrap items-center gap-y-5 gap-x-3 sm:gap-x-6 mb-2 rounded-2xl">
                <KpiTile
                    isLoading={loading && totals.impressions === 0}
                    label="Total impressions" value={totals.impressions.toLocaleString()} sub="across all campaigns" showArrow />
                <KpiTile
                    isLoading={loading && totals.clicks === 0}
                    label="Total clicks" value={totals.clicks.toLocaleString()} sub="across all campaigns" showArrow />
                <KpiTile
                    isLoading={loading && totals.impressions === 0}
                    label="Avg CTR" value={`${totals.ctr}%`} sub="clicks / impressions" showArrow />
                <KpiTile
                    isLoading={loading}
                    label="Active campaigns" value={String(totals.active)} sub="currently running" />
                <div className="ml-auto text-[10px] font-mono text-gray-400 uppercase tracking-widest self-end pb-1">
                    {lastUpdated ? `Updated ${lastUpdated}` : ''}
                    <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse align-middle" />
                </div>
            </div>

            {/* Impressions & Clicks by type */}
            {byType.length > 0 && (
                <Card isLoading={loading && byType.length === 0}>
                    <CardTitle title="Performance by placement type" sub="Impressions and clicks grouped by ad type" />
                    <Chart
                        dataSource={byType}
                        height={240}
                        palette={BAR_COLORS as any}
                    >
                        <Series valueField="impressions" argumentField="type" name="Impressions" type="bar" />
                        <Series valueField="clicks" argumentField="type" name="Clicks" type="bar" />
                        <ArgumentAxis />
                        <ValueAxis />
                        <Legend verticalAlignment="bottom" horizontalAlignment="center" />
                        <Tooltip enabled />
                    </Chart>
                </Card>
            )}

            {/* Campaign breakdown table */}
            <Card noPadding isLoading={loading && !campaigns.length} skeletonType="table">
                <div className="pt-4 px-4">
                    <CardTitle title="Campaign performance" sub="Impressions · clicks · CTR per campaign" />
                </div>
                <DataGrid
                    dataSource={campaigns}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    width="100%"
                    rowAlternationEnabled
                    onExporting={handleExportingCampaigns}
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
                    <SearchPanel visible width={240} />
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                    <Column dataField="campaignName" caption="Campaign" alignment="left" minWidth={180} />
                    <Column dataField="advertiserName" caption="Advertiser" alignment="left" width={130} />
                    <Column dataField="type" caption="Type" alignment="left" width={120}
                        cellRender={(d: any) => (
                            <span className="capitalize text-xs font-semibold px-1.5 py-0.5 bg-slate-100 rounded">
                                {d.value}
                            </span>
                        )} />
                    <Column dataField="status" caption="Status" alignment="left" width={100}
                        cellRender={(d: any) => {
                            const active = ['start_now', 'active', 'running'].includes((d.value || '').toLowerCase());
                            return (
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {d.value}
                                </span>
                            );
                        }} />
                    <Column dataField="impressions" caption="Impressions" dataType="number" format="#,##0" alignment="right" width={110} sortOrder="desc" />
                    <Column dataField="clicks" caption="Clicks" dataType="number" format="#,##0" alignment="right" width={80} />
                    <Column dataField="ctr" caption="CTR" alignment="right" width={70} />
                    <Column dataField="startTime" caption="Start" alignment="left" width={130}
                        cellRender={(d: any) => d.value ? new Date(d.value).toLocaleDateString('en-GB') : '—'} />
                    <Column dataField="endTime" caption="End" alignment="left" width={130}
                        cellRender={(d: any) => d.value ? new Date(d.value).toLocaleDateString('en-GB') : '—'} />
                </DataGrid>
            </Card>

            {/* Job-level breakdown — only rendered when at least one job has tracked data */}
            {campaigns.some(c => c.jobs?.some(j => j.impressions > 0 || j.clicks > 0)) && (
                <Card noPadding isLoading={loading && !campaigns.length} skeletonType="table">
                    <div className="pt-4 px-4">
                        <CardTitle title="Job-level performance" sub="Impressions · clicks · CTR per placement" />
                    </div>
                    <DataGrid
                        dataSource={campaigns.flatMap(c =>
                            (c.jobs || []).map(j => ({ ...j, campaignName: c.campaignName }))
                        )}
                        showBorders={false}
                        hoverStateEnabled
                        showColumnLines={false}
                        showRowLines={false}
                        elementAttr={{ class: 'allstories-datagrid' }}
                        allowColumnResizing
                        allowColumnReordering={true}
                        width="100%"
                        rowAlternationEnabled
                        onExporting={handleExportingJobs}
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
                        <SearchPanel visible width={240} />
                        <Paging defaultPageSize={10} />
                        <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                        <Column dataField="campaignName" caption="Campaign" alignment="left" minWidth={150} />
                        <Column dataField="placement" caption="Placement" alignment="left" minWidth={160} />
                        <Column dataField="adFormat" caption="Format" alignment="left" width={120}
                            cellRender={(d: any) => (
                                <span className="capitalize text-xs font-semibold px-1.5 py-0.5 bg-slate-100 rounded">
                                    {d.value}
                                </span>
                            )} />
                        <Column dataField="impressions" caption="Impressions" dataType="number" format="#,##0" alignment="right" width={110} sortOrder="desc" />
                        <Column dataField="clicks" caption="Clicks" dataType="number" format="#,##0" alignment="right" width={80} />
                        <Column dataField="ctr" caption="CTR" alignment="right" width={70} />
                    </DataGrid>
                </Card>
            )}
        </div>
    );
};
