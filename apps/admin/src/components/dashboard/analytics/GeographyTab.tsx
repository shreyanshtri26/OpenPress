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
import { Card, CardTitle, Badge, ProgressBar } from './AnalyticsUIComponents';
import { BAR_COLORS, fmtMs, fetchAggregated } from '../../../utils/analyticsUtils';
import { 
    TopCountryItem, 
    RegionCategoryPrefItem, 
    TopLocalityItem 
} from '../../../types/analytics';

interface GeographyTabProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

export const GeographyTab = ({
    fromDate,
    toDate,
    selectedUserId,
    cachedData,
    onCacheUpdate,
}: GeographyTabProps) => {
    const [loading, setLoading] = useState(!cachedData);
    const [topCountries, setTopCountries] = useState<TopCountryItem[]>(cachedData?.topCountries || []);
    const [regionCategoryPref, setRegionCategoryPref] = useState<RegionCategoryPrefItem[]>(cachedData?.regionCategoryPref || []);
    const [topLocalities, setTopLocalities] = useState<TopLocalityItem[]>(cachedData?.topLocalities || []);
    const [geoFLength, setGeoFLength] = useState(cachedData?.geoFLength || 0);

    const lastFetchKeyRef = useRef<string | null>(cachedData?.filterKey ?? null);

    const handleExporting = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Locality Breakdown');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Geography_Locality_Breakdown.xlsx');
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
                doc.save('Geography_Locality_Breakdown.pdf');
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
                const p1 = fetchAggregated<{ data: TopCountryItem[] }>('stats/geo/top-countries', params, 3, signal).then(res => {
                    const total = res.data.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const tcWithPct = res.data.map((c, i) => ({
                        ...c,
                        pct: (c.count / total) * 100,
                        color: BAR_COLORS[i % BAR_COLORS.length]
                    }));
                    setTopCountries(tcWithPct);
                    return tcWithPct;
                });
                const p2 = fetchAggregated<{ data: RegionCategoryPrefItem[]; total_events: number }>('stats/geo/region-category-pref', params, 3, signal).then(res => {
                    setRegionCategoryPref(res.data);
                    setGeoFLength(res.total_events || 0);
                    return res;
                });
                const p3 = fetchAggregated<{ data: TopLocalityItem[] }>('table/geo/localities', params, 3, signal).then(res => {
                    setTopLocalities(res.data);
                    return res.data;
                });

                const [tcWithPct, rcp, tl] = await Promise.all([p1, p2, p3]);

                onCacheUpdate({
                    topCountries: tcWithPct,
                    regionCategoryPref: rcp.data,
                    topLocalities: tl,
                    geoFLength: rcp.total_events || 0,
                    filterKey: currentKey
                });
                lastFetchKeyRef.current = currentKey;
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Geography data fetch failed", e);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [fromDate, toDate, selectedUserId]);

    return (
    <div className="flex flex-col gap-6">

        {/* Countries + region prefs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card isLoading={loading && !topCountries.length}>
                <CardTitle title="Top countries" sub="Country code — by session count" />
                {topCountries.map((c, i) => (
                    <div key={`${c.key}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, width: 80, flexShrink: 0 }}>{c.key}</span>
                        <ProgressBar pct={c.pct} color={c.color || '#888'} />
                        <span style={{ fontSize: 12, fontWeight: 600, width: 45, textAlign: 'right' }}>{Math.round(c.pct)}%</span>
                        <span style={{ fontSize: 11, color: '#86868b', width: 55, textAlign: 'right' }}>{c.count.toLocaleString()}</span>
                    </div>
                ))}
            </Card>
            <Card isLoading={loading && !regionCategoryPref.length}>
                <CardTitle title="Content preference by region" sub="Subdivision code + Page category" />
                {regionCategoryPref.map((r, i) => (
                    <div key={`${r.region}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, width: 60, flexShrink: 0 }}>{r.region}</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <ProgressBar pct={Math.round((r.count / (geoFLength || 1)) * 100)} color={BAR_COLORS[i % BAR_COLORS.length]} />
                            <div className="shrink-0 flex items-center">
                                <Badge value={r.top_category} />
                            </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 42, textAlign: 'right' }}>
                            {Math.round((r.count / (geoFLength || 1)) * 100)}%
                        </span>
                        <span style={{ fontSize: 11, color: '#86868b', width: 45, textAlign: 'right' }}>
                            {r.count.toLocaleString()}
                        </span>
                    </div>
                ))}
            </Card>
        </div>

        {/* Engagement by locality bar chart */}
        {(loading || topLocalities.length > 0) && (
            <Card isLoading={loading && !topLocalities.length}>
                <CardTitle title="Engagement by locality" sub="Locality name · sessions · avg time · avg interactions" />
                <div className="flex flex-col gap-2.5 mt-2">
                    {topLocalities.slice(0, 8).map((l, i) => (
                        <div key={`${l.locality}-${i}`} className="flex items-center gap-3">
                            <div className="w-[100px] sm:w-[130px] text-[13px] font-medium text-slate-900 shrink-0 truncate">
                                {l.locality}
                                <span className="text-[11px] text-slate-400 ml-1 hidden sm:inline">{l.country}</span>
                            </div>
                            <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                                <div
                                    className="h-full rounded-md opacity-85 transition-all duration-500"
                                    style={{
                                        width: `${Math.round((l.sessions / (topLocalities[0]?.sessions || 1)) * 100)}%`,
                                        background: BAR_COLORS[i % BAR_COLORS.length],
                                    }}
                                />
                                <span className="absolute left-2.5 top-1.5 text-[11px] font-semibold text-white mix-blend-difference">
                                    {l.sessions} <span className="hidden sm:inline">sessions</span>
                                </span>
                            </div>
                            <div className="hidden min-[400px]:block w-[60px] sm:w-[70px] text-[11px] text-slate-500 text-right shrink-0">
                                {fmtMs(l.avg_time_s * 1000)}
                            </div>
                            <div className="hidden md:block w-[60px] text-[11px] text-slate-500 text-right shrink-0">
                                {l.avg_interactions} int.
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8' }}>
                    <span>Bar = sessions</span>
                    <span>Right = avg time on page</span>
                    <span>Far right = avg interactions</span>
                </div>
            </Card>
        )}

        {/* Locality table */}
        <Card noPadding isLoading={loading && !topLocalities.length} skeletonType="table">
            <div className="pt-4 px-4">
                <CardTitle title="Locality breakdown" sub="Locality name + Country code + engagement depth" />
            </div>
            <DataGrid
                dataSource={topLocalities}
                showBorders={false}
                hoverStateEnabled
                showColumnLines={false}
                showRowLines={false}
                elementAttr={{ class: 'allstories-datagrid' }}
                allowColumnResizing
                allowColumnReordering={true}
                onExporting={handleExporting}
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
                <Column dataField="locality" caption="Locality" minWidth={180} />
                <Column dataField="country" caption="Country" width={85} alignment="center" />
                <Column dataField="users" caption="Users" width={80} alignment="right" />
                <Column dataField="sessions" caption="Sessions" width={90} alignment="right" />
                <Column dataField="avg_time_s" caption="Avg time" width={100} alignment="right"
                    cellRender={(d: any) => fmtMs(d.value * 1000)} />
                <Column dataField="avg_interactions" caption="Avg interactions" width={120} alignment="right" />
            </DataGrid>
        </Card>
    </div>
);
};