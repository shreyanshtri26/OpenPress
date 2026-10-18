import { emit, fieldClass } from './_shared';
import { fromInputValue, toInputValue } from './date-box';

// value = [startDate, endDate]
export function DateRangeBox({ value, onValueChanged, className, startDatePlaceholder = 'Start', endDatePlaceholder = 'End', disabled }) {
  const [start, end] = Array.isArray(value) ? value : [null, null];
  const change = (next, event) => emit(onValueChanged, next, [start, end], event);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <input
        type="date"
        aria-label={startDatePlaceholder}
        className={fieldClass}
        value={toInputValue(start)}
        max={end ? toInputValue(end) : undefined}
        disabled={disabled}
        onChange={(event) => change([fromInputValue(event.target.value), end], event)}
      />
      <span className="text-gray-400">–</span>
      <input
        type="date"
        aria-label={endDatePlaceholder}
        className={fieldClass}
        value={toInputValue(end)}
        min={start ? toInputValue(start) : undefined}
        disabled={disabled}
        onChange={(event) => change([start, fromInputValue(event.target.value)], event)}
      />
    </div>
  );
}

export default DateRangeBox;
