// Default Export to Excel / PDF for any kit DataGrid whose page does not do its own export.
// The libraries load on first click so they stay out of the main bundle.
const fileBase = () => (document.querySelector('h1')?.textContent || document.title || 'Export').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') || 'Export';

export async function defaultExport(format, component, selectedRowsOnly) {
  const name = fileBase();
  if (format === 'pdf') {
    const [{ jsPDF }, { exportDataGrid }] = await Promise.all([import('jspdf'), import('./pdf-exporter')]);
    const doc = new jsPDF('l', 'mm', 'a4');
    await exportDataGrid({ jsPDFDocument: doc, component, selectedRowsOnly });
    doc.save(`${name}.pdf`);
    return;
  }
  const [{ Workbook }, { saveAs }, { exportDataGrid }] = await Promise.all([import('exceljs'), import('file-saver'), import('./excel-exporter')]);
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(name.slice(0, 31));
  await exportDataGrid({ component, worksheet, autoFilterEnabled: true, selectedRowsOnly });
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
}
