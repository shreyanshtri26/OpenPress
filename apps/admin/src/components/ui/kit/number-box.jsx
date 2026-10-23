import { cx, emit, fieldClass, useLocalValue } from './_shared';

export function NumberBox({ value, min, max, step, placeholder, readOnly, disabled, onValueChanged, className, width, showSpinButtons }) {
  const [local, setLocal] = useLocalValue(value);

  return (
    <input
      type="number"
      className={cx(fieldClass, className)}
      style={width ? { width } : undefined}
      value={local ?? ''}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      data-spin={showSpinButtons ? 'on' : undefined}
      onChange={(event) => {
        const next = event.target.value === '' ? null : Number(event.target.value);
        setLocal(next);
        emit(onValueChanged, next, local, event);
      }}
    />
  );
}

export default NumberBox;
