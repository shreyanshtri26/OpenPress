// Drop-in for devextreme/pdf_exporter's exportDataGrid, using jspdf-autotable (MIT).
import autoTable from 'jspdf-autotable';

const text = (v) => (v instanceof Date ? v.toLocaleDateString() : String(v ?? ''));

export function exportDataGrid({ jsPDFDocument, component, selectedRowsOnly = false, customizeCell, indent = 5 }) {
  const { columns, rows } = component.getExportData(selectedRowsOnly);
  const body = rows.map((values) => values.map((value, i) => {
    const pdfCell = { text: text(value) };
    customizeCell?.({ gridCell: { rowType: 'data', value, column: columns[i] }, pdfCell });
    return pdfCell.text;
  }));
  autoTable(jsPDFDocument, {
    head: [columns.map((c) => c.caption)],
    body,
    margin: { left: indent + 5, right: 10 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [17, 24, 39] },
  });
  return Promise.resolve();
}

export default exportDataGrid;
