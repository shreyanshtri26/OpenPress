// One pagination footer for every paged view (data grids, card grids): info on the left, controls on the right.
import { cx } from './_shared';

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'prev' ? 'm12.5 4.5-5.5 5.5 5.5 5.5' : 'm7.5 4.5 5.5 5.5-5.5 5.5'} />
  </svg>
);

// 0-based page indexes to show: first, last and the neighbours of the current page; `null` marks a gap.
export function pageWindow(current, count) {
  const keep = Array.from({ length: count }, (_, i) => i).filter((i) => count <= 7 || i === 0 || i === count - 1 || Math.abs(i - current) <= 1);
  return keep.flatMap((i, idx) => (idx > 0 && i - keep[idx - 1] > 1 ? [null, i] : [i]));
}

/**
 * @param {{ page: number, pageCount: number, onPage: (index: number) => void, info?: import('react').ReactNode, leading?: import('react').ReactNode, className?: string }} props
 * `page` is 0-based. Controls render only when there is more than one page; `info`/`leading` always render.
 */
export function Pagination({ page, pageCount, onPage, info, leading, className }) {
  return (
    <div className={cx('op-pagination', className)}>
      <div className="op-pagination__info">{leading}{info}</div>
      {pageCount > 1 && (
        <nav className="op-pagination__controls" aria-label="Pagination">
          <button type="button" className="op-page" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}><Chevron dir="prev" /></button>
          {pageWindow(page, pageCount).map((i, idx) => (i === null
            ? <span key={`gap-${idx}`} className="op-page-gap" aria-hidden="true">…</span>
            : <button key={i} type="button" className="op-page" aria-label={`Page ${i + 1}`} aria-current={i === page ? 'page' : undefined} onClick={() => onPage(i)}>{i + 1}</button>))}
          <button type="button" className="op-page" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}><Chevron dir="next" /></button>
        </nav>
      )}
    </div>
  );
}
