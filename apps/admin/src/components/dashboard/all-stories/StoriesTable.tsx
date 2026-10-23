import { useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import DataGrid, {
    Column,
    ColumnChooser,
    Export,
    FilterRow,
    Grouping,
    GroupPanel,
    HeaderFilter,
    Paging,
    Pager,
    Selection,
    FilterPanel,
    FilterBuilderPopup,
} from '@/components/ui/kit/data-grid';
import { exportDataGrid as exportDataGridXLSX } from '@/components/ui/kit/excel-exporter';
import { exportDataGrid as exportDataGridPDF } from '@/components/ui/kit/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

import { BadgeLookup, GridStory, StoryFilter } from './types';

type ColumnCellRenderData = {
  data: GridStory;
};

type TitleCellData = {
  value?: unknown;
};

interface StoriesTableProps {
  stories: GridStory[];
  onStoryClick: (story: GridStory) => void;
  stateFilters: StoryFilter[];
  stateLookup: BadgeLookup;
  statusLookup: BadgeLookup;
  isSearching?: boolean;
  onApplyServerFilter: (params: Record<string, string>) => void;
  selectedStoryIds?: string[];
  onSelectionChanged?: (selectedIds: string[]) => void;
  onDeleteSingle?: (story: GridStory) => void;
  canDeleteStory?: (story: GridStory) => boolean;
}

// Maps DataGrid column dataField → API query param name
const COLUMN_TO_API_FIELD: Record<string, string> = {
  title: 'title',
  authorDisplay: 'authorName',
  storySection: 'section',
  workflowStateValue: 'state',
  statusValue: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  publishedAt: 'publishedAt',
  assignedToDisplay: 'assignedEditor',
};

const renderTitleCell = (cellData: TitleCellData) => {
  const value =
    typeof cellData.value === 'string' ? cellData.value : 'Untitled Draft';
  return <span>{value}</span>;
};

const renderStatusCell = ({ data }: ColumnCellRenderData) => {
  return <span className="text-black">{data.statusLabel}</span>;
};

const renderWorkflowStateCell = ({ data }: ColumnCellRenderData) => {
  return <span className="text-black">{data.workflowStateLabel}</span>;
};

export function StoriesTable({
  stories,
  onStoryClick,
  stateFilters,
  stateLookup,
  statusLookup,
  isSearching,
  onApplyServerFilter,
  selectedStoryIds,
  onSelectionChanged,
  onDeleteSingle,
  canDeleteStory,
}: StoriesTableProps) {
  const gridRef = useRef<any>(null);

  // Track filter values per column as the user types
  const filterValuesRef = useRef<Record<string, any>>({});

  // Keep callback ref fresh to avoid stale closures
  const onApplyServerFilterRef = useRef(onApplyServerFilter);
  useEffect(() => {
    onApplyServerFilterRef.current = onApplyServerFilter;
  }, [onApplyServerFilter]);

  // Debounce timer for server-side filtering
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const workflowStateLookup = stateFilters
    .filter((filter) => filter.key !== 'all')
    .map((filter) => ({
      value: filter.key,
      label: stateLookup[filter.key]?.label ?? filter.label,
    }));

  const statusLookupData = Object.entries(statusLookup).map(([key, value]) => ({
    value: key,
    label: value.label,
  }));

  const triggerServerSearch = useCallback(() => {
    const currentFilters = filterValuesRef.current;
    const apiParams: Record<string, string> = {};

    for (const [colField, colValue] of Object.entries(currentFilters)) {
      const apiField = COLUMN_TO_API_FIELD[colField];
      if (apiField && colValue !== undefined && colValue !== null && String(colValue).trim() !== '') {
        if (colValue instanceof Date) {
          const startOfDay = new Date(colValue.getFullYear(), colValue.getMonth(), colValue.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(colValue.getFullYear(), colValue.getMonth(), colValue.getDate(), 23, 59, 59, 999);
          apiParams[`${apiField}Start`] = startOfDay.toISOString();
          apiParams[`${apiField}End`] = endOfDay.toISOString();
        } else {
          apiParams[apiField] = String(colValue).trim();
        }
      }
    }

    onApplyServerFilterRef.current(apiParams);
  }, []);

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

  const handleExporting = useCallback((e: any) => {
    const selectedRowsOnly = e.selectedRowsOnly ?? false;
    if (e.format === 'xlsx') {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Stories');
      exportDataGridXLSX({
        component: e.component,
        worksheet,
        autoFilterEnabled: true,
        selectedRowsOnly,
      }).then(() => {
        workbook.xlsx.writeBuffer().then((buffer) => {
          saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'Stories.xlsx');
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
        doc.save('Stories.pdf');
      });
      e.cancel = true;
    }
  }, []);

  return (
    <div style={{ position: 'relative' }}>

      {/* Inline loading overlay */}
      {isSearching && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            backgroundColor: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'white',
              borderRadius: '8px',
              padding: '8px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            <svg
              style={{ animation: 'spin 1s linear infinite', height: 16, width: 16, flexShrink: 0 }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                style={{ opacity: 0.75 }}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Searching across all stories...
          </div>
        </div>
      )}

      <DataGrid
        ref={gridRef}
        dataSource={stories}
        keyExpr="storyId"
        showBorders={false}
        hoverStateEnabled
        showColumnLines={false}
        showRowLines={false}
        selectedRowKeys={selectedStoryIds}
        onSelectionChanged={(e) => {
          onSelectionChanged?.(e.selectedRowKeys || []);
        }}
        onCellClick={(e) => {
          if (
            e.rowType !== 'data' ||
            !e.data ||
            e.column?.type === 'selection' ||
            (e.column as any)?.command === 'select' ||
            (e.column as any)?.caption === 'Actions' ||
            (e.column as any)?.type === 'buttons'
          )
            return;
          onStoryClick(e.data);
        }}
        onOptionChanged={(e) => {
          // Track filter row value changes as the user types
          if (e.name === 'columns' && typeof e.fullName === 'string' && e.fullName.includes('filterValue')) {
            const match = e.fullName.match(/columns\[(\d+)\]\.filterValue/);
            if (match) {
              const colIndex = parseInt(match[1], 10);
              try {
                const inst = gridRef.current?.instance?.() ?? gridRef.current?.instance;
                const dataField = inst?.columnOption?.(colIndex, 'dataField');
                if (dataField) {
                  const newValue = e.value;
                  if (newValue !== undefined && newValue !== null && String(newValue).trim() !== '') {
                    filterValuesRef.current[dataField] = newValue;
                  } else {
                    delete filterValuesRef.current[dataField];
                  }


                  // Debounce the server request
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(() => {
                    triggerServerSearch();
                  }, 600); // 600ms debounce
                }
              } catch (_) { }
            }
          }
        }}
        allowColumnResizing
        allowColumnReordering
        wordWrapEnabled
        columnAutoWidth
        loadPanel={{ enabled: false }}
        noDataText="No stories match your filters"
        height="auto"
        elementAttr={{ class: 'allstories-datagrid' }}
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
        <Column
          dataField="title"
          caption="Title"
          cellRender={renderTitleCell}
          minWidth={380}
          allowSorting
          allowFiltering
          allowGrouping
        />
        <Column
          dataField="statusValue"
          caption="Status"
          minWidth={130}
          width={130}
          alignment="center"
          allowSorting
          allowFiltering
          allowGrouping
          cellRender={renderStatusCell}
          lookup={{
            dataSource: statusLookupData,
            valueExpr: 'value',
            displayExpr: 'label',
          }}
        />
        <Column
          dataField="authorDisplay"
          caption="Author"
          minWidth={150}
          width={150}
          allowSorting
          allowFiltering
          allowGrouping
        />
        <Column
          dataField="storySection"
          caption="Section"
          minWidth={120}
          width={120}
          allowSorting
          allowFiltering
          allowGrouping
        />
        <Column
          dataField="workflowStateValue"
          caption="Workflow State"
          minWidth={170}
          width={170}
          allowSorting
          allowFiltering
          allowGrouping
          cellRender={renderWorkflowStateCell}
          lookup={{
            dataSource: workflowStateLookup,
            valueExpr: 'value',
            displayExpr: 'label',
          }}
        />
        <Column
          dataField="createdAt"
          caption="Created At"
          dataType="date"
          format="shortDate"
          minWidth={120}
          width={120}
          allowSorting
          allowFiltering
          allowGrouping
        />
        <Column
          dataField="updatedAt"
          caption="Updated At"
          dataType="date"
          format="shortDate"
          minWidth={120}
          width={120}
          allowSorting
          allowFiltering
          allowGrouping
          defaultSortOrder="desc"
        />
        <Column
          dataField="publishedAt"
          caption="Published Date"
          dataType="date"
          format="shortDate"
          minWidth={130}
          width={130}
          allowSorting
          allowFiltering
          allowGrouping
        />
        <Column
          dataField="assignedToDisplay"
          caption="Assigned Editor"
          minWidth={160}
          width={160}
          allowSorting
          allowFiltering
          allowGrouping
        />
        {onDeleteSingle && (
          <Column
            caption="Actions"
            minWidth={80}
            width={80}
            alignment="center"
            allowFiltering={false}
            allowSorting={false}
            allowGrouping={false}
            cellRender={({ data }: ColumnCellRenderData) => {
              const allowed = !canDeleteStory || canDeleteStory(data);
              if (!allowed) return null;
              return (
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    title="Delete story"
                    aria-label={`Delete ${data.title || 'story'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSingle(data);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            }}
          />
        )}
        <Paging defaultPageSize={8} />
        <Pager visible={true} showInfo={true} showNavigationButtons={true} displayMode="full" showPageSizeSelector={true} allowedPageSizes={[8, 10, 20, 50, 'all']} />
      </DataGrid>
    </div>
  );
}
