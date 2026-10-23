import { cx, emit } from './_shared';

export function Switch({ value, onValueChanged, disabled, readOnly, className, switchedOnText, switchedOffText }) {
  const on = Boolean(value);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? switchedOnText : switchedOffText}
      disabled={disabled || readOnly}
      className={cx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', on ? 'bg-blue-600' : 'bg-gray-300', className)}
      onClick={(event) => emit(onValueChanged, !on, on, event)}
    >
      <span className={cx('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export default Switch;
