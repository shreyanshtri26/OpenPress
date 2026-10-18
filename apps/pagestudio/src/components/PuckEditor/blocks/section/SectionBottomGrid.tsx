import { type ReactNode, useMemo } from "react";

import BottomCardList from "./BottomCardList";

export type SectionBottomGridProps = {
    id?: string;
    children?: ReactNode;
    className?: string;
    puck?: {
        renderDropZone?: (zoneProps: { zone: string; className?: string }) => ReactNode;
    };
};

export function SectionBottomGrid({
    id,
    children,
    className = "",
    puck,
}: SectionBottomGridProps) {
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
            zone: `section-bottom-${zoneName}`,
            className: `w-full ${extraClass}`,
        });
    };

    return (
        <section id={id} className={`w-full bg-white pt-8 lg:pr-24 pb-12 ${className}`}>
            <div className="mx-auto w-full max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">

                    {/* LEFT COLUMN - Only Top Bar */}
                    <div className="w-full flex flex-col gap-2">
                        {/* Top bar 1 */}
                        <div className="h-auto w-full min-h-[2.2rem]">
                            {items[0] || <BottomCardList /> || (isEditMode && renderDropZone({}, "left-top-1", "min-h-[2.2rem]"))}
                        </div>
                    </div>



                </div>
            </div>
        </section>
    );
}

export default SectionBottomGrid;
