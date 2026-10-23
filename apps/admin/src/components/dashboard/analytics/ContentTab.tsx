import React, { useState, useEffect, useMemo, useRef } from 'react';
import DataGrid, {
    Column,
    Paging,
    FilterRow,
    SearchPanel,
    HeaderFilter,
    Toolbar,
    Item,
    Pager,
    LoadPanel,
    GroupPanel,
    Grouping,
    ColumnChooser,
    Export,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/kit/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/kit/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import CustomStore from '@/components/ui/kit/custom-store';
import { Chart, Series, ArgumentAxis, ValueAxis, Legend, Tooltip, Label } from '@/components/ui/kit/chart';
import { Card, CardTitle, Badge, ProgressBar } from './AnalyticsUIComponents';
import { BAR_COLORS, catStyle, fmtMs, fetchAggregated } from '../../../utils/analyticsUtils';
import { 
    ContentTopCategory, 
    CategoryTrendResponse, 
    ScrollDepthItem, 
    TopContentResponse,
    TopContentItem
} from '../../../types/analytics';

interface ContentTabProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

export const ContentTab = ({
    fromDate,
    toDate,
    selectedUserId,
    cachedData,
    onCacheUpdate,
}: ContentTabProps) => {
    const [loading, setLoading] = useState(!cachedData);
    const [categoryPref, setCategoryPref] = useState<ContentTopCategory[]>(cachedData?.categoryPref || []);
    const [trendCategories, setTrendCategories] = useState<string[]>(cachedData?.trendCategories || []);
    const [categoryTrend, setCategoryTrend] = useState<any[]>(cachedData?.categoryTrend || []);
    const [scrollDepthData, setScrollDepthData] = useState<ScrollDepthItem[]>(cachedData?.scrollDepthData || []);
    const [topContent, setTopContent] = useState<TopContentItem[]>(cachedData?.topContent || []);
    const [maxScore, setMaxScore] = useState(cachedData?.maxScore || 0);
    
    // Exit pages backend sync
    const [exitMaxExits, setExitMaxExits] = useState(cachedData?.exitMaxExits || 1);
    const EXIT_PAGE_SIZE = 10;

    const lastFetchKeyRef = useRef<string | null>(cachedData?.filterKey ?? null);

    const cleanPdfText = (val: any): string => {
        if (typeof val !== 'string') return String(val ?? '');
        return val
            .replace(/ā/g, 'a').replace(/Ā/g, 'A')
            .replace(/ē/g, 'e').replace(/Ē/g, 'E')
            .replace(/ī/g, 'i').replace(/Ī/g, 'I')
            .replace(/ō/g, 'o').replace(/Ō/g, 'O')
            .replace(/ū/g, 'u').replace(/Ū/g, 'U')
            .replace(/[āăǎâàáäåã]/gi, 'a')
            .replace(/[ēĕěêèéëẽ]/gi, 'e')
            .replace(/[īĭǐîìíïĩ]/gi, 'i')
            .replace(/[ōŏǒôòóöõ]/gi, 'o')
            .replace(/[ūŭǔûùúüũ]/gi, 'u')
            .replace(/’/g, "'").replace(/‘/g, "'")
            .replace(/”/g, '"').replace(/“/g, '"')
            .replace(/[^\x00-\x7F]/g, ''); // Strictly strip any remaining non-ASCII/control characters to guarantee perfect width math
    };

    const handleExportingContent = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Consumed Content');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Content_Consumed_Content.xlsx');
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
                customizeCell: (options: any) => {
                    const { gridCell, pdfCell } = options;
                    if (gridCell && gridCell.rowType === 'data' && typeof gridCell.value === 'string') {
                        pdfCell.text = cleanPdfText(gridCell.value);
                    }
                }
            }).then(() => {
                doc.save('Content_Consumed_Content.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const handleExportingExits = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Exit Page Analysis');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Content_Exit_Page_Analysis.xlsx');
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
                customizeCell: (options: any) => {
                    const { gridCell, pdfCell } = options;
                    if (gridCell && gridCell.rowType === 'data' && typeof gridCell.value === 'string') {
                        pdfCell.text = cleanPdfText(gridCell.value);
                    }
                }
            }).then(() => {
                doc.save('Content_Exit_Page_Analysis.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const exitDataSource = useMemo(() => new CustomStore({
        key: 'title',
        load: async (loadOptions) => {
            const params: Record<string, string> = {
                from:       fromDate,
                to:         toDate,
                offset:     String(loadOptions.skip || 0),
                limit:      String(loadOptions.take || EXIT_PAGE_SIZE),
                sort_field: "exits",
                sort_order: "desc",
            };
            if (selectedUserId) params.user_id = selectedUserId;

            if (loadOptions.sort && Array.isArray(loadOptions.sort) && loadOptions.sort.length > 0) {
                const s = loadOptions.sort[0] as any;
                params.sort_field = s.selector;
                params.sort_order = s.desc ? 'desc' : 'asc';
            }

            if (loadOptions.searchValue) {
                params.search = loadOptions.searchValue;
            }

            const parseFilter = (filter: any) => {
                if (!filter) return;
                if (Array.isArray(filter[0])) {
                    filter.forEach((item: any) => { if (Array.isArray(item)) parseFilter(item); });
                } else if (typeof filter[0] === 'string' && filter.length >= 3) {
                    const [field, op, val] = filter;
                    params[`filter_${field}`] = String(val);
                    let bop = op;
                    if (op === '=')  bop = 'equals';
                    if (op === '<>') bop = 'notequals';
                    params[`filter_${field}_op`] = bop;
                }
            };
            parseFilter(loadOptions.filter);

            try {
                // Return cached version if only basic page-1 load
                const isInitialLoad = !loadOptions.sort && !loadOptions.filter && !loadOptions.searchValue && loadOptions.skip === 0;
                if (isInitialLoad && cachedData?.exitPagesData) {
                    setExitMaxExits(cachedData.exitPagesData[0]?.exits || 1);
                    return { data: cachedData.exitPagesData, totalCount: cachedData.exitPagesTotal || 0 };
                }

                const res = await fetchAggregated<{ data: any[], total: number }>(
                    'table/content/exit-pages', params
                );
                if (res.data?.length > 0 && loadOptions.skip === 0) {
                    setExitMaxExits(res.data[0].exits || 1);
                    if (isInitialLoad) {
                        onCacheUpdate({
                            exitMaxExits: res.data[0].exits || 1,
                            exitPagesData: res.data,
                            exitPagesTotal: res.total
                        });
                    }
                }
                return { data: res.data, totalCount: res.total };
            } catch {
                return { data: [], totalCount: 0 };
            }
        }
    }), [fromDate, toDate, selectedUserId, cachedData]);

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
                const p1 = fetchAggregated<{ data: ContentTopCategory[] }>('chart/content/top-categories', params, 3, signal).then(res => { setCategoryPref(res.data); return res.data; });
                const p2 = fetchAggregated<CategoryTrendResponse>('chart/content/category-trend', params, 3, signal).then(res => { setTrendCategories(res.categories); setCategoryTrend(res.data); return res; });
                const p3 = fetchAggregated<{ data: ScrollDepthItem[] }>('chart/content/scroll-depth', params, 3, signal).then(res => { setScrollDepthData(res.data); return res.data; });
                const p4 = fetchAggregated<TopContentResponse>('table/content/top-content', params, 3, signal).then(res => { setTopContent(res.data); setMaxScore(res.max_score); return res; });

                const [cp, ct, sd, tc] = await Promise.all([p1, p2, p3, p4]);

                onCacheUpdate({
                    categoryPref: cp,
                    trendCategories: ct.categories,
                    categoryTrend: ct.data,
                    scrollDepthData: sd,
                    topContent: tc.data,
                    maxScore: tc.max_score,
                    filterKey: currentKey
                });
                lastFetchKeyRef.current = currentKey;
            } catch (e: any) {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    console.error("Content analytics fetch failed", e);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchAnalytics();
        return () => controller.abort();
    }, [fromDate, toDate, selectedUserId]);

    return (
        <div className="flex flex-col gap-6">

        {/* Category read time + trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card isLoading={loading && !categoryPref.length}>
                <CardTitle title="Top categories by page views" sub="Page category + Event count" />
                <Chart dataSource={categoryPref.slice(0, 8)} height={280} rotated>
                    <ArgumentAxis />
                    <Series valueField="count" argumentField="key" type="bar" color="#1a1a1a" cornerRadius={3}>
                        <Label visible position="outside" />
                    </Series>
                    <Legend visible={false} />
                    <Tooltip enabled />
                </Chart>
            </Card>
            <Card isLoading={loading && !categoryTrend.length}>
                <CardTitle title="Category trend over time" sub="Page category + Event timestamp ms by day" />
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
                    {trendCategories.map((c, i) => (
                        <span key={`${c}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: BAR_COLORS[i], display: 'inline-block' }} />
                            {c}
                        </span>
                    ))}
                </div>
                <Chart dataSource={categoryTrend} height={250}>
                    <ArgumentAxis />
                    {trendCategories.map((cat, i) => (
                        <Series key={`${cat}-${i}`} valueField={cat} argumentField="day" name={cat} type="spline" color={BAR_COLORS[i % BAR_COLORS.length]} width={2} />
                    ))}
                    <Legend visible={false} />
                    <Tooltip enabled shared />
                </Chart>
            </Card>
        </div>

        {/* Scroll depth distribution */}
        <Card isLoading={loading && !scrollDepthData.length}>
            <CardTitle title="Scroll depth distribution" sub="Interaction index frequency — deeper = higher index" />
            <Chart dataSource={scrollDepthData} height={220}>
                <ArgumentAxis />
                <Series valueField="count" argumentField="depth" type="bar" color="#333333" cornerRadius={2} />
                <Legend visible={false} />
                <Tooltip enabled />
            </Chart>
        </Card>

        {/* Top consumed content */}
        <Card noPadding isLoading={loading && !topContent.length} skeletonType="table">
            <div className="pt-4 px-4">
                <CardTitle title="Most deeply consumed content" sub="Page title · Time on parent page ms · Interaction index composite score" />
            </div>
            <DataGrid
                dataSource={topContent}
                showBorders={false}
                hoverStateEnabled
                showColumnLines={false}
                showRowLines={false}
                elementAttr={{ class: 'allstories-datagrid' }}
                allowColumnResizing
                allowColumnReordering={true}
                width="100%"
                onExporting={handleExportingContent}
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
                <Column dataField="title" caption="Article" minWidth={250} />
                <Column dataField="category" caption="Category" width={120}
                    cellRender={(d: any) => <Badge value={d.value} />} />
                <Column dataField="views" caption="Views" width={120} alignment="right" />
                <Column dataField="avg_time_ms" caption="Avg time" width={150} alignment="right"
                    cellRender={(d: any) => fmtMs(d.value)} />
                <Column dataField="avg_interactions" caption="Avg interactions" width={170} alignment="right" />
                <Column dataField="score" caption="Score" width={150}
                    cellRender={(d: any) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ProgressBar pct={Math.round((d.value / maxScore) * 100)} color={catStyle(d.data.category).text} />
                            <span style={{ fontSize: 11, fontStyle: 'italic', fontWeight: 600, width: 28, textAlign: 'right' }}>{d.value}</span>
                        </div>
                    )} />
            </DataGrid>
        </Card>

        {/* Exit pages */}
        <Card noPadding isLoading={loading} skeletonType="table">
            <div className="pt-4 px-4">
                <CardTitle title="Exit page analysis" sub="Last page per session — Page id + Session id" />
            </div>
            <DataGrid
                dataSource={exitDataSource}
                remoteOperations={true}
                showBorders={false}
                hoverStateEnabled
                showColumnLines={false}
                showRowLines={false}
                elementAttr={{ class: 'allstories-datagrid' }}
                allowColumnResizing
                allowColumnReordering={true}
                width="100%"
                onExporting={handleExportingExits}
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
                <LoadPanel enabled={false} />
                <Paging defaultPageSize={EXIT_PAGE_SIZE} />
                <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                
                <Column dataField="title" caption="Page" minWidth={250} />
                <Column dataField="exits" caption="Exit sessions" width={180} alignment="right"
                    cellRender={(d: any) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ProgressBar pct={Math.round((d.value / exitMaxExits) * 100)} color="#555555" />
                            <span style={{ fontSize: 11, width: 36, textAlign: 'right' }}>{d.value}</span>
                        </div>
                    )} />
            </DataGrid>
        </Card>
    </div>
    );
};