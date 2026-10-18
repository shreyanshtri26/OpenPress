import { type ReactNode } from "react";
import { DropZone } from "@measured/puck";

export type AuthorsGridManualProps = {
    id: string; // Puck instance ID
    children?: ReactNode;
    rowCount?: number;
    title?: string;
    puck?: {
        renderDropZone: (zoneProps: { zone: string; disallow?: string[]; className?: string }) => ReactNode;
    };
};

export function AuthorsGridManual({ id, children, rowCount = 3, title = "The Voices Behind OpenPress", puck }: AuthorsGridManualProps) {
    // Detect if we are in the editor vs the published/preview page.
    const isEditMode = Boolean(puck?.renderDropZone);

    const renderSlot = (index: number) => {
        const zoneName = `author-slot-${index}`;

        // 1. Editor Mode: Use puck.renderDropZone (Puck handles prefixing automatically)
        if (isEditMode && puck?.renderDropZone) {
            return (
                <div key={index} className="flex-1 min-w-0">
                    {puck.renderDropZone({
                        zone: zoneName,
                        disallow: ["AuthorsGridManual", "SectionGrid", "AuthorsGrid"],
                        className: "w-full min-h-[150px] rounded-lg flex items-center justify-center"
                    })}
                </div>
            );
        }

        // 2. Preview/Published Mode: Resolve content from named zones
        // Puck maps these to the children object. We hide empty slots completely.
        const fullZoneName = `${id}:${zoneName}`;

        // Smart check for content in preview mode
        const hasContent = children && typeof children === 'object' && !Array.isArray(children)
            ? Boolean((children as any)[zoneName])
            : false;

        if (!hasContent) {
            return null;
        }

        return (
            <div key={index} className="flex-1 min-w-0">
                <DropZone zone={fullZoneName} />
            </div>
        );
    };

    // Grouping slots into rows to maintain grid stability
    const rows = [];
    const safeRowCount = Math.max(rowCount || 0, 1);

    for (let i = 0; i < safeRowCount; i++) {
        const rowSlots = [];
        for (let j = 0; j < 4; j++) {
            const slotIndex = i * 4 + j;
            const slot = renderSlot(slotIndex);
            if (slot) rowSlots.push(slot);
        }

        if (rowSlots.length > 0) {
            rows.push(
                <div key={i} className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 w-full ${rows.length > 0 ? "mt-10" : ""}`}>
                    {rowSlots}
                </div>
            );
        }
    }

    return (
        <div className="w-full relative py-16 px-4 sm:px-6 lg:px-8">
            {/* Background Layer - Decreased height */}
            <div className="absolute inset-0 h-[361px] bg-graph-paper -z-10"></div>
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16 relative">
                    <h2 className="text-4xl md:text-5xl font-extrabold font-libre text-black tracking-tight leading-tight whitespace-pre-line">
                        {title}
                    </h2>
                </div>
                <div className="flex flex-col w-full">
                    {rows}
                </div>
            </div>
        </div>
    );
}

export default AuthorsGridManual;
