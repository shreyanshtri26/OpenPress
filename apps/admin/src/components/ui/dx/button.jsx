import { cx, fromElementAttr } from './_shared';

const TONES = {
  contained: {
    default: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    normal: 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
    success: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
  },
  outlined: {
    default: 'bg-white text-blue-700 border-blue-600 hover:bg-blue-50',
    normal: 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50',
    danger: 'bg-white text-red-700 border-red-600 hover:bg-red-50',
    success: 'bg-white text-green-700 border-green-600 hover:bg-green-50',
  },
  text: {
    default: 'bg-transparent text-blue-700 border-transparent hover:bg-blue-50',
    normal: 'bg-transparent text-gray-900 border-transparent hover:bg-gray-100',
    danger: 'bg-transparent text-red-700 border-transparent hover:bg-red-50',
    success: 'bg-transparent text-green-700 border-transparent hover:bg-green-50',
  },
};

export function Button({ text, icon, type = 'normal', stylingMode = 'contained', onClick, disabled, elementAttr, className, width, height, hint, children }) {
  const attr = fromElementAttr(elementAttr);
  const tone = (TONES[stylingMode] || TONES.contained)[type] || TONES.contained.normal;
  return (
    <button
      type="button"
      title={hint}
      disabled={disabled}
      {...attr}
      className={cx('inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', tone, className, attr.className)}
      style={{ width, height, ...attr.style }}
      onClick={(event) => onClick?.({ event })}
    >
      {icon && !text && !children ? <span aria-hidden="true">{icon === 'refresh' ? '↻' : icon === 'plus' || icon === 'add' ? '+' : icon === 'close' ? '×' : '•'}</span> : null}
      {children ?? text}
    </button>
  );
}

export default Button;
