import React from 'react';
import { getPopupAdOptions } from '../campaignData';

export type PopupAdProps = { id?: string; adId?: string };

export const PopupAdBlock: React.FC<PopupAdProps> = ({ adId = 'auto' }) => {
    const isSpecific = adId && adId !== 'auto';
    const label = isSpecific ? getPopupAdOptions().find(o => o.value === adId)?.label ?? adId : '';

    // The real popup floats over the whole published page; here it is a marker you can drag to any position.
    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{
                border: `2px dashed ${isSpecific ? '#0071e3' : '#c7c7cc'}`,
                background: isSpecific ? '#f0f7ff' : '#f5f5f7',
                borderRadius: 14, width: '100%', maxWidth: 420, padding: '18px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: '#1d1d1f', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Popup Ad</span>
                <span style={{ fontSize: 10, color: '#6e6e73', textAlign: 'center', lineHeight: 1.5 }}>
                    Opens over the page after its trigger (immediate, delay or scroll) · shown once per visitor cap
                </span>
                <span style={{ fontSize: 10, color: isSpecific ? '#0071e3' : '#8e8e93', fontWeight: isSpecific ? 600 : 400, textAlign: 'center' }}>
                    {isSpecific ? label : 'Auto-resolves the live Popup campaign on publish'}
                </span>
            </div>
        </div>
    );
};

export default PopupAdBlock;
