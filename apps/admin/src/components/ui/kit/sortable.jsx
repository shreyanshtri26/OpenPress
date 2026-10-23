// DevExtreme-compatible Sortable on native HTML5 drag and drop. Each direct child is a draggable item.
// Same list -> onReorder, another list with the same `group` -> onAdd; both get { fromIndex, toIndex, fromData, toData }.
import { Children, useRef } from 'react';

let dragging = null; // { group, data, fromIndex, owner }

export function Sortable({ group, data, onReorder, onAdd, onDragStart, className, itemOrientation, children }) {
  const self = useRef({});
  const items = Children.toArray(children);

  const start = (index) => (event) => {
    dragging = { group, data, fromIndex: index, owner: self.current };
    event.dataTransfer?.setData?.('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    onDragStart?.({ fromIndex: index, fromData: data });
  };

  const drop = (toIndex) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const d = dragging;
    dragging = null;
    if (!d) return;
    const sameList = d.owner === self.current;
    if (!sameList && (group === undefined || d.group !== group)) return;
    const e = { fromIndex: d.fromIndex, toIndex: Math.min(toIndex, items.length - (sameList ? 1 : 0)), fromData: d.data, toData: data };
    if (sameList) { if (e.fromIndex !== e.toIndex) onReorder?.(e); } else onAdd?.(e);
  };

  const allow = (event) => event.preventDefault();

  return (
    <div
      data-testid="dx-sortable"
      className={className}
      style={itemOrientation === 'horizontal' ? { display: 'flex' } : undefined}
      onDragOver={allow}
      onDrop={drop(items.length)}
    >
      {items.map((child, i) => (
        <div key={child.key ?? i} draggable onDragStart={start(i)} onDragOver={allow} onDrop={drop(i)}>
          {child}
        </div>
      ))}
    </div>
  );
}

export default Sortable;
