import { useState } from 'react';
import { cx, emit, fieldClass, FieldError, fromElementAttr, rulesFrom, validate } from './_shared';

const INPUT_TYPE = { date: 'date', datetime: 'datetime-local', time: 'time' };
const pad = (n) => String(n).padStart(2, '0');

export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Date -> the string a native input of this type expects (local time).
export function toInputValue(value, type = 'date') {
  const d = toDate(value);
  if (!d) return '';
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return type === 'datetime' ? `${date}T${time}` : type === 'time' ? time : date;
}

// Native input string -> local Date (null when cleared).
export function fromInputValue(text, type = 'date') {
  if (!text) return null;
  if (type === 'time') {
    const [h, m] = text.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  const [datePart, timePart = '00:00'] = text.split('T');
  const [y, mo, day] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  return new Date(y, mo - 1, day, h, mi);
}

export function DateBox({
  value, type = 'date', min, max, placeholder, readOnly, disabled, onValueChanged, onOpened, onClosed,
  className, width, elementAttr, children, inputAttr,
}) {
  const [touched, setTouched] = useState(false);
  const error = touched ? validate(rulesFrom(children), value) : null;
  const attr = fromElementAttr(elementAttr);

  return (
    <div {...attr} className={cx('dx-datebox', className, attr.className)} style={{ width, ...attr.style }}>
      <input
        type={INPUT_TYPE[type] || 'date'}
        className={cx(fieldClass, 'cursor-pointer')}
        value={toInputValue(value, type)}
        min={min ? toInputValue(min, type) : undefined}
        max={max ? toInputValue(max, type) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {}
        }}
        onFocus={() => onOpened?.({})}
        onBlur={() => { setTouched(true); onClosed?.({}); }}
        onChange={(event) => {
          setTouched(true);
          emit(onValueChanged, fromInputValue(event.target.value, type), value, event);
        }}
        {...inputAttr}
      />
      <FieldError message={error} />
    </div>
  );
}

export default DateBox;
