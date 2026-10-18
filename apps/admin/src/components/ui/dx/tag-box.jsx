import { cx, emit, fieldClass, readExpr, toArray } from './_shared';

// Selected values as removable chips, plus a <select> to add more.
export function TagBox({ value, items, dataSource, displayExpr, valueExpr, placeholder = 'Add...', onValueChanged, readOnly, disabled, className }) {
  const list = toArray(items ?? dataSource);
  const selected = Array.isArray(value) ? value : [];
  const valueOf = (item) => (valueExpr ? readExpr(item, valueExpr) : item);
  const labelOf = (item) => String((displayExpr ? readExpr(item, displayExpr) : item) ?? '');
  const keyOf = (item, i) => (valueExpr || typeof item !== 'object' ? String(valueOf(item)) : String(i));
  const itemFor = (v) => list.find((item) => valueOf(item) === v) ?? v;
  const available = list.filter((item) => !selected.includes(valueOf(item)));
  const change = (next, event) => emit(onValueChanged, next, selected, event);

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span key={String(v)} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800">
              {labelOf(itemFor(v))}
              {!readOnly && !disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${labelOf(itemFor(v))}`}
                  className="text-gray-500 hover:text-gray-900"
                  onClick={(event) => change(selected.filter((s) => s !== v), event)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!readOnly && (
        <select
          className={fieldClass}
          value=""
          disabled={disabled || available.length === 0}
          onChange={(event) => {
            const item = list.find((it, i) => keyOf(it, i) === event.target.value);
            if (item !== undefined) change([...selected, valueOf(item)], event);
          }}
        >
          <option value="">{available.length ? placeholder : 'No more options'}</option>
          {list.map((item, i) => (!selected.includes(valueOf(item)) ? <option key={keyOf(item, i)} value={keyOf(item, i)}>{labelOf(item)}</option> : null))}
        </select>
      )}
    </div>
  );
}

export default TagBox;
