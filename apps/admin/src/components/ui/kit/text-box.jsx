import { useState } from 'react';
import { cx, emit, fieldClass, FieldError, fromElementAttr, rulesFrom, useLocalValue, validate } from './_shared';

const INPUT_TYPES = { password: 'password', email: 'email', search: 'search', tel: 'tel', url: 'url' };

export function TextBox({
  value, placeholder, readOnly, disabled, onValueChanged, onFocus, onBlur, onEnterKey, onKeyDown,
  className, width, height, mode, maxLength, elementAttr, inputAttr, children, name, inputClassName,
}) {
  const [local, setLocal] = useLocalValue(value);
  const [touched, setTouched] = useState(false);
  const error = touched ? validate(rulesFrom(children), local) : null;
  const attr = fromElementAttr(elementAttr);

  return (
    <div {...attr} className={cx(className, attr.className)} style={{ width, ...attr.style }}>
      <input
        type={INPUT_TYPES[mode] || 'text'}
        name={name}
        className={cx(fieldClass, inputClassName, inputAttr?.className)}
        style={height ? { height } : undefined}
        value={local ?? ''}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        onFocus={(event) => onFocus?.({ event })}
        onBlur={(event) => { setTouched(true); onBlur?.({ event }); }}
        onKeyDown={(event) => {
          onKeyDown?.({ event });
          if (event.key === 'Enter') onEnterKey?.({ event });
        }}
        onChange={(event) => {
          const next = event.target.value;
          setTouched(true);
          setLocal(next);
          emit(onValueChanged, next, local, event);
        }}
        {...inputAttr}
      />
      <FieldError message={error} />
    </div>
  );
}

export default TextBox;
