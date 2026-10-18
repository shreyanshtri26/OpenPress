import { useState } from 'react';
import { cx, emit, fieldClass, FieldError, fromElementAttr, readExpr, rulesFrom, toArray, validate } from './_shared';

// Native <select>; option values are indexes so items can be strings, numbers or objects.
export function SelectBox({
  value, items, dataSource, displayExpr, valueExpr, placeholder = 'Select...', onValueChanged, readOnly, disabled,
  className, width, height, elementAttr, children, showClearButton, inputAttr, inputClassName,
}) {
  const list = toArray(items ?? dataSource);
  const [touched, setTouched] = useState(false);
  const valueOf = (item) => (valueExpr ? readExpr(item, valueExpr) : item);
  const labelOf = (item) => {
    const label = displayExpr ? readExpr(item, displayExpr) : item;
    return label === null || label === undefined ? '' : String(label);
  };
  let index = list.findIndex((item) => valueOf(item) === value);
  if (index === -1 && value !== null && typeof value === 'object' && displayExpr) {
    index = list.findIndex((item) => labelOf(item) === labelOf(value));
  }
  const error = touched ? validate(rulesFrom(children), value) : null;
  const attr = fromElementAttr(elementAttr);
  const { className: inputAttrClass, ...restInputAttr } = inputAttr || {};

  return (
    <div {...attr} className={cx('relative w-full', className, attr.className)} style={{ width, ...attr.style }}>
      <select
        className={cx(
          fieldClass,
          'appearance-none cursor-pointer pr-8 bg-no-repeat',
          inputClassName,
          inputAttrClass
        )}
        style={{
          ...(height ? { height } : {}),
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundPosition: 'right 10px center',
          backgroundSize: '14px 14px',
        }}
        value={index === -1 ? '' : String(index)}
        disabled={disabled || readOnly}
        onChange={(event) => {
          setTouched(true);
          const item = event.target.value === '' ? null : list[Number(event.target.value)];
          emit(onValueChanged, item === null ? null : valueOf(item), value, event, { selectedItem: item });
        }}
        {...restInputAttr}
      >
        <option value="" disabled={!showClearButton}>{placeholder}</option>
        {list.map((item, i) => (
          <option key={i} value={String(i)}>{labelOf(item)}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export default SelectBox;
