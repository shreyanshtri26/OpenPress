// Drop-in for the widget library pdf_exporter's exportDataGrid, using jspdf-autotable (MIT).
import autoTable from 'jspdf-autotable';

// jsPDF's built-in fonts only cover Latin-1: fold accents and drop anything else instead of printing garbage.
const latin1 = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '');
const text = (v) => latin1(v instanceof Date ? v.toLocaleDateString() : String(v ?? ''));

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
