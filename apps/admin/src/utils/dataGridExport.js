// Shared exporter for the grid kit DataGrids across the app.
// Attach as the DataGrid's `onExporting` handler and set `<Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData />`.
import { exportDataGrid as exportDataGridToExcel } from '@/components/ui/kit/excel-exporter';
import { exportDataGrid as exportDataGridToPdf } from '@/components/ui/kit/pdf-exporter';
import { Workbook } from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

const failed = (error) => { console.error('Export failed:', error); toast.error('Export failed. Please try again.'); };

export function createGridExportHandler(fileNameBase = 'Export') {
  return function handleExporting(e) {
    const selectedRowsOnly = e.selectedRowsOnly ?? false;

    if (e.format === 'xlsx') {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet(fileNameBase);
      exportDataGridToExcel({
        component: e.component,
        worksheet,
        autoFilterEnabled: true,
        selectedRowsOnly,
      }).then(() => workbook.xlsx.writeBuffer()).then((buffer) => {
        saveAs(
          new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          `${fileNameBase}.xlsx`
        );
      }).catch(failed);
      e.cancel = true;
    } else if (e.format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      exportDataGridToPdf({
        jsPDFDocument: doc,
        component: e.component,
        selectedRowsOnly,
        indent: 5,
      }).then(() => {
        doc.save(`${fileNameBase}.pdf`);
      }).catch(failed);
      e.cancel = true;
    }
  };
}
