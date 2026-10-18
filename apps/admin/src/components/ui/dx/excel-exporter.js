// Drop-in for devextreme/excel_exporter's exportDataGrid, writing a kit DataGrid into an exceljs worksheet.
export function exportDataGrid({ component, worksheet, selectedRowsOnly = false, autoFilterEnabled = false, customizeCell }) {
  const { columns, rows } = component.getExportData(selectedRowsOnly);
  worksheet.addRow(columns.map((c) => c.caption));
  worksheet.getRow(1).font = { bold: true };
  rows.forEach((values) => {
    const row = worksheet.addRow(values);
    if (customizeCell) {
      values.forEach((value, i) => customizeCell({ gridCell: { rowType: 'data', value, column: columns[i] }, excelCell: row.getCell(i + 1) }));
    }
  });
  columns.forEach((c, i) => {
    const longest = Math.max(String(c.caption).length, ...rows.map((r) => String(r[i] ?? '').length));
    worksheet.getColumn(i + 1).width = Math.min(60, Math.max(10, longest + 2));
  });
  if (autoFilterEnabled && columns.length) {
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }
  return Promise.resolve({ from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } });
}

export default exportDataGrid;
