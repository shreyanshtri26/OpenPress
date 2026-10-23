import { useState } from 'react';
import { cx, emit, fieldClass, FieldError, fromElementAttr, rulesFrom, useLocalValue, validate } from './_shared';

export function TextArea({
  value, placeholder, readOnly, disabled, onValueChanged, onFocus, className, height, minHeight, width,
  maxLength, autoResizeEnabled, elementAttr, children,
}) {
  const [local, setLocal] = useLocalValue(value);
  const [touched, setTouched] = useState(false);
  const error = touched ? validate(rulesFrom(children), local) : null;
  const attr = fromElementAttr(elementAttr);

  return (
    <div {...attr} className={cx(className, attr.className)} style={{ width, ...attr.style }}>
      <textarea
        className={cx(fieldClass, autoResizeEnabled ? 'field-sizing-content' : 'resize-y')}
        style={{ height, minHeight: minHeight ?? (height ? undefined : 96) }}
        value={local ?? ''}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        onFocus={(event) => onFocus?.({ event })}
        onBlur={() => setTouched(true)}
        onChange={(event) => {
          const next = event.target.value;
          setTouched(true);
          setLocal(next);
          emit(onValueChanged, next, local, event);
        }}
      />
      <FieldError message={error} />
    </div>
  );
}

export default TextArea;
