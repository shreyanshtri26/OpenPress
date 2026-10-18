// Shared helpers for the DevExtreme-compatible kit (free replacement for devextreme-react).
// Only the props/events this codebase actually uses are implemented.
import { Children, isValidElement, useEffect, useState } from 'react';

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export const fieldClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100 read-only:bg-gray-50 transition-colors';

// DevExtreme passes { value, previousValue, event, component } to onValueChanged.
export function emit(handler, value, previousValue, event, options = {}) {
  handler?.({ value, previousValue, event, component: { option: (name) => options[name] }, ...options });
}

// Reads a displayExpr/valueExpr (field name or function) from an item.
export function readExpr(item, expr) {
  if (typeof expr === 'function') return expr(item);
  if (expr && item !== null && typeof item === 'object') return item[expr];
  return item;
}

// elementAttr={{ class, style, ... }} -> React props.
export function fromElementAttr(elementAttr) {
  if (!elementAttr) return {};
  const { class: className, ...rest } = elementAttr;
  return { className, ...rest };
}

export const toArray = (source) => (Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : []);

// Keeps the typed value locally (like DevExtreme editors) while following the parent's value prop.
export function useLocalValue(value) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return [local, setLocal];
}

// ---- validation: <Validator><RequiredRule|PatternRule|StringLengthRule/></Validator> as editor children ----
export function rulesFrom(children) {
  const rules = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || !child.type?.isDxValidator) return;
    Children.forEach(child.props.children, (rule) => {
      if (isValidElement(rule) && rule.type?.ruleType) rules.push({ type: rule.type.ruleType, ...rule.props });
    });
  });
  return rules;
}

export function validate(rules, value) {
  for (const rule of rules) {
    const empty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
    if (rule.type === 'required' && empty) return rule.message || 'Required';
    if (empty) continue;
    if (rule.type === 'pattern') {
      const re = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
      if (!re.test(String(value))) return rule.message || 'Invalid value';
    }
    if (rule.type === 'stringLength') {
      const len = String(value).length;
      if ((rule.min != null && len < rule.min) || (rule.max != null && len > rule.max)) return rule.message || 'Invalid length';
    }
  }
  return null;
}

export function FieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}
