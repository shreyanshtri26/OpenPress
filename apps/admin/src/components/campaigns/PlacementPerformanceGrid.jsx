import React from 'react';
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    FilterRow,
    GroupPanel,
    Grouping,
    HeaderFilter,
    Paging,
    Scrolling,
    Selection,
    Pager,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { createGridExportHandler } from '../../utils/dataGridExport';

export default function PlacementPerformanceGrid({ data }) {
    return (
        <DataGrid
            dataSource={data}
            showBorders={true}
            showColumnLines={false}
            showRowLines={true}
            rowAlternationEnabled={false}
            hoverStateEnabled={true}
            allowColumnResizing
            allowColumnReordering
            columnAutoWidth
            className="w-full"
            onExporting={createGridExportHandler('PlacementPerformance')}
        >
            <GroupPanel visible={true} emptyPanelText="Drag a column header here to group by that column" />
            <Grouping autoExpandAll={false} />
            <ColumnChooser enabled={true} mode="select" />
            <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />
            <FilterRow visible={true} applyFilter="auto" />
            <FilterPanel visible={true} />
            <FilterBuilderPopup width={700} height={500} />
            <HeaderFilter visible={true} />
            <Selection mode="multiple" showCheckBoxesMode="always" />
            <Scrolling mode="standard" />
            <Paging defaultPageSize={10} />
            <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[10, 20, 50, 'all']} />
            <Column dataField="placement" caption="Placement" alignment="left" cssClass="font-semibold text-gray-900" allowGrouping />
            <Column dataField="impressions" caption="Impressions" dataType="number" format="#,##0" alignment="left" allowGrouping={false} />
            <Column dataField="clicks" caption="Clicks" dataType="number" format="#,##0" alignment="left" allowGrouping={false} />
            <Column dataField="ctr" caption="CTR" dataType="string" alignment="left" allowGrouping={false} />
        </DataGrid>
    );
}
