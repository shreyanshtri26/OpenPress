import { type ReactNode, useMemo } from "react";

export type VideoAuthorGridProps = {
  id?: string;
  children?: ReactNode;
  className?: string;
  puck?: {
    renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode;
  };
};

export function VideoAuthorGrid({
  id,
  children,
  className = "",
  puck,
}: VideoAuthorGridProps) {
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
      zone: `video-author-grid-${zoneName}`,
      className: `w-full ${extraClass}`,
    });
  };

  return (
    <section id={id} className={`w-full bg-white pt-8 px-16 pb-12 ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ADD GAP BETWEEN LEFT & RIGHT */}
        <div className="flex flex-col lg:flex-row lg:gap-4">

          {/* LEFT COLUMN - slightly wider */}
          <div className="w-full lg:w-[110%] flex flex-col ">

            {/* Top header */}
            <div className="h-auto w-full min-h-[2.2rem]">
              {items[0] ||
                (isEditMode &&
                  renderDropZone({}, "left-top-1", "min-h-[2.2rem]"))}
            </div>

             {/* Main video items */}
            <div className="flex flex-col gap-10 mt-4">

              <div className="h-auto min-h-[8rem]">
                {items[1] ||
                  (isEditMode &&
                    renderDropZone({}, "left-video-1", "min-h-[10rem]"))}
              </div>

              <div className="h-auto min-h-[15rem]">
                {items[2] ||
                  (isEditMode &&
                    renderDropZone({}, "left-video-2", "min-h-[15rem]"))}
              </div>

              <div className="h-auto min-h-[15rem]">
                {items[3] ||
                  (isEditMode &&
                    renderDropZone({}, "left-video-3", "min-h-[15rem]"))}
              </div>

            </div>
          </div>

          {/* RIGHT SIDEBAR - unchanged */}
          <div className="w-full lg:w-[30%] flex flex-col gap-5 mt-10 lg:mt-0">

            <div className="h-auto min-h-[12rem]">
              {items[6] ||
                (isEditMode &&
                  renderDropZone({}, "right-1", "min-h-[12rem]"))}
            </div>

            <div>
              <div className="h-auto min-h-[7rem]">
                {items[7] ||
                  (isEditMode &&
                    renderDropZone({}, "right-2", "min-h-[7rem]"))}
              </div>

              <div className="border-t border-dotted border-gray-700"></div>

              <div className="h-auto min-h-[7rem]">
                {items[8] ||
                  (isEditMode &&
                    renderDropZone({}, "right-3", "min-h-[7rem]"))}
              </div>

              <div className="border-t border-gray-500"></div>
            </div>

            <div className="h-auto min-h-[1rem] -mt-3">
              {items[9] ||
                (isEditMode &&
                  renderDropZone({}, "right-4", "min-h-[1rem]"))}
            </div>

            <div className="h-auto min-h-[20rem]">
              {items[10] ||
                (isEditMode &&
                  renderDropZone({}, "right-5", "min-h-[20rem]"))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default VideoAuthorGrid;
