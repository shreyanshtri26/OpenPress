import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import { Workbook } from 'exceljs';
import DataGrid, { Column, Paging, Pager, Selection, SearchPanel, FilterRow, Export, Lookup, Editing } from '../data-grid';
import { exportDataGrid } from '../excel-exporter';
import CustomStore from '../custom-store';

afterEach(cleanup);

const people = [
  { id: 1, name: 'Asha', role: 'ed', score: 1200, joined: '2026-01-05' },
  { id: 2, name: 'Bilal', role: 'rep', score: 30, joined: '2026-03-10' },
  { id: 3, name: 'Chen', role: 'ed', score: 450, joined: '2025-12-01' },
];
const roles = [{ value: 'ed', label: 'Editor' }, { value: 'rep', label: 'Reporter' }];
const bodyRows = () => screen.getAllByRole('row').filter((r) => r.closest('tbody'));
const firstCells = () => bodyRows().map((r) => within(r).getAllByRole('cell').find((c) => !c.querySelector('input[type=checkbox]'))?.textContent);

describe('DataGrid', () => {
  it('renders captions, formatted values, lookups and cellRender', () => {
    render(
      <DataGrid dataSource={people} keyExpr="id">
        <Column dataField="name" caption="Name" cellRender={(c) => <b>{c.value.toUpperCase()}</b>} />
        <Column dataField="role" caption="Role"><Lookup dataSource={roles} valueExpr="value" displayExpr="label" /></Column>
        <Column dataField="score" caption="Score" dataType="number" format="#,##0" />
      </DataGrid>,
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('ASHA')).toBeTruthy();
    expect(screen.getAllByText('Editor')).toHaveLength(2);
    expect(screen.getByText((1200).toLocaleString())).toBeTruthy();
  });

  it('sorts by clicking a header and honours initial sortOrder', () => {
    render(
      <DataGrid dataSource={people} keyExpr="id">
        <Column dataField="name" caption="Name" />
        <Column dataField="score" caption="Score" dataType="number" sortOrder="desc" />
      </DataGrid>,
    );
    expect(firstCells()).toEqual(['Asha', 'Chen', 'Bilal']);
    fireEvent.click(screen.getByText('Name'));
    expect(firstCells()).toEqual(['Asha', 'Bilal', 'Chen']);
    fireEvent.click(screen.getByText('Name'));
    expect(firstCells()).toEqual(['Chen', 'Bilal', 'Asha']);
  });

  it('filters with the search panel (including lookup labels)', () => {
    render(
      <DataGrid dataSource={people} keyExpr="id">
        <SearchPanel visible />
        <Column dataField="name" caption="Name" />
        <Column dataField="role" caption="Role"><Lookup dataSource={roles} valueExpr="value" displayExpr="label" /></Column>
      </DataGrid>,
    );
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'report' } });
    expect(firstCells()).toEqual(['Bilal']);
  });

  it('filter row filters and reports kit-style option changes', () => {
    const onOptionChanged = vi.fn();
    const ref = createRef();
    render(
      <DataGrid ref={ref} dataSource={people} keyExpr="id" onOptionChanged={onOptionChanged}>
        <FilterRow visible />
        <Column dataField="name" caption="Name" />
        <Column dataField="role" caption="Role" />
      </DataGrid>,
    );
    fireEvent.change(screen.getByLabelText('Filter Role'), { target: { value: 'rep' } });
    expect(firstCells()).toEqual(['Bilal']);
    const e = onOptionChanged.mock.calls.at(-1)[0];
    expect(e).toMatchObject({ name: 'columns', fullName: 'columns[1].filterValue', value: 'rep' });
    expect(ref.current.instance().columnOption(1, 'dataField')).toBe('role');
  });

  it('pages and lets the user change page size', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: i, name: `P${String(i).padStart(2, '0')}` }));
    render(
      <DataGrid dataSource={many} keyExpr="id">
        <Column dataField="name" caption="Name" />
        <Paging defaultPageSize={5} />
        <Pager visible showInfo showPageSizeSelector allowedPageSizes={[5, 10, 'all']} />
      </DataGrid>,
    );
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText('Page 1 of 3 (12 items)')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(firstCells()[0]).toBe('P05');
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: 'all' } });
    expect(bodyRows()).toHaveLength(12);
  });

  it('multiple selection exposes selected rows and skips onCellClick on the checkbox', () => {
    const onCellClick = vi.fn();
    const ref = createRef();
    render(
      <DataGrid ref={ref} dataSource={people} keyExpr="id" onCellClick={onCellClick}>
        <Selection mode="multiple" showCheckBoxesMode="always" />
        <Column dataField="name" caption="Name" />
      </DataGrid>,
    );
    fireEvent.click(screen.getByLabelText('Select row 2'));
    expect(ref.current.instance().getSelectedRowsData()).toEqual([people[1]]);
    expect(onCellClick).toHaveBeenCalledWith(expect.objectContaining({ column: expect.objectContaining({ type: 'selection' }) }));
    fireEvent.click(screen.getByText('Chen'));
    expect(onCellClick).toHaveBeenLastCalledWith(expect.objectContaining({ rowType: 'data', data: people[2], column: expect.objectContaining({ dataField: 'name' }) }));
  });

  it('export goes through onExporting with format, selectedRowsOnly and an exportable component', async () => {
    const onExporting = vi.fn();
    render(
      <DataGrid dataSource={people} keyExpr="id" onExporting={onExporting}>
        <Export enabled formats={['xlsx', 'pdf']} />
        <Column dataField="name" caption="Name" />
        <Column dataField="role" caption="Role"><Lookup dataSource={roles} valueExpr="value" displayExpr="label" /></Column>
        <Column dataField="password" caption="Password" allowExporting={false} />
      </DataGrid>,
    );
    fireEvent.click(screen.getByText('Export to Excel'));
    const e = onExporting.mock.calls[0][0];
    expect(e.format).toBe('xlsx');
    expect(e.selectedRowsOnly).toBe(false);
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('S');
    await exportDataGrid({ component: e.component, worksheet: sheet, selectedRowsOnly: false });
    expect(sheet.getRow(1).values.slice(1)).toEqual(['Name', 'Role']);
    expect(sheet.getRow(2).values.slice(1)).toEqual(['Asha', 'Editor']);
    expect(sheet.rowCount).toBe(4);
  });

  it('loads a CustomStore data source', async () => {
    const store = new CustomStore({ key: 'id', load: () => Promise.resolve({ data: people.slice(0, 2), totalCount: 2 }) });
    render(
      <DataGrid dataSource={store}>
        <Column dataField="name" caption="Name" />
      </DataGrid>,
    );
    await waitFor(() => expect(firstCells()).toEqual(['Asha', 'Bilal']));
  });

  it('row editing: addRow uses onInitNewRow and saves via onRowInserting; edit saves via onRowUpdating', async () => {
    const onInitNewRow = vi.fn((e) => { e.data = { name: '', role: 'rep' }; });
    const onRowInserting = vi.fn((e) => { e.cancel = true; });
    const onRowUpdating = vi.fn((e) => { e.cancel = true; });
    let grid;
    render(
      <DataGrid
        dataSource={people}
        keyExpr="id"
        onInitialized={(e) => { grid = e.component; }}
        onInitNewRow={onInitNewRow}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
      >
        <Editing mode="row" allowAdding allowUpdating />
        <Column dataField="name" caption="Name" />
        <Column dataField="role" caption="Role"><Lookup dataSource={roles} valueExpr="value" displayExpr="label" /></Column>
        <Column type="buttons" caption="Action" buttons={[{ name: 'edit' }, { name: 'save' }, { name: 'cancel' }]} />
      </DataGrid>,
    );
    await act(async () => { await grid.addRow(); });
    expect(grid.getController('editing').isEditing()).toBe(true);
    fireEvent.change(screen.getByLabelText('Edit Name'), { target: { value: 'Dee' } });
    await act(async () => { await grid.saveEditData(); });
    expect(onRowInserting.mock.calls[0][0].data).toEqual({ name: 'Dee', role: 'rep' });
    expect(grid.getController('editing').isEditing()).toBe(false);

    fireEvent.click(screen.getAllByLabelText('Edit')[1]);
    fireEvent.change(screen.getByLabelText('Edit Role'), { target: { value: '0' } });
    await act(async () => { fireEvent.click(screen.getByLabelText('Save')); });
    const u = onRowUpdating.mock.calls[0][0];
    expect(u.key).toBe(2);
    expect(u.oldData).toEqual(people[1]);
    expect(u.newData).toEqual({ role: 'ed' });
  });

  it('shows noDataText when empty', () => {
    render(<DataGrid dataSource={[]} noDataText="Nothing here"><Column dataField="name" /></DataGrid>);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
