import React from 'react';
import { getSpotlightAdOptions } from '../campaignData';

export type SpotlightAdProps = {
    id?: string;
    adId?: string;
};

export const SpotlightAdBlock: React.FC<SpotlightAdProps> = ({ adId = 'auto' }) => {
    const isSpecific = adId && adId !== 'auto';

    // Resolve campaign label from options for display
    let campaignLabel = '';
    if (isSpecific) {
        const options = getSpotlightAdOptions();
        const match = options.find(o => o.value === adId);
        campaignLabel = match ? match.label : adId;
    }

    // Always visible in the Puck editor canvas (desktop or mobile preview).
    // The actual published HTML is hidden on desktop via CSS media query in renderSpotlightAd.ts.
    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{
                border: `2px dashed ${isSpecific ? '#10b981' : '#d1d5db'}`,
                background: isSpecific ? '#f0fdf4' : '#f9fafb',
                borderRadius: 10,
                minHeight: 110,
                width: '100%',
                maxWidth: 420,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 16px',
                gap: 6,
            }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: 11, color: '#111', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Spotlight Ad
                </span>
                <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
                    Mobile-only · Native scroll-snap interscroller
                </span>
                <span style={{ fontSize: 9, color: isSpecific ? '#059669' : '#9ca3af', textAlign: 'center', marginTop: 2, fontWeight: isSpecific ? 600 : 400 }}>
                    {isSpecific
                        ? `📌 ${campaignLabel}`
                        : 'Auto-resolves the active Spotlight campaign on publish'}
                </span>
                <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>
                    Hidden on desktop · Visible on mobile only
                </span>
            </div>
        </div>
    );
};

export default SpotlightAdBlock;
