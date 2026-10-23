import { forwardRef } from 'react';
import { cx } from './_shared';

const OVERFLOW = { horizontal: 'overflow-x-auto overflow-y-hidden', vertical: 'overflow-y-auto overflow-x-hidden', both: 'overflow-auto' };

export const ScrollView = forwardRef(function ScrollView({ direction = 'vertical', className, style, height, width, children }, ref) {
  return (
    <div ref={ref} className={cx(OVERFLOW[direction] || OVERFLOW.vertical, className)} style={{ height, width, ...style }}>
      {children}
    </div>
  );
});

export default ScrollView;
