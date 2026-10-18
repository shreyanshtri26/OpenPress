import React from 'react';
import { getLiveAd, findAdById } from '../campaignData';

export type DynamicAdProps = {
    id?: string;
    adId?: string;
    placementName: string;
    desktopDimensions?: string;
    mobileDimensions?: string;
    fallbackBlock?: any;
};

export const DynamicAdBlock: React.FC<DynamicAdProps> = ({
    id,
    adId = 'auto',
    placementName,
    desktopDimensions = '300*250',
    mobileDimensions = '320*50',
    fallbackBlock,
}) => {
    const liveAd = adId === 'auto' ? getLiveAd(placementName) : findAdById(adId);

    // Only forced fallbacks exist now, as the option was removed
    // Parse dimensions (supports 300*250, 300x250, 300 x 250)
    const parseDim = (dim: string) => {
        const parts = dim.replace(/\s+/g, '').replace('x', '*').split('*').map(Number);
        return { w: parts[0] || 0, h: parts[1] || 0 };
    };

    // Use dimensions from campaign if available, otherwise fallback to props
    const finalDesktopDim = liveAd?.desktopDimensions || desktopDimensions;
    const finalMobileDim = liveAd?.mobileDimensions || mobileDimensions;

    const d = parseDim(finalDesktopDim);
    const m = parseDim(finalMobileDim);

    // MODIFICATION: Always show placeholder in editor even if campaign is unpaused
    const isEmpty = true; // Always true for editor display


    // In the editor, we always want to show the ad slot placeholder even if it's empty
    // so the user can see where the ad is placed and change its settings.

    return (
        <div id={id} className="w-full flex justify-center items-center py-4 bg-transparent">
            {/* Inline style for responsive dimensions */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .ad-slot-${placementName.replace(/\s+/g, '-')} {
                    width: 100%;
                    max-width: ${m.w}px;
                    aspect-ratio: ${m.w} / ${m.h};
                }
                .ad-slot-${placementName.replace(/\s+/g, '-')} .ad-desktop-img {
                    width: 100%;
                    height: 100%;
                }
                @media (min-width: 769px) {
                    .ad-slot-${placementName.replace(/\s+/g, '-')} {
                        max-width: ${d.w}px;
                        aspect-ratio: ${d.w} / ${d.h};
                    }
                }
            `}} />

            <div className={`flex flex-col items-center ad-slot-${placementName.replace(/\s+/g, '-')}`}>
                {isEmpty ? (
                    <div
                        className="w-full h-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-[9px] uppercase tracking-tighter font-bold p-2 text-center"
                    >
                        <span className="flex-col flex">
                            <span>{placementName}</span>
                            <span>({finalDesktopDim})</span>
                            {fallbackBlock && (
                                <span className="text-[8px] mt-1 text-blue-400">
                                    Fallback: {fallbackBlock.type}
                                </span>
                            )}
                        </span>
                    </div>
                ) : (
                    <a href={liveAd?.linkUrl || "#"} target="_blank" rel="noopener noreferrer" className="block w-full h-full hover:opacity-95 transition-opacity">
                        <picture className="w-full h-full">
                            {liveAd?.mobileImageUrl && (
                                <source media="(max-width: 768px)" srcSet={liveAd.mobileImageUrl} />
                            )}
                            <img
                                src={liveAd?.desktopImageUrl || ""}
                                alt={liveAd?.altText || "Advertisement"}
                                className="w-full h-full object-contain ad-desktop-img"
                                style={{
                                    objectFit: 'contain'
                                }}
                                loading="lazy"
                            />
                        </picture>
                    </a>
                )}
            </div>
        </div>
    );
};

export default DynamicAdBlock;
