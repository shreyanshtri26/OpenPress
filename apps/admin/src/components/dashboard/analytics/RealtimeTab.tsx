import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/dx/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/dx/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/dx/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Card } from './AnalyticsUIComponents';
import { fetchAggregated } from '../../../utils/analyticsUtils';
import { RealtimeSummary } from '../../../types/analytics';

interface RealtimeTabProps {
    cachedData?: any;
    onCacheUpdate: (data: any) => void;
}

export const RealtimeTab = ({
    cachedData,
    onCacheUpdate,
}: RealtimeTabProps) => {
    const [realtimeData, setRealtimeData] = useState<RealtimeSummary | null>(cachedData || null);
    const [loading, setLoading] = useState(!cachedData);

    const handleExporting = React.useCallback((e: any) => {
        const selectedRowsOnly = e.selectedRowsOnly ?? false;
        if (e.format === 'xlsx') {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Active Pages');
            exportDataGridXLSX({
                component: e.component,
                worksheet,
                autoFilterEnabled: true,
                selectedRowsOnly,
            }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Realtime_Active_Pages.xlsx');
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
                doc.save('Realtime_Active_Pages.pdf');
            });
            e.cancel = true;
        }
    }, []);

    const fetchRealtime = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetchAggregated<RealtimeSummary>('realtime/summary', {}, 3, undefined, 2, true);
            setRealtimeData(res);
            onCacheUpdate(res);
        } catch (e) {
            console.error("Realtime fetch failed", e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (!cachedData) {
            fetchRealtime();
        }
        const interval = setInterval(() => fetchRealtime(true), 30000);
        return () => clearInterval(interval);
    }, []);

    if (!realtimeData && !loading) {
        return (
            <Card>
                <div className="py-20 text-center flex flex-col items-center gap-2">
                    <div className="text-gray-400 font-medium">No activity data found for the last 30 minutes.</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">Realtime updates are processed every 24 hours</div>
                </div>
            </Card>
        );
    }
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Stream</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Last sync: {realtimeData?.last_update ?? '—'}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card isLoading={loading && !realtimeData} className="p-6" skeletonType="number">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 border-b border-dashed border-slate-200 w-fit line-clamp-1">Users in last 30m</div>
                    <div className="text-4xl font-bold text-slate-900">{realtimeData?.active_users ?? '—'}</div>
                </Card>
                <Card isLoading={loading && !realtimeData} className="p-6" skeletonType="number">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 border-b border-dashed border-slate-200 w-fit line-clamp-1">Views in last 30m</div>
                    <div className="text-4xl font-bold text-slate-900">{realtimeData?.views_last_30m ?? '—'}</div>
                </Card>
                <Card isLoading={loading && !realtimeData} className="p-6 sm:col-span-1" skeletonType="number">
                    {/* Placeholder for future metric or status */}
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status</div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded border border-green-200">ACTIVE</div>
                        <div className="text-[10px] font-medium text-slate-400 italic">Syncing every 30s</div>
                    </div>
                </Card>
            </div>


            <Card noPadding isLoading={loading && !realtimeData} skeletonType="table">
                <div className="p-4 bg-slate-50/50 border-b border-black text-xs font-bold text-slate-600 uppercase tracking-tight">
                    Active pages in last 30 minutes
                </div>
                <DataGrid
                    dataSource={realtimeData?.top_pages || []}
                    showBorders={false}
                    hoverStateEnabled
                    showColumnLines={false}
                    showRowLines={false}
                    elementAttr={{ class: 'allstories-datagrid' }}
                    allowColumnResizing
                    allowColumnReordering={true}
                    onExporting={handleExporting}
                >
                    <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
                    <Grouping autoExpandAll={false} />
                    <ColumnChooser enabled={true} mode="select" />
                    <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
                    <Selection mode="multiple" showCheckBoxesMode="always" />
                    <FilterRow visible applyFilter="auto" />
                    <FilterPanel visible={true} />
                    <FilterBuilderPopup width={700} height={500} />
                    <HeaderFilter visible />
                    <Paging defaultPageSize={10} />
                    <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
                    <Column dataField="title" caption="Page title" cellRender={(d: any) => (
                        <div className="text-gray-900 font-medium">{d.value}</div>
                    )} />
                    <Column dataField="users" caption="Active users" width={130} alignment="right" />
                    <Column dataField="views" caption="Views" width={100} alignment="right" />
                </DataGrid>
            </Card>
        </div>
    );
};

