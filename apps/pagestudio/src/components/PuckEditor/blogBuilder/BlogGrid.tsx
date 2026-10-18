import { type ReactNode, useMemo } from "react";

export type BlogGridProps = {
  id?: string;
  children?: ReactNode;
  className?: string;
  puck?: {
    renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode;
  };
};

export function BlogGrid({
  id,
  children,
  className = "",
  puck,
}: BlogGridProps) {
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
      zone: `blog-grid-${zoneName}`,
      className: `w-full ${extraClass}`,
    });
  };

  const isHomePage = typeof window !== 'undefined' && (() => {
    const { pathname, hash, search } = window.location;
    if (search) {
      const params = new URLSearchParams(search);
      const pageType = params.get('pageType') || params.get('page');
      if (pageType) return pageType.toLowerCase() === 'home';
    }
    if (hash) {
      if (hash === '#/' || hash === '#' || hash === '#/home') return true;
      if (hash.startsWith('#/published/home')) return true;
      if (hash.startsWith('#/published/')) return false;
    }
    const cleanPath = pathname.replace(/\/$/, '');
    return cleanPath === '' || cleanPath === '/home' || cleanPath === '/published/home';
  })();

  return (
    <section id={id} className={`w-full bg-white pt-4 px-4 pb-6 lg:pt-8 lg:px-16 lg:pb-12 ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-[2%]">

          {/* LEFT COLUMN - Only Top Bar */}
          <div className="flex-1 flex flex-col gap-1 lg:gap-2">
            {/* Top bar 1 */}
            <div className="h-auto w-full min-h-0 lg:min-h-[2.2rem]">
              {items[0] || (isEditMode && renderDropZone({}, "left-top-1", "min-h-[2.2rem]"))}
            </div>
          </div>

          {/* RIGHT COLUMN: same structure and sizes as the published page (renderBlogGrid) */}
          <div className="w-full lg:w-[30%] flex flex-col gap-5 blog-grid-right-col">
            <div className="relative z-10 bg-white flex flex-col gap-5">
              <div className="h-auto min-h-0 lg:min-h-[12rem] pt-4">
                {items[6] || (isEditMode && renderDropZone({}, "right-1", "min-h-[12rem]"))}
              </div>
              <div className="h-auto min-h-0 lg:min-h-[3rem]">
                {items[7] || (isEditMode && renderDropZone({}, "right-2", "min-h-[3rem]"))}
              </div>
              <div className="h-auto min-h-0 lg:min-h-[7rem]">
                {items[8] || (isEditMode && renderDropZone({}, "right-3", "min-h-[7rem]"))}
              </div>
              <div className="h-auto min-h-0 -mt-3 bg-white [&_article]:!border-b-0">
                {items[9] || (isEditMode && renderDropZone({}, "right-4", "min-h-[1rem]"))}
              </div>
            </div>

            <div className="lg:sticky lg:top-[96px] lg:self-start pb-8 bg-white z-10">
              <div className="h-auto min-h-0">
                {items[10] || (isEditMode && renderDropZone({}, "right-5", "min-h-[12rem]"))}
              </div>
            </div>
          </div>

        </div>
      </div>
      {isHomePage && (
        <style>{`
          @media (max-width: 1023px) {
            #${id} .blog-grid-right-col section[id*="heading"],
            #${id} .blog-grid-right-col section[id*="Heading"] {
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            #${id} .blog-grid-right-col section[id*="heading"] > div,
            #${id} .blog-grid-right-col section[id*="Heading"] > div {
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
          }
        `}</style>
      )}
    </section>
  );
}
