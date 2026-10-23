import { useState } from 'react';
import { cx, readExpr, toArray } from './_shared';
import { triggerHaptic } from '@/utils/appleMotion';

// Controlled through selectedItems or selectedItemKeys (like the grid kit), otherwise keeps its own state.
export function Accordion({
  dataSource, items, keyExpr, displayExpr, selectedItems, selectedItemKeys, multiple = false, collapsible = false,
  onSelectionChanged, itemTitleRender, itemRender, className, height,
}) {
  const list = toArray(items ?? dataSource);
  const keyOf = (item, idx) => {
    if (!item || typeof item !== 'object') return item ?? idx;
    if (keyExpr) {
      const val = readExpr(item, keyExpr);
      if (val !== undefined && typeof val !== 'object') return val;
    }
    if (item.id !== undefined && typeof item.id !== 'object') return item.id;
    if (item.key !== undefined && typeof item.key !== 'object') return item.key;
    if (item.title !== undefined && typeof item.title !== 'object') return item.title;
    return idx;
  };
  const [ownKeys, setOwnKeys] = useState([]);
  const controlledKeys = selectedItemKeys ?? (selectedItems ? selectedItems.map((it, idx) => keyOf(it, idx)) : null);
  const openKeys = controlledKeys ?? ownKeys;

  const toggle = (item) => {
    triggerHaptic('selection');
    const key = keyOf(item);
    const isOpen = openKeys.includes(key);
    let next;
    if (isOpen) next = collapsible || multiple ? openKeys.filter((k) => k !== key) : openKeys;
    else next = multiple ? [...openKeys, key] : [key];
    if (!controlledKeys) setOwnKeys(next);
    const nextItems = list.filter((it, idx) => next.includes(keyOf(it, idx)));
    onSelectionChanged?.({
      addedItems: isOpen ? [] : [item],
      removedItems: isOpen ? [item] : list.filter((it, idx) => openKeys.includes(keyOf(it, idx)) && !next.includes(keyOf(it, idx))),
      component: { option: (name) => (name === 'selectedItemKeys' ? next : name === 'selectedItems' ? nextItems : undefined) },
    });
  };

  return (
    <div className={cx('kit-accordion space-y-2.5', className)} style={height && height !== 'auto' ? { height, overflow: 'auto' } : undefined}>
      {list.map((item, i) => {
        const itemKey = typeof keyOf(item, i) === 'object' ? `acc-${i}` : String(keyOf(item, i) ?? i);
        const open = openKeys.includes(keyOf(item, i));
        return (
          <div
            key={itemKey}
            className={cx(
              'kit-accordion-item rounded-xl border border-black/[0.08] bg-white overflow-hidden shadow-xs transition-all duration-200',
              open && 'border-black/20 shadow-sm'
            )}
          >
            <button
              type="button"
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 py-3 px-3.5 text-left hover:bg-black/[0.02] active:scale-[0.99] transition-all focus:outline-none"
              onClick={() => toggle(item)}
            >
              <div className="min-w-0 flex-1 font-medium text-sm text-gray-900 tracking-tight">
                {itemTitleRender ? itemTitleRender(item) : String(readExpr(item, displayExpr) ?? '')}
              </div>
              <svg
                aria-hidden="true"
                className={cx(
                  'h-4 w-4 text-gray-400 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] flex-shrink-0',
                  open && 'rotate-180 text-gray-900'
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open && (
              <div className="kit-item-content pt-3 pb-3.5 px-3.5 border-t border-black/[0.05] bg-gray-50/30">
                {itemRender ? itemRender(item) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;
