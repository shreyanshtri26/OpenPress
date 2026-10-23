// Native DataGrid (free). Implements the subset this app uses: columns (cellRender, lookup, format,
// calculateCellValue, initial sort), header sorting, search panel, filter row, paging/pager, selection, column chooser,
// export via onExporting + ./excel-exporter / ./pdf-exporter, CustomStore data sources, buttons columns and row editing.
// ponytail: no grouping/group panel and no header-filter popups — add when someone needs them.
import { Children, forwardRef, isValidElement, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { cx, fieldClass, readExpr, toArray } from './_shared';
import { SelectBox } from './select-box';

const marker = (role) => {
  /** @param {Record<string, any>} _props */
  const Marker = (_props) => null;
  Marker.dxRole = role;
  Marker.displayName = role;
  return Marker;
};

export const Column = marker('Column');
export const Lookup = marker('Lookup');
export const Paging = marker('Paging');
export const Pager = marker('Pager');
export const Selection = marker('Selection');
export const SearchPanel = marker('SearchPanel');
export const FilterRow = marker('FilterRow');
export const HeaderFilter = marker('HeaderFilter');
export const FilterPanel = marker('FilterPanel');
export const FilterBuilderPopup = marker('FilterBuilderPopup');
export const ColumnChooser = marker('ColumnChooser');
export const Export = marker('Export');
export const Grouping = marker('Grouping');
export const GroupPanel = marker('GroupPanel');
export const Toolbar = marker('Toolbar');
export const Item = marker('Item');
export const Scrolling = marker('Scrolling');
export const Sorting = marker('Sorting');
export const LoadPanel = marker('LoadPanel');
export const RemoteOperations = marker('RemoteOperations');
export const Editing = marker('Editing');

const NEW = Symbol('new-row');
const kids = (children) => Children.toArray(children).filter(isValidElement);
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const asDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function formatValue(col, value) {
  if (col.lookup) {
    const hit = toArray(col.lookup.dataSource).find((item) => readExpr(item, col.lookup.valueExpr) === value);
    if (hit !== undefined) return String(readExpr(hit, col.lookup.displayExpr) ?? '');
  }
  if (value === null || value === undefined) return '';
  const { format, dataType } = col;
  if (typeof format === 'function') return String(format(value));
  if (typeof format === 'string') {
    if (format.includes('#') || format.includes('0')) {
      const decimals = format.includes('.') ? format.split('.')[1].replace(/[^0#]/g, '').length : 0;
      const n = Number(value);
      return Number.isNaN(n) ? String(value) : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
    }
    if (format === 'percent') return `${(Number(value) * 100).toFixed(1)}%`;
    const d = asDate(value);
    if (d) {
      if (format === 'shortDate') return d.toLocaleDateString();
      if (format === 'shortDateShortTime') return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      if (format === 'dd/MM/yyyy') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      if (format === 'dd MMM yyyy') return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  if (dataType === 'date' || dataType === 'datetime') {
    const d = asDate(value);
    if (d) return dataType === 'date' ? d.toLocaleDateString() : d.toLocaleString();
  }
  if (typeof value === 'object') return Array.isArray(value) ? value.join(', ') : '';
  return String(value);
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const da = a instanceof Date ? a : null;
  const db = b instanceof Date ? b : null;
  if (da && db) return da - db;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function parseGrid(children) {
  const columns = [];
  const config = {};
  for (const child of kids(children)) {
    const role = child.type?.dxRole;
    if (role === 'Column') {
      const { children: colKids, ...p } = child.props;
      const lookup = kids(colKids).find((c) => c.type?.dxRole === 'Lookup');
      columns.push({ ...p, lookup: lookup?.props, index: columns.length, id: p.dataField || p.name || p.caption || `col${columns.length}` });
    } else if (role === 'Toolbar') {
      config.Toolbar = { items: kids(child.props.children).filter((c) => c.type?.dxRole === 'Item').map((c) => c.props) };
    } else if (role) {
      config[role] = child.props;
    }
  }
  return { columns, config };
}

const rawValue = (col, row) => (col.calculateCellValue ? col.calculateCellValue(row) : col.dataField ? row?.[col.dataField] : undefined);

export const DataGrid = forwardRef(function DataGrid(props, ref) {
  const {
    dataSource, keyExpr, children, noDataText = 'No data', height, width, className, elementAttr,
    showBorders, showRowLines, showColumnLines, rowAlternationEnabled, hoverStateEnabled = true, wordWrapEnabled,
    onRowClick, onCellClick, onOptionChanged, onExporting, onInitialized, onToolbarPreparing, onSelectionChanged,
    onInitNewRow, onRowInserting, onRowUpdating, onRowRemoving, selectedRowKeys: selectedRowKeysProp,
  } = props;
  const { columns, config } = parseGrid(children);

  // ---- data (array or CustomStore) ----
  const isStore = dataSource && !Array.isArray(dataSource) && typeof dataSource.load === 'function';
  const [storeRows, setStoreRows] = useState([]);
  const [loadTick, setLoadTick] = useState(0);
  useEffect(() => {
    if (!isStore) return undefined;
    let alive = true;
    Promise.resolve(dataSource.load({})).then((result) => {
      if (alive) setStoreRows(Array.isArray(result) ? result : toArray(result?.data));
    });
    return () => { alive = false; };
  }, [dataSource, isStore, loadTick]);
  const rows = isStore ? storeRows : toArray(dataSource);
  const keyOf = (row, idx) => {
    if (!row || typeof row !== 'object') return row ?? idx;
    if (keyExpr && row[keyExpr] !== undefined && typeof row[keyExpr] !== 'object') {
      return row[keyExpr];
    }
    if (row.id !== undefined && typeof row.id !== 'object') return row.id;
    if (row._id !== undefined && typeof row._id !== 'object') return row._id;
    if (row.key !== undefined && typeof row.key !== 'object') return row.key;
    return idx;
  };

  // ---- view state ----
  const initialSort = columns
    .filter((c) => c.sortOrder || c.defaultSortOrder)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((c) => ({ id: c.id, desc: (c.sortOrder || c.defaultSortOrder) === 'desc' }))[0] || null;
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.visible === false).map((c) => c.id)));
  const [chooserOpen, setChooserOpen] = useState(false);
  const paging = config.Paging || {};
  const [pagingEnabled, setPagingEnabled] = useState(paging.enabled !== false);
  const [pagerVisible, setPagerVisible] = useState(config.Pager?.visible ?? 'auto');
  const [pageSize, setPageSize] = useState(paging.pageSize ?? paging.defaultPageSize ?? 20);
  const [page, setPage] = useState(0);
  const [ownSelected, setOwnSelected] = useState([]);
  const selectedKeys = selectedRowKeysProp ?? ownSelected;
  const [edit, setEdit] = useState(null); // { key, newData?, values }
  const editRef = useRef(null);
  editRef.current = edit;

  const visibleCols = columns.filter((c) => !hidden.has(c.id));
  const dataCols = visibleCols.filter((c) => c.type !== 'buttons');
  const selectionMode = config.Selection?.mode;
  const multiple = selectionMode === 'multiple';

  const processed = useMemo(() => {
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((row) => dataCols.some((c) => formatValue(c, rawValue(c, row)).toLowerCase().includes(q)));
    for (const [id, value] of Object.entries(filters)) {
      const col = columns.find((c) => c.id === id);
      const needle = String(value ?? '').trim().toLowerCase();
      if (col && needle) out = out.filter((row) => formatValue(col, rawValue(col, row)).toLowerCase().includes(needle) || String(rawValue(col, row) ?? '').toLowerCase().includes(needle));
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col) {
        const val = (row) => {
          const v = rawValue(col, row);
          return col.dataType === 'date' || col.dataType === 'datetime' ? asDate(v) : v;
        };
        out = [...out].sort((a, b) => (sort.desc ? -1 : 1) * compare(val(a), val(b)));
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filters, sort, hidden, children]);

  const allPages = pageSize === 'all' || !pagingEnabled;
  const pageCount = allPages ? 1 : Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = allPages ? processed : processed.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const shownRows = edit?.key === NEW ? [edit.newData, ...pageRows] : pageRows;

  const setSelection = (keys) => {
    if (selectedRowKeysProp === undefined) setOwnSelected(keys);
    onSelectionChanged?.({ selectedRowKeys: keys, selectedRowsData: rows.filter((r) => keys.includes(keyOf(r))) });
  };

  // ---- editing ----
  const exitEdit = () => setEdit(null);
  const saveEditData = async () => {
    const current = editRef.current;
    if (!current) return true;
    if (current.key === NEW) {
      const e = { data: { ...current.newData, ...current.values }, cancel: false };
      await onRowInserting?.(e);
    } else {
      const oldData = rows.find((r) => keyOf(r) === current.key);
      const e = { key: current.key, oldData, newData: { ...current.values }, cancel: false };
      await onRowUpdating?.(e);
    }
    exitEdit();
    return true;
  };
  const setEditValue = (field, value) => {
    const next = { ...editRef.current, values: { ...editRef.current.values, [field]: value } };
    editRef.current = next;
    setEdit(next);
  };

  // ---- the kit component handle ----
  const latest = useRef({});
  latest.current = { columns, processed, rows, selectedKeys, pageRows, pagingEnabled, pagerVisible };
  const handle = useMemo(() => ({
    option(name, value) {
      const map = { 'paging.enabled': [latest.current.pagingEnabled, setPagingEnabled], 'pager.visible': [latest.current.pagerVisible, setPagerVisible] };
      if (value === undefined) return map[name]?.[0];
      map[name]?.[1](value);
      return undefined;
    },
    columnOption: (index, name) => latest.current.columns[index]?.[name],
    getSelectedRowsData: () => latest.current.rows.filter((r) => latest.current.selectedKeys.includes(keyExpr ? r?.[keyExpr] : r)),
    getSelectedRowKeys: () => latest.current.selectedKeys,
    clearSelection: () => setSelection([]),
    refresh: () => { setLoadTick((t) => t + 1); return Promise.resolve(); },
    getController: (name) => (name === 'editing' ? { isEditing: () => Boolean(editRef.current) } : undefined),
    saveEditData,
    cancelEditData: exitEdit,
    // Rows live in the caller's state; deleting here only discards an unsaved new row.
    deleteRow: () => { if (editRef.current?.key === NEW) exitEdit(); },
    addRow: async () => {
      const e = { data: {} };
      await onInitNewRow?.(e);
      const next = { key: NEW, newData: e.data || {}, values: {} };
      editRef.current = next;
      setEdit(next);
    },
    editRow: (rowIndex) => {
      if (editRef.current?.key === NEW && rowIndex === 0) return;
      const row = latest.current.pageRows[rowIndex];
      if (row) { const next = { key: keyExpr ? row[keyExpr] : row, values: {} }; editRef.current = next; setEdit(next); }
    },
    editCell: () => {},
    getExportData: (selectedOnly) => {
      const cols = latest.current.columns.filter((c) => c.type !== 'buttons' && c.allowExporting !== false && !hidden.has(c.id));
      const source = selectedOnly ? latest.current.rows.filter((r) => latest.current.selectedKeys.includes(keyExpr ? r?.[keyExpr] : r)) : latest.current.processed;
      return {
        columns: cols.map((c) => ({ caption: c.caption ?? c.dataField ?? '', dataField: c.dataField, dataType: c.dataType })),
        rows: source.map((row) => cols.map((c) => {
          const v = rawValue(c, row);
          if (c.lookup) return formatValue(c, v);
          if ((c.dataType === 'date' || c.dataType === 'datetime') && asDate(v)) return asDate(v);
          return v ?? '';
        })),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  useImperativeHandle(ref, () => ({ instance: () => handle }), [handle]);
  useEffect(() => {
    onInitialized?.({ component: handle });
    onToolbarPreparing?.({ component: handle, toolbarOptions: { items: [], visible: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- toolbar ----
  const exportCfg = config.Export;
  const runExport = (format, selectedRowsOnly = false) => {
    const e = { format, selectedRowsOnly, component: handle, cancel: false };
    onExporting?.(e);
  };
  const toolbarItems = config.Toolbar?.items?.length
    ? config.Toolbar.items.map((i) => i.name).filter(Boolean)
    : [config.SearchPanel?.visible && 'searchPanel', exportCfg?.enabled && 'exportButton', config.ColumnChooser?.enabled && 'columnChooserButton'].filter(Boolean);
  const formats = exportCfg?.formats || ['xlsx'];
  const renderToolItem = (name) => {
    if (name === 'searchPanel' && config.SearchPanel?.visible !== false) {
      return <input key={name} type="search" className={cx(fieldClass, 'max-w-xs')} style={{ width: config.SearchPanel?.width }} placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />;
    }
    if (name === 'exportButton' && exportCfg?.enabled) {
      return (
        <div key={name} className="flex gap-2">
          {formats.includes('xlsx') && <button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" onClick={() => runExport('xlsx')}>Export to Excel</button>}
          {formats.includes('pdf') && <button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" onClick={() => runExport('pdf')}>Export to PDF</button>}
          {exportCfg.allowExportSelectedData && selectedKeys.length > 0 && formats.map((f) => (
            <button key={f} type="button" className="rounded-md border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50" onClick={() => runExport(f, true)}>
              Export selected ({f === 'xlsx' ? 'Excel' : 'PDF'})
            </button>
          ))}
        </div>
      );
    }
    if (name === 'columnChooserButton' && config.ColumnChooser?.enabled) {
      return (
        <div key={name} className="relative">
          <button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50" aria-expanded={chooserOpen} onClick={() => setChooserOpen((o) => !o)}>Columns</button>
          {chooserOpen && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
              {columns.filter((c) => c.caption && c.type !== 'buttons').map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={!hidden.has(c.id)} onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                  {c.caption}
                </label>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // ---- cells ----
  const cellInfo = (col, row, rowIndex) => {
    const value = rawValue(col, row);
    const isEditing = Boolean(edit) && (edit.key === NEW ? row === edit.newData : keyOf(row) === edit.key);
    return {
      data: row, value, displayValue: value, text: formatValue(col, value), rowIndex, rowType: 'data', key: keyOf(row),
      column: { dataField: col.dataField, caption: col.caption, type: col.type, name: col.name },
      row: { data: row, rowIndex, key: keyOf(row), isEditing, isNewRow: Boolean(edit) && edit.key === NEW && row === edit.newData, rowType: 'data' },
    };
  };

  const editor = (col, row) => {
    const current = edit.values[col.dataField] ?? row?.[col.dataField];
    if (col.lookup) {
      return <SelectBox dataSource={col.lookup.dataSource} valueExpr={col.lookup.valueExpr} displayExpr={col.lookup.displayExpr} value={current} onValueChanged={(e) => setEditValue(col.dataField, e.value)} inputAttr={{ 'aria-label': `Edit ${col.caption ?? col.dataField}` }} />;
    }
    const type = col.dataType === 'number' ? 'number' : col.dataField === 'password' ? 'password' : 'text';
    return (
      <input
        aria-label={`Edit ${col.caption ?? col.dataField}`}
        type={type}
        className={fieldClass}
        value={col.calculateCellValue && edit.values[col.dataField] === undefined ? '' : current ?? ''}
        onChange={(e) => setEditValue(col.dataField, type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    );
  };

  const BUILTIN = {
    edit: { label: 'Edit', Icon: Pencil, show: (info) => !info.row.isEditing && !edit, run: (info) => handle.editRow(info.rowIndex) },
    save: { label: 'Save', Icon: Check, show: (info) => info.row.isEditing, run: () => saveEditData() },
    cancel: { label: 'Cancel', Icon: X, show: (info) => info.row.isEditing, run: () => exitEdit() },
    delete: { label: 'Delete', Icon: Trash2, show: (info) => !info.row.isEditing, run: (info) => onRowRemoving?.({ key: info.key, data: info.data, cancel: false }) },
  };
  const renderButtons = (col, info) => (
    <div className="flex items-center gap-1">
      {(col.buttons || ['edit', 'delete']).map((b, i) => {
        const spec = typeof b === 'string' ? { name: b } : b;
        const builtin = BUILTIN[spec.name];
        const visible = typeof spec.visible === 'function' ? spec.visible(info) : spec.visible !== false && (builtin ? builtin.show(info) : true);
        if (!visible) return null;
        const Icon = builtin?.Icon || (spec.icon === 'trash' ? Trash2 : spec.icon === 'edit' ? Pencil : null);
        const label = spec.hint || spec.text || builtin?.label || spec.name || 'Action';
        return (
          <button
            key={i}
            type="button"
            aria-label={label}
            title={label}
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={(event) => { event.stopPropagation(); if (spec.onClick) spec.onClick({ ...info, event }); else builtin?.run(info); }}
          >
            {Icon ? <Icon size={16} /> : spec.text}
          </button>
        );
      })}
    </div>
  );

  const pageKeys = pageRows.map((r, i) => keyOf(r, i));
  const allOnPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.includes(k));
  const pager = config.Pager || {};
  const showPager = pagerVisible === true || (pagerVisible === 'auto' && pageCount > 1) || (pagerVisible !== false && pager.showPageSizeSelector && processed.length > 0);
  const elAttr = elementAttr || {};
  const cellLines = cx(showColumnLines && 'border-x border-gray-200');

  return (
    <div className={cx('w-full', className, elAttr.class)} style={{ width }}>
      {toolbarItems.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{toolbarItems.map(renderToolItem)}</div>
      )}
      <div className={cx('overflow-auto', showBorders && 'border border-gray-200')} style={height && height !== 'auto' ? { maxHeight: height } : undefined}>
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {multiple && (
                <th className="w-10 px-3 py-2 text-left">
                  <input type="checkbox" aria-label="Select all rows" checked={allOnPageSelected} onChange={() => setSelection(allOnPageSelected ? selectedKeys.filter((k) => !pageKeys.includes(k)) : [...new Set([...selectedKeys, ...pageKeys])])} />
                </th>
              )}
              {visibleCols.map((col) => {
                const sortable = col.type !== 'buttons' && col.allowSorting !== false && config.Sorting?.mode !== 'none';
                const dir = sort?.id === col.id ? (sort.desc ? 'descending' : 'ascending') : undefined;
                return (
                  <th
                    key={col.id}
                    aria-sort={dir}
                    className={cx('whitespace-nowrap px-3 py-2 font-semibold text-gray-700', col.alignment === 'right' ? 'text-right' : col.alignment === 'center' ? 'text-center' : 'text-left', sortable && 'cursor-pointer select-none hover:text-gray-900', cellLines)}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    onClick={sortable ? () => setSort((s) => (s?.id !== col.id ? { id: col.id, desc: false } : s.desc ? null : { id: col.id, desc: true })) : undefined}
                  >
                    {col.caption ?? ''}
                    {dir && <span aria-hidden="true" className="ml-1 text-xs">{dir === 'ascending' ? '▲' : '▼'}</span>}
                  </th>
                );
              })}
            </tr>
            {config.FilterRow?.visible && (
              <tr>
                {multiple && <th />}
                {visibleCols.map((col) => (
                  <th key={col.id} className="px-2 pb-2">
                    {col.type !== 'buttons' && col.allowFiltering !== false && (
                      <input
                        aria-label={`Filter ${col.caption ?? col.dataField}`}
                        className={cx(fieldClass, 'py-1 text-xs font-normal')}
                        value={filters[col.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilters((f) => ({ ...f, [col.id]: value }));
                          setPage(0);
                          onOptionChanged?.({ name: 'columns', fullName: `columns[${col.index}].filterValue`, value, component: handle });
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {shownRows.length === 0 && (
              <tr><td colSpan={visibleCols.length + (multiple ? 1 : 0)} className="px-3 py-10 text-center text-gray-500">{noDataText}</td></tr>
            )}
            {shownRows.map((row, rowIndex) => {
              const key = row === edit?.newData ? NEW : keyOf(row, rowIndex);
              const selected = selectedKeys.includes(key);
              const rowEditing = Boolean(edit) && (edit.key === NEW ? row === edit.newData : key === edit.key);
              const rowKey = typeof key === 'symbol' ? 'new' : (typeof key === 'object' ? `row-${rowIndex}` : String(key ?? rowIndex));
              return (
                <tr
                  key={rowKey}
                  className={cx(
                    showRowLines !== false && 'border-b border-gray-100',
                    rowAlternationEnabled && rowIndex % 2 === 1 && 'bg-gray-50',
                    hoverStateEnabled && 'hover:bg-blue-50/40',
                    selected && 'bg-blue-50',
                    (onRowClick || onCellClick || selectionMode === 'single') && 'cursor-pointer',
                  )}
                  onClick={(event) => {
                    if (selectionMode === 'single') setSelection([key]);
                    onRowClick?.({ data: row, key, rowIndex, rowType: 'data', event, component: handle });
                  }}
                >
                  {multiple && (
                    <td
                      className="px-3 py-2"
                      onClick={(event) => { event.stopPropagation(); onCellClick?.({ rowType: 'data', data: row, rowIndex, key, event, column: { type: 'selection', command: 'select' }, component: handle }); }}
                    >
                      <input type="checkbox" aria-label={`Select row ${rowIndex + 1}`} checked={selected} onChange={() => setSelection(selected ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key])} />
                    </td>
                  )}
                  {visibleCols.map((col) => {
                    const info = cellInfo(col, row, rowIndex);
                    let content;
                    if (col.type === 'buttons') content = renderButtons(col, info);
                    else if (rowEditing && col.dataField && col.allowEditing !== false) content = editor(col, row);
                    else content = col.cellRender ? col.cellRender(info) : info.text;
                    return (
                      <td
                        key={col.id}
                        className={cx('px-3 py-2 align-middle text-gray-800', wordWrapEnabled ? 'whitespace-normal break-words' : 'whitespace-nowrap', col.alignment === 'right' ? 'text-right' : col.alignment === 'center' ? 'text-center' : 'text-left', col.cssClass, cellLines)}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        onClick={(event) => onCellClick?.({ ...info, event, component: handle })}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showPager && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            {pager.showPageSizeSelector && (
              <select aria-label="Rows per page" className="rounded-md border border-gray-300 px-2 py-1" value={String(allPages ? 'all' : pageSize)} onChange={(e) => { setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(0); }}>
                {(pager.allowedPageSizes || [10, 20, 50]).map((s) => <option key={String(s)} value={String(s)}>{s === 'all' ? 'All' : s}</option>)}
              </select>
            )}
            {pager.showInfo && <span>{`Page ${safePage + 1} of ${pageCount} (${processed.length} items)`}</span>}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={safePage === 0} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40" onClick={() => setPage(safePage - 1)}>‹</button>
              {Array.from({ length: pageCount }, (_, i) => i)
                .filter((i) => pageCount <= 7 || i === 0 || i === pageCount - 1 || Math.abs(i - safePage) <= 1)
                .map((i, idx, arr) => (
                  <span key={i} className="flex items-center">
                    {idx > 0 && i - arr[idx - 1] > 1 && <span className="px-1">…</span>}
                    <button type="button" aria-current={i === safePage ? 'page' : undefined} className={cx('min-w-8 rounded px-2 py-1', i === safePage ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')} onClick={() => setPage(i)}>{i + 1}</button>
                  </span>
                ))}
              <button type="button" aria-label="Next page" disabled={safePage >= pageCount - 1} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40" onClick={() => setPage(safePage + 1)}>›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DataGrid;
