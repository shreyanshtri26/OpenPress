import { type ReactNode, useMemo } from "react";

export type SectionGridProps = {
  id?: string;
  children?: ReactNode;
  className?: string;
  puck?: {
    renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode;
  };
};

export function SectionGrid({
  id,
  children,
  className = "",
  puck,
}: SectionGridProps) {
  const items = useMemo(() => {
    if (!children) return [];
    const childrenArray = Array.isArray(children) ? children : [children];
    // Filter out any falsy values or empty objects
    return childrenArray.filter(child => {
      if (!child) return false;
      if (typeof child === 'object' && Object.keys(child).length === 0) return false;
      return true;
    });
  }, [children]);

  const isEditMode = Boolean(puck?.renderDropZone);

  const renderDropZone = (
    zoneProps: Record<string, unknown>,
    zoneName: string,
    extraClass = ""
  ) => {
    if (!puck?.renderDropZone) return null;
    return puck.renderDropZone({
      ...zoneProps,
      zone: `section-grid-${zoneName}`,
      className: `w-full ${extraClass}`,
    });
  };

  return (
    <section id={id} className={`w-full bg-white lg:pt-8 px-4 lg:px-16 pb-12 ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">

          {/* LEFT COLUMN - Only Top Bar */}
          <div className="w-full flex flex-col gap-2">
            {/* Top bar 1 */}
            <div className="h-auto w-full min-h-[2.2rem]">
              {items[0] || (isEditMode && renderDropZone({}, "left-top-1", "min-h-[2.2rem]"))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full lg:w-[30%] flex flex-col gap-5">
          <div className="lg:sticky lg:top-[96px] lg:self-start bg-white z-10 flex flex-col gap-5">

            {/* Tall block */}
            <div className="h-auto">
              {items[1] || (isEditMode && renderDropZone({}, "right-1", "min-h-[12rem]"))}
            </div>

            {/* Small block */}
            <div >
              <div className="h-auto">
                {items[2] || (isEditMode && renderDropZone({}, "right-2", "min-h-[7rem]"))}
              </div>

              {/* Small block */}
              <div className="h-auto">
                {items[3] || (isEditMode && renderDropZone({}, "right-3", "min-h-[7rem]"))}
              </div>
            </div>

            {/* Small block */}
            <div className="h-auto -mt-3 ">
              {items[4] || (isEditMode && renderDropZone({}, "right-4", "min-h-[1rem]"))}
            </div>

            {/* Tall bottom block */}
            <div className="h-auto">
              {items[5] || (isEditMode && renderDropZone({}, "right-5", "min-h-[12rem]"))}
            </div>
          </div>
          </div>

        </div>
      </div>
    </section>
  );
}
