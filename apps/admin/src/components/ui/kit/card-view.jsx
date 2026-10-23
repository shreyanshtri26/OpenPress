// Native CardView (free): responsive card grid with paging, cardRender and noDataRender.
import { Children, forwardRef, isValidElement, useImperativeHandle, useState } from 'react';
import { cx, toArray } from './_shared';
import { Column, Pager, Paging, SearchPanel, Selection, Sorting } from './data-grid';

const HeaderPanel = () => null;
HeaderPanel.dxRole = 'HeaderPanel';

export { Column, Pager, Paging, SearchPanel, Selection, Sorting, HeaderPanel };

export const CardView = forwardRef(function CardView(
  { dataSource, keyExpr, cardMinWidth = 240, height, className, cardRender, noDataRender, onItemClick, children },
  ref,
) {
  const config = {};
  Children.toArray(children).forEach((c) => { if (isValidElement(c) && c.type?.dxRole) config[c.type.dxRole] = c.props; });
  const items = toArray(dataSource);
  const pageSize = config.Paging?.pageSize ?? config.Paging?.defaultPageSize ?? 12;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const current = Math.min(page, pageCount - 1);
  const shown = items.slice(current * pageSize, current * pageSize + pageSize);

  useImperativeHandle(ref, () => ({ instance: () => ({ updateDimensions() {}, refresh: () => Promise.resolve(), repaint() {} }) }), []);

  if (!items.length) return <div className={className}>{noDataRender ? noDataRender() : <p className="py-10 text-center text-gray-500">No data</p>}</div>;

  return (
    <div className={cx('flex flex-col', className)} style={height && height !== '100%' ? { height } : undefined}>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))` }}>
        {shown.map((item, i) => (
          <div key={String(keyExpr ? item[keyExpr] : i)} className={onItemClick ? 'cursor-pointer' : undefined} onClick={(event) => onItemClick?.({ itemData: item, data: item, event })}>
            {cardRender ? cardRender({ data: item, card: { data: item }, itemData: item, index: i }) : null}
          </div>
        ))}
      </div>
      {pageCount > 1 && config.Pager?.visible !== false && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          {config.Pager?.showInfo ? <span>{`Page ${current + 1} of ${pageCount} (${items.length} items)`}</span> : <span />}
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={current === 0} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40" onClick={() => setPage(current - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button key={i} type="button" aria-current={i === current ? 'page' : undefined} className={cx('min-w-8 rounded px-2 py-1', i === current ? 'bg-gray-900 text-white' : 'hover:bg-gray-100')} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button type="button" aria-label="Next page" disabled={current >= pageCount - 1} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40" onClick={() => setPage(current + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
});

export default CardView;
