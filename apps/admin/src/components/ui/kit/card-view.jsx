// Native CardView (free): responsive card grid with paging, cardRender and noDataRender.
import { Children, forwardRef, isValidElement, useImperativeHandle, useState } from 'react';
import { cx, toArray } from './_shared';
import { Pagination } from './pagination';
import { Column, Pager, Paging, SearchPanel, Selection, Sorting } from './data-grid';

/** @param {Record<string, any>} _props */
const HeaderPanel = (_props) => null;
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
    <div className={cx('flex min-h-0 flex-col', className)} style={height && height !== '100%' ? { height } : undefined}>
      <div className={cx('kit-cardview__grid', height && 'min-h-0 flex-1 overflow-y-auto')}>
      <div className="grid items-stretch gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))` }}>
        {shown.map((item, i) => (
          <div key={String(keyExpr ? item[keyExpr] : i)} className={cx('flex min-w-0', onItemClick && 'cursor-pointer')} onClick={(event) => onItemClick?.({ itemData: item, data: item, event })}>
            {cardRender ? cardRender({ data: item, card: { data: item }, itemData: item, index: i }) : null}
          </div>
        ))}
      </div>
      </div>
      {pageCount > 1 && config.Pager?.visible !== false && (
        <Pagination
          page={current}
          pageCount={pageCount}
          onPage={setPage}
          className="kit-cardview__footer"
          info={config.Pager?.showInfo ? <span>{`Page ${current + 1} of ${pageCount} (${items.length} items)`}</span> : null}
        />
      )}
    </div>
  );
});

export default CardView;
