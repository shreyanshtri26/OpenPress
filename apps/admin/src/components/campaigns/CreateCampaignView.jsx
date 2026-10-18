import { ChevronLeft, Loader2, Monitor, Save, Smartphone, X } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/UserContext';
import { republishAllCampaignPages } from '../../helpers/republishAllCampaignPages';
import { useRouter } from '../../hooks/useRouter';
import apiFetch from '../../utils/api';
import env from '../../utils/env';
import CustomButton from '../common/CustomButton';
import BackToDashboardButton from '../common/BackToDashboardButton';
import BasicInfoForm from './BasicInfoForm';
import JobCard from './JobCard';

const PreviewModal = ({ isOpen, onClose, job, campaignName, landingPageURL, dynamicPlacements = [] }) => {
    if (!isOpen || !job) return null;

    const linkUrl = landingPageURL || "#";
    const cleanTag = (tag) => {
        if (!tag) return '';
        return tag
            .replace(/\u00A0/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/{{LANDING_PAGE_URL}}/gi, linkUrl);
    };

    const tagDesktop = cleanTag(job.thirdPartyTagDesktop || job.third_party_tag_desktop || "");
    const tagMobile = cleanTag(job.thirdPartyTagMobile || job.third_party_tag_mobile || "");

    const parseDim = (dimStr, defaultW, defaultH) => {
        if (!dimStr) return { width: defaultW, height: defaultH };
        // Robust split: handles '728x90', '730 * 95', '325X52', etc.
        const parts = dimStr.split(/\s*[*xX]\s*/);
        if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
            return { width: parseInt(parts[0].trim(), 10), height: parseInt(parts[1].trim(), 10) };
        }
        return { width: defaultW, height: defaultH };
    };

    let dims = {
        desktop: { width: 728, height: 90, label: "Desktop (728x90)" },
        mobile: { width: 320, height: 50, label: "Mobile (320x50)" }
    };

    // Popup Ad creatives live on popupDesktopImage/popupMobileImage instead of
    // job.creatives — fall back to those so the preview isn't blank for popups.
    const mobileAsset = job.creatives?.mobile?.[0];
    const mobileAssetUrl = mobileAsset?.preview || mobileAsset?.fileUrl
        || (job.adFormat === 'popup' ? job.popupMobileImage : null);
    // Spotlight's mobile page actually scroll-slides through EVERY uploaded slide
    // (see lib/helpers/renderSpotlightAd.js), not just the fallback — preview all of them.
    const spotlightSlides = job.adFormat === 'spotlight'
        ? (job.spotlightMobileImages || []).filter(Boolean)
        : [];
    // Spotlight Ad has no desktop creative — on desktop it shows the chosen
    // fallback slide (stored in creatives.mobile) as a sidebar card instead,
    // so preview the same fallback image on the desktop pane too.
    const desktopAsset = job.creatives?.desktop?.[0];
    const desktopAssetUrl = desktopAsset?.preview || desktopAsset?.fileUrl
        || (job.adFormat === 'popup' ? job.popupDesktopImage : null)
        || (job.adFormat === 'spotlight' ? mobileAssetUrl : null);

    const dynPlacement = dynamicPlacements.find(p => p.name === job.placement);
    if (dynPlacement) {
        const dSize = parseDim(dynPlacement.desktopDimensions, 728, 90);
        const mSize = parseDim(dynPlacement.mobileDimensions, 320, 50);
        dims = {
            desktop: { ...dSize, label: `Desktop (${dSize.width}x${dSize.height})` },
            mobile: { ...mSize, label: `Mobile (${mSize.width}x${mSize.height})` }
        };
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="bg-white w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col ">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Placement Preview</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{campaignName || 'Untitled'} / {job.placement}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-gray-50/30 space-y-12 min-h-[400px]">
                    <div className={`grid grid-cols-1 ${dims.desktop.width > 500 ? 'lg:grid-cols-1 gap-12' : 'lg:grid-cols-2 gap-10'}`}>
        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Monitor size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{dims.desktop.label}</span>
                            </div>
                            {job.adFormat === 'spotlight' && (
                                <p className="text-[10px] text-gray-400 -mt-2">
                                    Shown as a fallback card in the sidebar on desktop, not inline.
                                </p>
                            )}
                            <div className="bg-white border border-gray-100 p-4 shadow-sm min-w-0 overflow-hidden flex flex-col items-center">
                                {job.thirdPartyTagDesktop ? (
                                    <div
                                        className="relative overflow-hidden border border-black p-0.5 bg-gray-50"
                                        style={{
                                            width: '100%',
                                            maxWidth: `${dims.desktop.width}px`,
                                            aspectRatio: `${dims.desktop.width}/${dims.desktop.height}`
                                        }}
                                    >
                                        <iframe
                                            title="Desktop Tag"
                                            srcDoc={`<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagDesktop}`}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                                        />
                                    </div>
                                ) : desktopAssetUrl ? (
                                    (() => {
                                        const url = desktopAssetUrl;
                                        const isScript = url.toLowerCase().endsWith('.js') || url.toLowerCase().endsWith('.html') || (desktopAsset?.file?.type && (desktopAsset.file.type.includes('javascript') || desktopAsset.file.type.includes('html')));
                                        if (isScript) {
                                            return (
                                                <div
                                                    className="relative overflow-hidden border border-black p-0.5 bg-gray-50"
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: `${dims.desktop.width}px`,
                                                        aspectRatio: `${dims.desktop.width}/${dims.desktop.height}`
                                                    }}
                                                >
                                                    <iframe
                                                        title="Desktop Script Asset"
                                                        src={url}
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                                                    />
                                                </div>
                                            );
                                        }
                                        return (
                                            <div style={{ maxWidth: `${dims.desktop.width}px`, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                <img
                                                    src={url}
                                                    alt="Desktop Preview"
                                                    style={{ width: '100%', height: 'auto', maxHeight: '500px' }}
                                                    className="object-contain border border-gray-200"
                                                />
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 w-full" style={{ maxWidth: `${dims.desktop.width}px`, aspectRatio: `${dims.desktop.width}/${dims.desktop.height}` }}>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Desktop Asset</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Smartphone size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                                    {spotlightSlides.length > 0 ? 'Mobile (Full-Screen Slider)' : dims.mobile.label}
                                </span>
                            </div>
                            <div className="bg-white border border-gray-100 p-4 shadow-sm min-w-0 overflow-hidden flex flex-col items-center">
                                {spotlightSlides.length > 0 ? (
                                    <div className="w-full">
                                        <p className="text-[9px] text-gray-400 mb-3 text-center uppercase tracking-wider font-bold">
                                            Scroll-slider &middot; {spotlightSlides.length} slide{spotlightSlides.length > 1 ? 's' : ''} (mobile only)
                                        </p>
                                        {/* Spotlight slides are always full-bleed portrait mobile images —
                                            not related to the placement's declared banner dimensions —
                                            so use the same 110x195 ratio as the JobCard slide editor. */}
                                        <div className="flex gap-3 overflow-x-auto pb-2 justify-center" style={{ scrollbarWidth: 'thin' }}>
                                            {spotlightSlides.map((url, i) => (
                                                <div
                                                    key={i}
                                                    className="relative flex-shrink-0 border border-gray-200 rounded overflow-hidden bg-gray-50"
                                                    style={{ width: 160, aspectRatio: '110/195' }}
                                                >
                                                    <img src={url} alt={`Slide ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                    <span className="absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-black/70 text-white text-[9px] font-black">
                                                        {i + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : job.thirdPartyTagMobile ? (
                                    <div
                                        className="relative overflow-hidden border border-black p-0.5 bg-gray-50"
                                        style={{
                                            width: '100%',
                                            maxWidth: `${dims.mobile.width}px`,
                                            aspectRatio: `${dims.mobile.width}/${dims.mobile.height}`
                                        }}
                                    >
                                        <iframe title="Mobile Tag" srcDoc={`<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}</style>${tagMobile}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
                                    </div>
                                ) : mobileAssetUrl ? (
                                    (() => {
                                        const url = mobileAssetUrl;
                                        const isScript = url.toLowerCase().endsWith('.js') || url.toLowerCase().endsWith('.html') || (mobileAsset?.file?.type && (mobileAsset.file.type.includes('javascript') || mobileAsset.file.type.includes('html')));
                                        if (isScript) {
                                            return (
                                                <div
                                                    className="relative overflow-hidden border border-black p-0.5 bg-gray-50"
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: `${dims.mobile.width}px`,
                                                        aspectRatio: `${dims.mobile.width}/${dims.mobile.height}`
                                                    }}
                                                >
                                                    <iframe title="Mobile Script Asset" src={url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
                                                </div>
                                            );
                                        }
                                        return (
                                            <div style={{ maxWidth: `${dims.mobile.width}px`, width: '100%' }}>
                                                <img
                                                    src={url}
                                                    alt="Mobile Preview"
                                                    style={{ width: '100%', height: 'auto', maxHeight: '400px' }}
                                                    className="object-contain border border-gray-200"
                                                />
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 w-full" style={{ maxWidth: `${dims.mobile.width}px`, aspectRatio: `${dims.mobile.width}/${dims.mobile.height}` }}>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Mobile Asset</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-4 bg-gray-50 flex justify-end border-t border-gray-100 shrink-0">
                    <button onClick={onClose} className="px-8 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95">
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    );
};

/** Shown when a job would span a window that is already booked. */
const ScheduleConflictModal = ({ notice, onClose }) => {
    if (!notice) return null;
    const { placement, conflict } = notice;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white border-2 border-black max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Schedule not available</p>
                <p className="text-[15px] text-black leading-relaxed">
                    <strong>{placement}</strong> is already booked by <strong>{conflict.label}</strong> from{' '}
                    <strong>{formatRange(conflict.start, conflict.end)}</strong>.
                </p>
                <p className="text-[14px] text-gray-600 leading-relaxed mt-3">
                    You can schedule this job entirely before it or entirely after it, but not across it.
                </p>
                <div className="flex justify-end mt-6">
                    <CustomButton onClick={onClose} variant="black">
                        <span>Got it</span>
                    </CustomButton>
                </div>
            </div>
        </div>
    );
};

/**
 * Helper to determine if a placement is an "In story" type placement.
 * Matches case-insensitively and handles spaces, underscores, and hyphens.
 */
const isInStoryPlacement = (placementName, dynamicPlacements = []) => {
    if (!placementName) return false;
    const normalized = placementName.toLowerCase().trim().replace(/[\s_-]+/g, '-');
    if (normalized === 'in-story' || normalized === 'instory' || normalized === 'instory-ad' || normalized === 'in-story-ad') {
        return true;
    }
    const dyn = dynamicPlacements.find(p =>
        p.name === placementName ||
        p.name.toLowerCase().trim().replace(/[\s_-]+/g, '-') === normalized
    );
    if (dyn) {
        const type = (dyn.type || dyn.placement_type || '').toLowerCase().trim();
        return type === 'in_story' || type === 'in story' || type === 'in-story';
    }
    return false;
};

/**
 * Spotlight Ads reuse the In-Story placement mechanic (afterParagraph) regardless of
 * which placement slot they're attached to, since they're always positioned inline
 * within the story's paragraph flow — only the rendered format differs.
 */
const needsInStoryPosition = (job, dynamicPlacements = []) =>
    job?.adFormat === 'spotlight' || isInStoryPlacement(job?.placement, dynamicPlacements);

/**
 * Spotlight Ads always show once (never repeat) — unlike In-Story Ads, which default
 * to repeating every N paragraphs.
 */
const resolveRepeatAd = (job) => job?.adFormat === 'spotlight' ? false : (job?.repeatAd !== false);

/**
 * Helper to find a placement in the dynamic placements list using a normalized name check.
 */
const findPlacement = (placementName, list = []) => {
    if (!placementName) return null;
    const normalized = placementName.toLowerCase().trim().replace(/[\s_-]+/g, '-');
    return list.find(p =>
        p.name === placementName ||
        p.name.toLowerCase().trim().replace(/[\s_-]+/g, '-') === normalized
    );
};

const resolvePlacementName = (placementName, list = []) => {
    const match = findPlacement(placementName, list);
    return match?.name || placementName || '';
};

/*
 * Placement scheduling conflict rules.
 *
 * Two campaigns (or two jobs of one campaign) may never occupy the same placement
 * at the same time. Windows are inclusive on both ends, so a job may start at the
 * previous one's end time plus one minute.
 */

const MINUTE_MS = 60000;

/** Statuses that make a campaign occupy its placement, so others can't overlap it. */
const BLOCKING_STATUSES = new Set([
    'start now', 'start_now', 'schedule', 'scheduled', 'active', 'draft', 'pause', 'paused'
]);

const isBlockingStatus = (status) => BLOCKING_STATUSES.has((status || '').toLowerCase().trim());

/**
 * Canonical slug for a placement name ("Sidebar Rectangle" → "sidebar-rectangle").
 * Spaces, underscores and hyphens collapse, so display names and stored slugs match.
 */
const normalizePlacement = (p) => (p || '').toLowerCase().trim().replace(/[\s_-]+/g, '-');

/** Timestamp of any date-ish value, or NaN. */
const toTime = (v) => {
    if (!v) return NaN;
    const t = new Date(v).getTime();
    return isNaN(t) ? NaN : t;
};

/** Inclusive interval overlap — two windows clash if they share even one minute. */
const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
    const s1 = toTime(aStart), e1 = toTime(aEnd), s2 = toTime(bStart), e2 = toTime(bEnd);
    if ([s1, e1, s2, e2].some(isNaN)) return false;
    return s1 <= e2 && e1 >= s2;
};

/**
 * Every window that already occupies `placement` and therefore can't be overlapped:
 * jobs of other blocking campaigns, plus the other jobs of the campaign being edited.
 */
const getConflictRanges = (placement, allCampaigns, editData, jobs, excludeJobId) => {
    const slug = normalizePlacement(placement);
    if (!slug) return [];
    const ranges = [];

    (allCampaigns || []).forEach(cp => {
        if (editData && String(cp.campaignId) === String(editData.campaignId)) return;
        if (!isBlockingStatus(cp.status)) return;

        const label = cp.campaignName || cp.name || 'another campaign';
        const placementJobs = (cp.jobs || []).filter(j => normalizePlacement(j.placement) === slug);

        if (placementJobs.length) {
            placementJobs.forEach(j => ranges.push({ start: j.startTime, end: j.endTime, label }));
        } else if ((cp.placements || []).some(p => normalizePlacement(p) === slug)) {
            ranges.push({ start: cp.startTime || cp.startDate, end: cp.endTime || cp.endDate, label });
        }
    });

    (jobs || []).forEach(j => {
        if (excludeJobId && j.id === excludeJobId) return;
        if (normalizePlacement(j.placement) !== slug) return;
        ranges.push({ start: j.startTime, end: j.endTime, label: 'another job in this campaign' });
    });

    return ranges.filter(r => !isNaN(toTime(r.start)) && !isNaN(toTime(r.end)));
};

/** First conflicting window for [start, end], or null. A missing end means a single instant. */
const findRangeConflict = (start, end, ranges) => {
    const a = start || end;
    const b = end || start;
    if (!a || !b) return null;
    return (ranges || []).find(r => rangesOverlap(a, b, r.start, r.end)) || null;
};

/**
 * The minute ranges of `day` that are still free, given the booked windows.
 * A window ending at 2:15 pm frees 2:16 pm onward; one starting at 2:15 pm
 * leaves everything up to 2:14 pm. `lowerBound` raises the floor further.
 */
const freeSegmentsForDay = (day, ranges, lowerBound) => {
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 0, 0);

    const bound = toTime(lowerBound);
    let cursor = isNaN(bound) ? dayStart.getTime() : Math.max(dayStart.getTime(), bound);

    const blocked = (ranges || [])
        .map(r => ({ s: toTime(r.start), e: toTime(r.end) }))
        .filter(r => !isNaN(r.s) && !isNaN(r.e) && r.e >= dayStart.getTime() && r.s <= dayEnd.getTime())
        .sort((a, b) => a.s - b.s);

    const segments = [];
    blocked.forEach(b => {
        if (b.s - cursor >= MINUTE_MS) {
            segments.push({ start: cursor, end: Math.min(b.s - MINUTE_MS, dayEnd.getTime()) });
        }
        if (b.e + MINUTE_MS > cursor) cursor = b.e + MINUTE_MS;
    });
    if (cursor <= dayEnd.getTime()) segments.push({ start: cursor, end: dayEnd.getTime() });

    return segments.filter(s => s.start <= s.end);
};

/** True when nothing on `day` is selectable any more. */
const isDayFullyBlocked = (day, ranges) => freeSegmentsForDay(day, ranges, null).length === 0;

/**
 * Keep `candidate` if its minute is free that day. Otherwise snap it to the
 * closest free minute (picking a date) or refuse it (turning the clock), so a
 * day booked from 2:15 pm lands on 2:14 pm and one free from 2:16 pm on 2:16 pm.
 */
const resolveInstantForDay = (candidate, ranges, lowerBound, snap) => {
    const segments = freeSegmentsForDay(candidate, ranges, lowerBound);
    if (!segments.length) return null;

    const t = new Date(candidate).setSeconds(0, 0);
    if (segments.some(s => t >= s.start && t <= s.end)) return new Date(t);
    if (!snap) return null;

    let nearest = null;
    segments.forEach(s => {
        const clamped = Math.min(Math.max(t, s.start), s.end);
        if (nearest === null || Math.abs(clamped - t) < Math.abs(nearest - t)) nearest = clamped;
    });
    return nearest === null ? null : new Date(nearest);
};

/** A booked window this job would straddle — legal at both ends, wrong in between. */
const findContainedWindow = (start, end, ranges) => {
    const s = toTime(start), e = toTime(end);
    if (isNaN(s) || isNaN(e)) return null;
    return (ranges || []).find(r => {
        const rs = toTime(r.start), re = toTime(r.end);
        return !isNaN(rs) && !isNaN(re) && s < rs && e > re;
    }) || null;
};

/** Walk forward from `candidate` to the first minute no conflicting window covers. */
const findFirstFreeInstant = (candidate, ranges) => {
    let d = new Date(candidate);
    d.setSeconds(0, 0);

    for (let guard = 0; guard < 2000; guard++) {
        const t = d.getTime();
        const hit = (ranges || []).find(r => toTime(r.start) <= t && t <= toTime(r.end));
        if (!hit) return d;
        d = new Date(toTime(hit.end) + MINUTE_MS);
        d.setSeconds(0, 0);
    }
    return d;
};

/** Job landing page URL is optional, but a filled one must be http(s). */
const hasInvalidLandingPageUrl = (job) => {
    const url = (job?.landingPageURL || '').trim();
    return url !== '' && !/^(https?:\/\/)[^\s$.?#].[^\s]*$/i.test(url);
};

/** Human-readable window bounds for conflict messages. */
const formatRange = (start, end) => {
    const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return `${new Date(start).toLocaleString(undefined, opts)} – ${new Date(end).toLocaleString(undefined, opts)}`;
};

/**
 * Earliest selectable start for a job on this placement: now, moved past any
 * window already booked (other campaigns and sibling jobs alike).
 *
 * @param {Array}  jobs         - sibling jobs (exclude the job being reassigned before calling)
 * @param {string} placement    - the target placement name (display form or slug, both handled)
 * @param {Array}  allCampaigns - all campaigns list (used for external conflict checking)
 * @param {object} editData     - campaign being edited, excluded from conflict check (may be null)
 */
const getSmartStartTime = (jobs, placement, allCampaigns, editData) => {
    const ranges = getConflictRanges(placement, allCampaigns, editData, jobs, null);

    // Sibling jobs block only their own window, so free days before them stay open.
    const now = new Date();
    now.setSeconds(0, 0);
    return findFirstFreeInstant(now, ranges);
};

// const DUMMY_PLACEMENTS = [
//     {
//         name: "Leaderboard",
//         type: "leaderboard",
//         desktopDimensions: "600x90",
//         mobileDimensions: "100x50",
//         fillPriority: "Direct",
//         status: "Active"
//     },
//     {
//         name: "Sidebar rectangle",
//         type: "sidebar",
//         desktopDimensions: "400x250",
//         mobileDimensions: "300x250",
//         fillPriority: "Direct",
//         status: "Active"
//     },
//     {
//         name: "In story",
//         type: "in_story",
//         desktopDimensions: "1428x90",
//         mobileDimensions: "320x50",
//         fillPriority: "Direct",
//         status: "Active"
//     },
//     {
//         name: "leaderboard-small",
//         type: "leaderboard",
//         desktopDimensions: "400x50",
//         mobileDimensions: "320x50",
//         fillPriority: "Direct",
//         status: "Active"
//     }
// ];

export default function CreateCampaignView({ onBack, editData, allCampaigns, onSave }) {
    const { user } = useContext(UserContext);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isDraftSaving, setIsDraftSaving] = useState(false);
    const [previewJob, setPreviewJob] = useState(null);
    const [scheduleNotice, setScheduleNotice] = useState(null);
    const [dynamicPlacements, setDynamicPlacements] = useState([]);
    const [taxonomies, setTaxonomies] = useState([]);

    useEffect(() => {
        const fetchPlacements = async () => {
            try {
                const response = await apiFetch(`${env.backendApi}/placements`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    const placements = data.placements || data || [];
                    if (placements.length > 0) {
                        setDynamicPlacements(placements);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch dynamic placements, using defaults", err);
            }
        };

        const fetchTaxonomies = async () => {
            try {
                const response = await apiFetch(`${env.backendApi}/taxonomies`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTaxonomies(data.taxonomies || []);
                }
            } catch (err) {
                console.error("Failed to fetch taxonomies", err);
            }
        };

        fetchPlacements();
        fetchTaxonomies();
    }, [user?.token]);
    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(user?.token && { Authorization: `Bearer ${user.token}` }),
    }), [user?.token]);

    const [formData, setFormData] = useState(() => {
        const initialLandingPageUrl = editData?.url || editData?.landingPageURL || editData?.landingPageUrl || editData?.landing_page_url ||
            editData?.jobs?.find(job => job.landingPageURL || job.landing_page_url)?.landingPageURL ||
            editData?.jobs?.find(job => job.landingPageURL || job.landing_page_url)?.landing_page_url || '';
        return {
            campaignName: editData?.campaignName || '',
            advertiserName: editData?.advertiserName || '',
            url: initialLandingPageUrl,
            status: (editData?.status?.toLowerCase() === 'draft' || editData?.status?.toLowerCase() === 'active') ? 'Start now' : (editData?.status || 'Start now'),
            frequencyCapEnabled: editData?.frequencyCapEnabled || false,
            frequencyCapMax: editData?.frequencyCapMax || 0,
            frequencyCapPeriod: editData?.frequencyCapPeriod || 'Session',
            jobs: editData?.jobs || [{
                id: `job-initial-${Date.now()}`,
                placement: '',
                startTime: null,  // not prefilled — suggested time shown via calendar header
                endTime: null,
                creatives: { desktop: [], mobile: [] },
                thirdPartyTagDesktop: '',
                thirdPartyTagMobile: '',
                afterParagraph: '',
                repeatAd: true
            }]
        };
    });

    useEffect(() => {
        if (editData) {
            const landingPageUrl = editData.url || editData.landingPageURL || editData.landingPageUrl || editData.landing_page_url ||
                editData.jobs?.find(job => job.landingPageURL || job.landing_page_url)?.landingPageURL ||
                editData.jobs?.find(job => job.landingPageURL || job.landing_page_url)?.landing_page_url || '';
            // Map slugified placements back to canonical display names if possible
            const mappedJobs = (editData.jobs || []).map(job => {
                if (dynamicPlacements.length > 0) {
                    const dyn = dynamicPlacements.find(p =>
                        normalizePlacement(p.name) === normalizePlacement(job.placement)
                    );
                    if (dyn) return { ...job, placement: dyn.name };
                }
                return job;
            });

            setFormData({
                campaignName: editData.campaignName || '',
                advertiserName: editData.advertiserName || '',
                url: landingPageUrl,
                status: (editData.status?.toLowerCase() === 'draft' || editData.status?.toLowerCase() === 'active') ? 'Start now' : (editData.status || 'Start now'),
                frequencyCapEnabled: editData.frequencyCapEnabled || false,
                frequencyCapMax: editData.frequencyCapMax || 0,
                frequencyCapPeriod: editData.frequencyCapPeriod || 'Session',
                jobs: mappedJobs
            });
        }
    }, [editData, dynamicPlacements]);

    // Schedules as they were loaded for edit. Save-time conflict checks only look at
    // jobs that differ from this, so a pre-existing overlap can't block an unrelated edit.
    const originalJobSchedules = useMemo(() => {
        const map = new Map();
        (editData?.jobs || []).forEach(j => {
            const key = j.id || j.jobId;
            if (!key) return;
            map.set(String(key), {
                placement: normalizePlacement(j.placement),
                start: toTime(j.startTime),
                end: toTime(j.endTime)
            });
        });
        return map;
    }, [editData]);

    const isScheduleUntouched = (job) => {
        const base = originalJobSchedules.get(String(job.id));
        if (!base) return false;
        const sameTime = (a, b) => (isNaN(a) && isNaN(b)) || a === b;
        return base.placement === normalizePlacement(job.placement)
            && sameTime(base.start, toTime(job.startTime))
            && sameTime(base.end, toTime(job.endTime));
    };

    /** Final authority before saving: message for the first conflicting job, else null. */
    const findScheduleConflict = () => {
        for (const job of formData.jobs) {
            if (!job.placement || !job.startTime || !job.endTime) continue;
            if (isScheduleUntouched(job)) continue;

            const conflict = findRangeConflict(job.startTime, job.endTime, conflictRangesFor(job.placement, job.id));
            if (conflict) {
                return `${job.placement} overlaps ${conflict.label} (${formatRange(conflict.start, conflict.end)}). Pick a different schedule.`;
            }
        }
        return null;
    };

    const handleFormChange = (e) => {
        const { dataField, value } = e;
        setFormData((prev) => ({ ...prev, [dataField]: value }));
    };

    const addJob = () => {
        setFormData(prev => {
            return {
                ...prev,
                jobs: [...prev.jobs, {
                    id: `job-${Date.now()}`,
                    placement: '',
                    startTime: null,  // not prefilled — suggested time shown via calendar header
                    endTime: null,
                    creatives: { desktop: [], mobile: [] },
                    thirdPartyTagDesktop: '',
                    thirdPartyTagMobile: '',
                    afterParagraph: '',
                    repeatAd: true
                }]
            };
        });
        toast.success('New placement job added');
    };

    const deleteJob = (jobId) => {
        if (formData.jobs.length <= 1) {
            toast.error('Campaign must have at least one placement job');
            return;
        }
        setFormData(prev => ({
            ...prev,
            jobs: prev.jobs.filter(j => j.id !== jobId)
        }));
    };

    const updateJob = (updatedJob) => {
        setFormData(prev => ({
            ...prev,
            jobs: prev.jobs.map(j => j.id === updatedJob.id ? updatedJob : j)
        }));
    };

    /**
     * Called when the user explicitly changes the placement dropdown on a job card.
     * We exclude the job being changed from the scan so it doesn't count as a
     * "prior job" of its own new placement.
     */
    const handleJobPlacementChange = (jobId, newPlacement) => {
        setFormData(prev => {
            // All jobs except the one being reassigned
            const otherJobs = prev.jobs.filter(j => j.id !== jobId);
            // Smart start: skip same-placement prior jobs AND skip externally blocked days.
            // We store this as `minStartTime` (NOT `startTime`) so the field stays empty
            // but the calendar opens at the correct valid date.
            const smartStart = getSmartStartTime(otherJobs, newPlacement, allCampaigns, editData);

            return {
                ...prev,
                jobs: prev.jobs.map(j =>
                    j.id === jobId
                        ? {
                            ...j,
                            placement: newPlacement,
                            startTime: null,        // ← keep empty, no pre-fill
                            endTime: null,
                            minStartTime: smartStart, // ← drives the calendar min/open date
                            creatives: { desktop: [], mobile: [] },
                            thirdPartyTagDesktop: '',
                            thirdPartyTagMobile: '',
                            afterParagraph: needsInStoryPosition({ ...j, placement: newPlacement }, dynamicPlacements) ? (j.afterParagraph || 3) : '',
                            repeatAd: needsInStoryPosition({ ...j, placement: newPlacement }, dynamicPlacements) ? resolveRepeatAd(j) : true
                        }
                        : j
                )
            };
        });
    };

    /** Windows already taken for this placement, ignoring the job being edited. */
    const conflictRangesFor = (placement, jobId) =>
        getConflictRanges(placement, allCampaigns, editData, formData.jobs, jobId);

    // Grey out a calendar day only when no minute of it is selectable; partly-booked
    // days stay open and the chosen instant is checked by resolveJobDateTime().
    const disabledDates = (args, currentJobPlacement, currentJobId) => {
        if (!currentJobPlacement) return false;

        const dateObj = args?.date || args;
        if (!dateObj || isNaN(new Date(dateObj).getTime())) return false;

        return isDayFullyBlocked(new Date(dateObj), conflictRangesFor(currentJobPlacement, currentJobId));
    };

    /**
     * Decides what a start/end pick becomes: the value itself, a time snapped into
     * the day's first free slot, or nothing at all. `source` is 'date' when a day
     * was clicked and 'time' when the clock was turned.
     */
    const resolveJobDateTime = (job, field, candidate, source) => {
        if (!job?.placement || !candidate) return candidate;

        const ranges = conflictRangesFor(job.placement, job.id);
        if (!ranges.length) return candidate;

        const lowerBound = field === 'endTime' && job.startTime
            ? new Date(toTime(job.startTime) + MINUTE_MS)
            : null;

        const resolved = resolveInstantForDay(candidate, ranges, lowerBound, source === 'date');
        if (!resolved) return null;

        // Both ends can be free while the job still spans a booked window. The
        // calendar can't express that, so it's the one case that gets a dialog.
        const start = field === 'startTime' ? resolved : job.startTime;
        const end = field === 'endTime' ? resolved : job.endTime;
        const straddled = findContainedWindow(start, end, ranges);
        if (straddled) {
            setScheduleNotice({ placement: job.placement, conflict: straddled });
            return null;
        }

        return resolved;
    };

    const uploadAsset = async (file) => {
        if (!file) return null;
        try {
            const result = await apiFetch(`${env.backendApi}/api/uploadAsset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.token && { Authorization: `Bearer ${user.token}` }),
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                }),
            });

            if (!result.ok) throw new Error('Failed to get upload URL');
            const { uploadUrl, fileUrl } = await result.json();

            const uploadRes = await apiFetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadRes.ok) throw new Error('S3 upload failed');
            return fileUrl;
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!formData.campaignName || !formData.advertiserName || !formData.url) {
            toast.error('Please fill in all campaign basic details');
            setActiveTab(0);
            return;
        }

        for (const job of formData.jobs) {
            if (!job.placement) {
                toast.error('Each job must have a placement');
                setActiveTab(1);
                return;
            }
            if (!job.startTime || !job.endTime) {
                toast.error(`Please set schedule for ${job.placement}`);
                setActiveTab(1);
                return;
            }

            if (hasInvalidLandingPageUrl(job)) {
                toast.error(`Landing Page URL for ${job.placement} must start with http:// or https://`);
                setActiveTab(1);
                return;
            }

            const hasDesktopImage = Boolean(job.creatives?.desktop?.[0]?.file || job.creatives?.desktop?.[0]?.fileUrl);
            const hasMobileImage = Boolean(job.creatives?.mobile?.[0]?.file || job.creatives?.mobile?.[0]?.fileUrl);

            if (job.adFormat === 'spotlight') {
                const uploadedSlides = (job.spotlightMobileImages || []).filter(Boolean);
                if (uploadedSlides.length < 2) {
                    toast.error(`Spotlight Ad requires at least 2 uploaded slides for ${job.placement}`);
                    setActiveTab(1);
                    return;
                }
            } else if (job.adFormat === 'popup') {
                const hasPopupDesktopImage = Boolean(job.popupDesktopImage);
                const hasPopupMobileImage = Boolean(job.popupMobileImage);
                if (!hasPopupDesktopImage && !hasPopupMobileImage) {
                    toast.error(`Please add at least one Popup image (Desktop or Mobile) for ${job.placement}`);
                    setActiveTab(1);
                    return;
                }
            } else if (!hasDesktopImage && !hasMobileImage) {
                toast.error(`Please add both Desktop and Mobile images for ${job.placement}`);
                setActiveTab(1);
                return;
            } else if (hasDesktopImage && !hasMobileImage) {
                toast.error(`Please add a Mobile image for ${job.placement}`);
                setActiveTab(1);
                return;
            } else if (!hasDesktopImage && hasMobileImage) {
                toast.error(`Please add a Desktop image for ${job.placement}`);
                setActiveTab(1);
                return;
            }
        }

        const scheduleConflict = findScheduleConflict();
        if (scheduleConflict) {
            toast.error(scheduleConflict);
            setActiveTab(1);
            return;
        }

        setIsSaving(true);
        const savingToast = toast.loading('Syncing assets and saving campaign...');

        try {
            const processedJobs = await Promise.all(formData.jobs.map(async (job) => {
                const updatedJob = { ...job };

                if (job.creatives?.desktop?.[0]?.file) {
                    const url = await uploadAsset(job.creatives.desktop[0].file);
                    updatedJob.creatives = {
                        ...updatedJob.creatives,
                        desktop: [{ ...(job.creatives.desktop[0] || {}), fileUrl: url }]
                    };
                }

                if (job.creatives?.mobile?.[0]?.file) {
                    const url = await uploadAsset(job.creatives.mobile[0].file);
                    updatedJob.creatives = {
                        ...updatedJob.creatives,
                        mobile: [{ ...(job.creatives.mobile[0] || {}), fileUrl: url }]
                    };
                }

                // Spotlight: ensure clean URL list and set mobile fallback from the chosen fallback slide
                if (job.adFormat === 'spotlight') {
                    const spotlightUrls = (job.spotlightMobileImages || []).filter(Boolean);
                    updatedJob.spotlightMobileImages = spotlightUrls;
                    const chosenUrl = (job.spotlightMobileImages || [])[job.spotlightFallbackIndex];
                    const fallbackUrl = chosenUrl || spotlightUrls[0];
                    if (fallbackUrl) {
                        updatedJob.creatives = {
                            ...updatedJob.creatives,
                            mobile: [{ fileUrl: fallbackUrl, name: 'spotlight-fallback', preview: fallbackUrl }]
                        };
                    }
                }

                return updatedJob;
            }));

            let finalStatus = (formData.status || 'Start now').toLowerCase().replace(' ', '_');
            if (finalStatus === 'paused' || finalStatus === 'pause') {
                finalStatus = 'start_now';
            }

            const payload = {
                campaignName: formData.campaignName,
                advertiserName: formData.advertiserName,
                landingPageURL: formData.url,
                url: formData.url,
                status: finalStatus,
                type: (() => {
                    // Priority: if any placement is 'sidebar', the whole campaign is 'sidebar'
                    const hasSidebar = formData.jobs.some(job => {
                        const dyn = findPlacement(job.placement, dynamicPlacements);
                        return dyn && (dyn.type === 'sidebar' || dyn.placement_type === 'sidebar');
                    });
                    if (hasSidebar) return 'sidebar';

                    // Fallback: Use the type of the first job's placement
                    if (formData.jobs.length > 0) {
                        const firstJob = formData.jobs[0];
                        const dyn = findPlacement(firstJob.placement, dynamicPlacements);
                        const typeVal = dyn?.type || dyn?.placement_type;
                        if (typeVal) return typeVal.toLowerCase();
                    }

                    return 'standard';
                })(),
                frequencyCap: {
                    enabled: formData.frequencyCapEnabled,
                    maxImpressions: formData.frequencyCapMax,
                    per: formData.frequencyCapPeriod.toLowerCase()
                },
                jobs: processedJobs.map(j => ({
                    jobId: j.id,
                    adFormat: j.adFormat || 'conventional',
                    ad_format: j.adFormat || 'conventional',
                    spotlightMobileImages: j.adFormat === 'spotlight' ? (j.spotlightMobileImages || []).filter(Boolean) : [],
                    spotlight_mobile_images: j.adFormat === 'spotlight' ? (j.spotlightMobileImages || []).filter(Boolean) : [],
                    spotlightFallbackIndex: j.adFormat === 'spotlight' ? (j.spotlightFallbackIndex ?? 0) : null,
                    spotlight_fallback_index: j.adFormat === 'spotlight' ? (j.spotlightFallbackIndex ?? 0) : null,
                    // Popup Ad fields — only meaningful when adFormat === 'popup', stored
                    // unconditionally like the spotlight fields above.
                    popupTrigger: j.popupTrigger || 'immediate',
                    popup_trigger: j.popupTrigger || 'immediate',
                    popupTriggerVal: Number(j.popupTriggerVal) || 0,
                    popup_trigger_val: Number(j.popupTriggerVal) || 0,
                    popupCapDays: j.popupCapDays !== undefined ? Number(j.popupCapDays) : 7,
                    popup_cap_days: j.popupCapDays !== undefined ? Number(j.popupCapDays) : 7,
                    popupHideOnConvert: j.popupHideOnConvert !== false,
                    popup_hide_on_convert: j.popupHideOnConvert !== false,
                    popupDesktopImage: j.adFormat === 'popup' ? (j.popupDesktopImage || '') : '',
                    popup_desktop_image: j.adFormat === 'popup' ? (j.popupDesktopImage || '') : '',
                    popupMobileImage: j.adFormat === 'popup' ? (j.popupMobileImage || '') : '',
                    popup_mobile_image: j.adFormat === 'popup' ? (j.popupMobileImage || '') : '',
                    popupCtaText: j.adFormat === 'popup' ? (j.popupCtaText || '') : '',
                    popup_cta_text: j.adFormat === 'popup' ? (j.popupCtaText || '') : '',
                    placement: resolvePlacementName(j.placement, dynamicPlacements),
                    dimension: (() => {
                        const dyn = findPlacement(j.placement, dynamicPlacements);
                        return dyn ? {
                            desktop: dyn.desktopDimensions || "728x90",
                            mobile: dyn.mobileDimensions || "320x50"
                        } : null;
                    })(),
                    startTime: j.startTime instanceof Date ? j.startTime.toISOString() : (j.startTime || null),
                    endTime: j.endTime instanceof Date ? j.endTime.toISOString() : (j.endTime || null),
                    // Per-job click-through URL; blank means "use the campaign URL".
                    landingPageURL: j.landingPageURL || '',
                    landing_page_url: j.landingPageURL || '',
                    thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                    third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                    tagDesktop: j.thirdPartyTagDesktop || '',
                    thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                    third_party_tag_mobile: j.thirdPartyTagMobile || '',
                    third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                    tagMobile: j.thirdPartyTagMobile || '',
                    mobile_tag: j.thirdPartyTagMobile || '',
                    afterParagraph: needsInStoryPosition(j, dynamicPlacements) ? (Number(j.afterParagraph) || 3) : null,
                    after_paragraph: needsInStoryPosition(j, dynamicPlacements) ? (Number(j.afterParagraph) || 3) : null,
                    repeatAd: needsInStoryPosition(j, dynamicPlacements) ? resolveRepeatAd(j) : null,
                    repeat_ad: needsInStoryPosition(j, dynamicPlacements) ? resolveRepeatAd(j) : null,
                    creatives: {
                        desktop: j.creatives.desktop?.[0]?.fileUrl || '',
                        mobile: j.creatives.mobile?.[0]?.fileUrl || '',
                        spotlightMobileImages: j.adFormat === 'spotlight' ? (j.spotlightMobileImages || []).filter(Boolean) : [],
                        thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                        third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                        tagDesktop: j.thirdPartyTagDesktop || '',
                        thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                        tagMobile: j.thirdPartyTagMobile || '',
                        mobile_tag: j.thirdPartyTagMobile || ''
                    }
                }))
            };

            if (payload.jobs.length > 0) {
                const firstJob = payload.jobs[0];
                // Campaign-level startTime/endTime must span ALL jobs (not just
                // jobs[0]), otherwise this window is used as a shared gate that
                // opens/closes every placement together regardless of each job's
                // own schedule — e.g. adding an earlier-starting job would make an
                // unrelated later job appear to be running early.
                const jobStarts = payload.jobs.map(j => j.startTime).filter(Boolean);
                const jobEnds = payload.jobs.map(j => j.endTime).filter(Boolean);
                payload.startTime = jobStarts.length
                    ? jobStarts.reduce((min, t) => (new Date(t) < new Date(min) ? t : min))
                    : null;
                payload.endTime = jobEnds.length
                    ? jobEnds.reduce((max, t) => (new Date(t) > new Date(max) ? t : max))
                    : null;
                payload.thirdPartyTag = (firstJob.thirdPartyTagDesktop || firstJob.third_party_tag_desktop || '');
                payload.third_party_tag = (firstJob.thirdPartyTagDesktop || firstJob.third_party_tag_desktop || '');
                payload.thirdPartyTagMobile = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.third_party_tag_mobile = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.third_party_tag_mobile_tag = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.tagMobile = (firstJob.thirdPartyTagMobile || '');
                payload.placements = payload.jobs.map(j => j.placement);
                payload.creatives = {};
                payload.jobs.forEach(j => {
                    const normKey = j.placement.toLowerCase().replace(/\s+/g, '-');
                    payload.creatives[normKey] = {
                        desktop: j.creatives.desktop?.[0]?.fileUrl || j.creatives.desktop || '',
                        mobile: j.creatives.mobile?.[0]?.fileUrl || j.creatives.mobile || '',
                        thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                        third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                        thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                        tagMobile: j.thirdPartyTagMobile || ''
                    };
                });
            }

            const endpoint = editData ? 'updateCampaign' : 'createCampaign';
            const finalPayload = editData ? { ...payload, campaignId: editData.campaignId } : payload;

            const res = await apiFetch(`${env.backendApi}/${endpoint}`, {
                method: editData ? 'PUT' : 'POST',
                headers: authHeaders,
                body: JSON.stringify(finalPayload),
            });

            const resJson = await res.json();

            if (!res.ok) {
                throw new Error(resJson.message || 'Failed to save campaign');
            }

            toast.success(`Campaign ${editData ? 'updated' : 'created'} successfully`, { id: savingToast });

            try {
                const campaignId = editData?.campaignId || resJson?.campaignId || resJson?.campaign?.campaignId;
                if (campaignId) {
                    await apiFetch(`${env.backendApi}/publishCampaign`, {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ campaignId }),
                    });
                } else {
                    console.warn('No campaignId found in response, skipping publishCampaign');
                }
            } catch (e) {
                console.error('Auto-publish failed:', e);
            }

            try {
                await republishAllCampaignPages(user?.token);
            } catch (e) {
                console.error('HTML republish failed after Save & Publish:', e);
            }

            if (onSave) onSave();
            else router.push('/campaign-hub');

        } catch (error) {
            console.error("Save error:", error);
            toast.error(error.message || "Failed to save campaign", { id: savingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        const badUrlJob = formData.jobs.find(hasInvalidLandingPageUrl);
        if (badUrlJob) {
            toast.error(`Landing Page URL for ${badUrlJob.placement || 'this job'} must start with http:// or https://`);
            setActiveTab(1);
            return;
        }

        // Drafts block other campaigns too, so they get the same conflict check.
        const scheduleConflict = findScheduleConflict();
        if (scheduleConflict) {
            toast.error(scheduleConflict);
            setActiveTab(1);
            return;
        }

        setIsDraftSaving(true);
        const savingToast = toast.loading('Saving draft...');

        try {
            const processedJobs = await Promise.all(formData.jobs.map(async (job) => {
                const updatedJob = { ...job };

                if (job.creatives?.desktop?.[0]?.file) {
                    const url = await uploadAsset(job.creatives.desktop[0].file);
                    updatedJob.creatives = {
                        ...updatedJob.creatives,
                        desktop: [{ ...(job.creatives.desktop[0] || {}), fileUrl: url }]
                    };
                }

                if (job.creatives?.mobile?.[0]?.file) {
                    const url = await uploadAsset(job.creatives.mobile[0].file);
                    updatedJob.creatives = {
                        ...updatedJob.creatives,
                        mobile: [{ ...(job.creatives.mobile[0] || {}), fileUrl: url }]
                    };
                }

                return updatedJob;
            }));

            const payload = {
                campaignName: formData.campaignName || 'Untitled Draft',
                advertiserName: formData.advertiserName || '',
                landingPageURL: formData.url || '',
                url: formData.url || '',
                status: 'draft',
                type: formData.jobs.some(job => {
                    const dyn = findPlacement(job.placement, dynamicPlacements);
                    return dyn && (dyn.type === 'sidebar' || dyn.placement_type === 'sidebar');
                }) ? 'sidebar' : 'standard',
                frequencyCap: {
                    enabled: formData.frequencyCapEnabled,
                    maxImpressions: formData.frequencyCapMax,
                    per: formData.frequencyCapPeriod.toLowerCase()
                },
                jobs: processedJobs.map(j => ({
                    jobId: j.id,
                    adFormat: j.adFormat || 'conventional',
                    ad_format: j.adFormat || 'conventional',
                    spotlightMobileImages: j.adFormat === 'spotlight' ? (j.spotlightMobileImages || []).filter(Boolean) : [],
                    spotlight_mobile_images: j.adFormat === 'spotlight' ? (j.spotlightMobileImages || []).filter(Boolean) : [],
                    spotlightFallbackIndex: j.adFormat === 'spotlight' ? (j.spotlightFallbackIndex ?? 0) : null,
                    spotlight_fallback_index: j.adFormat === 'spotlight' ? (j.spotlightFallbackIndex ?? 0) : null,
                    popupTrigger: j.popupTrigger || 'immediate',
                    popup_trigger: j.popupTrigger || 'immediate',
                    popupTriggerVal: Number(j.popupTriggerVal) || 0,
                    popup_trigger_val: Number(j.popupTriggerVal) || 0,
                    popupCapDays: j.popupCapDays !== undefined ? Number(j.popupCapDays) : 7,
                    popup_cap_days: j.popupCapDays !== undefined ? Number(j.popupCapDays) : 7,
                    popupHideOnConvert: j.popupHideOnConvert !== false,
                    popup_hide_on_convert: j.popupHideOnConvert !== false,
                    popupDesktopImage: j.adFormat === 'popup' ? (j.popupDesktopImage || '') : '',
                    popup_desktop_image: j.adFormat === 'popup' ? (j.popupDesktopImage || '') : '',
                    popupMobileImage: j.adFormat === 'popup' ? (j.popupMobileImage || '') : '',
                    popup_mobile_image: j.adFormat === 'popup' ? (j.popupMobileImage || '') : '',
                    popupCtaText: j.adFormat === 'popup' ? (j.popupCtaText || '') : '',
                    popup_cta_text: j.adFormat === 'popup' ? (j.popupCtaText || '') : '',
                    placement: resolvePlacementName(j.placement, dynamicPlacements),
                    dimension: (() => {
                        const dyn = findPlacement(j.placement, dynamicPlacements);
                        return dyn ? {
                            desktop: dyn.desktopDimensions || "728x90",
                            mobile: dyn.mobileDimensions || "320x50"
                        } : null;
                    })(),
                    startTime: j.startTime instanceof Date ? j.startTime.toISOString() : (j.startTime || null),
                    endTime: j.endTime instanceof Date ? j.endTime.toISOString() : (j.endTime || null),
                    // Per-job click-through URL; blank means "use the campaign URL".
                    landingPageURL: j.landingPageURL || '',
                    landing_page_url: j.landingPageURL || '',
                    thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                    third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                    tagDesktop: j.thirdPartyTagDesktop || '',
                    thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                    third_party_tag_mobile: j.thirdPartyTagMobile || '',
                    third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                    tagMobile: j.thirdPartyTagMobile || '',
                    mobile_tag: j.thirdPartyTagMobile || '',
                    afterParagraph: needsInStoryPosition(j, dynamicPlacements) ? (Number(j.afterParagraph) || 3) : null,
                    after_paragraph: needsInStoryPosition(j, dynamicPlacements) ? (Number(j.afterParagraph) || 3) : null,
                    repeatAd: needsInStoryPosition(j, dynamicPlacements) ? resolveRepeatAd(j) : null,
                    repeat_ad: needsInStoryPosition(j, dynamicPlacements) ? resolveRepeatAd(j) : null,
                    creatives: {
                        desktop: j.creatives.desktop?.[0]?.fileUrl || '',
                        mobile: j.creatives.mobile?.[0]?.fileUrl || '',
                        thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                        third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                        tagDesktop: j.thirdPartyTagDesktop || '',
                        thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                        tagMobile: j.thirdPartyTagMobile || '',
                        mobile_tag: j.thirdPartyTagMobile || ''
                    }
                }))
            };

            if (payload.jobs.length > 0) {
                const firstJob = payload.jobs[0];
                // Campaign-level startTime/endTime must span ALL jobs (not just
                // jobs[0]), otherwise this window is used as a shared gate that
                // opens/closes every placement together regardless of each job's
                // own schedule — e.g. adding an earlier-starting job would make an
                // unrelated later job appear to be running early.
                const jobStarts = payload.jobs.map(j => j.startTime).filter(Boolean);
                const jobEnds = payload.jobs.map(j => j.endTime).filter(Boolean);
                payload.startTime = jobStarts.length
                    ? jobStarts.reduce((min, t) => (new Date(t) < new Date(min) ? t : min))
                    : null;
                payload.endTime = jobEnds.length
                    ? jobEnds.reduce((max, t) => (new Date(t) > new Date(max) ? t : max))
                    : null;
                payload.thirdPartyTag = (firstJob.thirdPartyTagDesktop || firstJob.third_party_tag_desktop || '');
                payload.third_party_tag = (firstJob.thirdPartyTagDesktop || firstJob.third_party_tag_desktop || '');
                payload.thirdPartyTagMobile = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.third_party_tag_mobile = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.third_party_tag_mobile_tag = (firstJob.thirdPartyTagMobile || firstJob.third_party_tag_mobile || '');
                payload.tagMobile = (firstJob.thirdPartyTagMobile || '');
                payload.placements = payload.jobs.map(j => j.placement);
                payload.creatives = {};
                payload.jobs.forEach(j => {
                    const normKey = j.placement.toLowerCase().replace(/\s+/g, '-');
                    payload.creatives[normKey] = {
                        desktop: j.creatives.desktop?.[0]?.fileUrl || j.creatives.desktop || '',
                        mobile: j.creatives.mobile?.[0]?.fileUrl || j.creatives.mobile || '',
                        thirdPartyTagDesktop: j.thirdPartyTagDesktop || '',
                        third_party_tag_desktop: j.thirdPartyTagDesktop || '',
                        thirdPartyTagMobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile: j.thirdPartyTagMobile || '',
                        third_party_tag_mobile_tag: j.thirdPartyTagMobile || '',
                        tagMobile: j.thirdPartyTagMobile || ''
                    };
                });
            }

            const endpoint = editData ? 'updateCampaign' : 'createCampaign';
            const finalPayload = editData ? { ...payload, campaignId: editData.campaignId } : payload;

            const res = await apiFetch(`${env.backendApi}/${endpoint}`, {
                method: editData ? 'PUT' : 'POST',
                headers: authHeaders,
                body: JSON.stringify(finalPayload),
            });

            const resJson = await res.json();

            if (!res.ok) {
                throw new Error(resJson.message || 'Failed to save draft');
            }

            toast.success(`Draft saved successfully`, { id: savingToast });

            if (onSave) onSave();
            else router.push('/campaign-hub');

        } catch (error) {
            console.error("Draft save error:", error);
            toast.error(error.message || "Failed to save draft", { id: savingToast });
        } finally {
            setIsDraftSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FCFCFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-5">
                    <BackToDashboardButton onClick={onBack} label="Back to Campaigns" shortLabel="Campaigns" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{editData ? 'Edit Campaign' : 'Create New Campaign'}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <CustomButton onClick={handleSaveDraft} variant="white" disabled={isSaving || isDraftSaving}>
                        <div className="flex items-center gap-2">
                            {isDraftSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span className="uppercase tracking-[0.1em] text-[11px] font-bold">
                                {isDraftSaving ? 'Saving...' : 'Save Draft'}
                            </span>
                        </div>
                    </CustomButton>
                    <CustomButton onClick={handleSave} variant="black" disabled={isSaving || isDraftSaving}>
                        <div className="flex items-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span className="uppercase tracking-[0.1em] text-[11px] font-bold">
                                {isSaving ? 'Publishing...' : 'Save & Publish'}
                            </span>
                        </div>
                    </CustomButton>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto py-8 px-6">
                <div className="flex border-b border-gray-200 mb-8 gap-8">
                    <button
                        onClick={() => setActiveTab(0)}
                        className={`px-2 py-3 text-sm transition-all focus:outline-none ${activeTab === 0 ? "border-b-2 border-black font-[800] text-black" : "text-gray-400 font-[400] hover:text-black"}`}
                    >
                        Basic Info
                    </button>
                    <button
                        onClick={() => setActiveTab(1)}
                        className={`px-2 py-3 text-sm transition-all focus:outline-none ${activeTab === 1 ? "border-b-2 border-black font-[800] text-black" : "text-gray-400 font-[400] hover:text-black"}`}
                    >
                        Jobs ({formData.jobs.length})
                    </button>
                </div>

                <div className="min-h-[600px]">
                    {activeTab === 0 ? (
                        <div className="bg-white border border-black">
                            <BasicInfoForm formData={formData} onFieldChange={handleFormChange} />
                        </div>
                    ) : (
                        <div className="mt-8 space-y-6 pb-20">
                            <div className="flex items-center justify-between mb-4 px-2">
                                {!formData.jobs.some(job => job.adFormat === 'spotlight') && (
                                    <p className="text-sm text-gray-500 italic">* Each job defines a placement, schedule, and assets.</p>
                                )}
                                <CustomButton onClick={addJob} variant="white">
                                    <span>Add Placement Job</span>
                                </CustomButton>
                            </div>

                            {formData.jobs.map((job, idx) => {
                                // Compute the smart start time = the earliest allowed start for this job's placement.
                                // This is used as both the calendar hint header AND the `min` date constraint.
                                const otherJobs = formData.jobs.filter(j => j.id !== job.id);
                                const suggestedStart = getSmartStartTime(otherJobs, job.placement, allCampaigns, editData);
                                // Prefer the per-job stored minStartTime (set on placement change) over the live calc
                                // so the boundary doesn't shift when the user edits other jobs.
                                const minStartTime = job.minStartTime || suggestedStart;

                                return (
                                    <JobCard
                                        key={`${job.id}-${job.placement}`}
                                        job={job}
                                        index={idx}
                                        onUpdate={updateJob}
                                        onPlacementChange={handleJobPlacementChange}
                                        onDelete={() => deleteJob(job.id)}
                                        onPreview={() => setPreviewJob(job)}
                                        disabledDates={disabledDates}
                                        resolveSchedule={resolveJobDateTime}
                                        campaignName={formData.campaignName}
                                        suggestedStartTime={minStartTime}
                                        minStartTime={minStartTime}
                                        dynamicPlacements={dynamicPlacements}
                                        taxonomies={taxonomies}
                                    />
                                );
                            })}

                            {formData.jobs.length === 0 && (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-20 flex flex-col items-center justify-center text-center">
                                    <p className="text-gray-400 font-medium mb-4">No placement jobs defined yet.</p>
                                    <button onClick={addJob} className="text-black font-bold border-b-2 border-black pb-1">Create your first job</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <PreviewModal
                isOpen={!!previewJob}
                onClose={() => setPreviewJob(null)}
                job={previewJob}
                campaignName={formData.campaignName}
                landingPageURL={formData.url}
                dynamicPlacements={dynamicPlacements}
            />

            <ScheduleConflictModal notice={scheduleNotice} onClose={() => setScheduleNotice(null)} />

            <style>{`
                /* Add any campaign-specific global overrides here if needed */
            `}</style>
        </div>
    );
}
