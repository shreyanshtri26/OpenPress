import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './_shared';

const size = (v) => (typeof v === 'number' ? `${v}px` : v);

// Modal dialog. Escape and the close button call onHiding; outside click only when hideOnOutsideClick.
export function Popup({
  visible, onHiding, onShown, title, showTitle = true, showCloseButton = true, width, height, maxWidth, maxHeight,
  hideOnOutsideClick, contentRender, children, wrapperAttr, shading = true, shadingColor, titleRender,
}) {
  useEffect(() => {
    if (!visible) return undefined;
    onShown?.({});
    const onKey = (event) => { if (event.key === 'Escape') onHiding?.({}); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;
  const hasTitle = showTitle && (title || titleRender);

  return createPortal(
    <div
      data-testid="kit-popup-overlay"
      className={cx('fixed inset-0 z-[1000] flex items-center justify-center p-4', wrapperAttr?.class)}
      style={{ backgroundColor: shading ? shadingColor || 'rgba(0,0,0,0.45)' : 'transparent' }}
      onMouseDown={(event) => { if (hideOnOutsideClick && event.target === event.currentTarget) onHiding?.({}); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        style={{ width: size(width) ?? 'auto', height: height === 'auto' ? undefined : size(height), maxWidth: size(maxWidth) ?? '100%', maxHeight: size(maxHeight) }}
      >
        {(hasTitle || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-base font-semibold text-gray-900">{hasTitle ? (titleRender ? titleRender() : title) : null}</h2>
            {showCloseButton && (
              <button type="button" aria-label="Close" className="rounded p-1 text-xl leading-none text-gray-500 hover:bg-gray-100" onClick={() => onHiding?.({})}>
                ×
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto p-5">{contentRender ? contentRender() : children}</div>
      </div>
    </div>,
    document.body,
  );
}

export default Popup;
