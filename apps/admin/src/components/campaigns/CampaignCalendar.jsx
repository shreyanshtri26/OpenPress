import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CAMPAIGN_STATUS_LOOKUP } from './constants';

const STATUS_COLORS = [
    { bg: 'bg-blue-500',   text: 'text-white' },
    { bg: 'bg-purple-500', text: 'text-white' },
    { bg: 'bg-emerald-500',text: 'text-white' },
    { bg: 'bg-rose-500',   text: 'text-white' },
    { bg: 'bg-amber-500',  text: 'text-white' },
    { bg: 'bg-cyan-500',   text: 'text-white' },
    { bg: 'bg-indigo-500', text: 'text-white' },
    { bg: 'bg-pink-500',   text: 'text-white' },
    { bg: 'bg-teal-500',   text: 'text-white' },
    { bg: 'bg-orange-500', text: 'text-white' },
];

// Our view names -> FullCalendar views (the board's own toolbar drives view and date).
const FC_VIEWS = { day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth' };

const PLACEMENT_PALETTE = ['#7dd3fc', '#86efac', '#fdba74', '#d8b4fe', '#fde047', '#f9a8d4', '#a5b4fc', '#5eead4'];

const STATUS_ORDER = ['start_now', 'paused', 'expired', 'draft', 'rejected', 'ready_to_publish'];
const STATUS_RESOURCE_COLORS = {
    start_now: '#22c55e',
    paused: '#f97316',
    expired: '#ef4444',
    draft: '#9ca3af',
    rejected: '#000000',
    ready_to_publish: '#eab308',
};
const STATUS_RESOURCE_SWATCH_CLASSES = {
    start_now: 'bg-[#22c55e]',
    paused: 'bg-[#f97316]',
    expired: 'bg-[#ef4444]',
    draft: 'bg-[#9ca3af]',
    rejected: 'bg-black',
    ready_to_publish: 'bg-[#eab308]',
};
const STATUS_RESOURCE_DATA = STATUS_ORDER.map((key) => ({
    id: key,
    text: CAMPAIGN_STATUS_LOOKUP[key]?.label || key,
    color: STATUS_RESOURCE_COLORS[key],
    swatchClass: STATUS_RESOURCE_SWATCH_CLASSES[key],
}));
const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All Statuses' },
    ...STATUS_ORDER.map((key) => ({ value: key, label: CAMPAIGN_STATUS_LOOKUP[key]?.label || key })),
];

// Rendered by CampaignsManager next to the Calendar/Table tab switcher (calendar tab only).
export function CampaignStatusLegend() {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5">
            {STATUS_RESOURCE_DATA.map((status) => (
                <div key={status.id} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-gray-600">
                    <span className={`h-2.5 w-2.5 rounded-sm ${status.swatchClass}`} />
                    <span>{status.text}</span>
                </div>
            ))}
        </div>
    );
}

function getStartOfToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

function stripTime(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
}

function formatPlacementName(name) {
    if (!name) return 'Placement';
    const normalized = String(name).trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (normalized === 'instory' || normalized === 'instory-ad' || normalized === 'in-story-ad') {
        return 'In story';
    }

    return String(name)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// Mirrors CampaignsManager's getEffectiveStatus so calendar status matches the table view.
function getEffectiveStatus(cp) {
    const now = new Date();
    const endDate = cp?.endDate ? new Date(cp.endDate) : null;
    if (endDate && now > endDate) return 'expired';

    const status = (cp?.status || '').toLowerCase();
    if (status === 'start now' || status === 'start_now' || status === 'active') return 'start_now';
    if (status === 'pause' || status === 'paused') return 'paused';
    if (status === 'draft') return 'draft';
    if (status === 'start later' || status === 'start_later' || status === 'scheduled' || status === 'schedule') return 'start_later';
    if (status === 'rejected') return 'rejected';
    if (status === 'ready to publish' || status === 'ready_to_publish') return 'ready_to_publish';

    return status || 'draft';
}

const fmtDay = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

// Keeps the same array/object reference across renders when its serialized content hasn't
// actually changed, so the calendar doesn't redraw/flicker on redundant polling.
function useStableValue(value, getKey) {
    const key = getKey(value);
    const ref = useRef({ key, value });
    if (ref.current.key !== key) {
        ref.current = { key, value };
    }
    return ref.current.value;
}

const schedulerBoardClass = 'campaign-calendar-scheduler flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white';

// FullCalendar theming: hairlines, soft header, status-tinted events with a solid left edge.
const CALENDAR_CSS = `
.campaign-calendar-scheduler .fc {
  --fc-border-color: #e5e5ea; --fc-page-bg-color: #fff; --fc-neutral-bg-color: #f5f5f7;
  --fc-today-bg-color: rgba(0, 113, 227, 0.06); --fc-now-indicator-color: #ff3b30;
  --fc-event-border-color: transparent; font-size: 13px; color: #1d1d1f;
}
.campaign-calendar-scheduler .fc-theme-standard td, .campaign-calendar-scheduler .fc-theme-standard th, .campaign-calendar-scheduler .fc-theme-standard .fc-scrollgrid { border-color: #e5e5ea; }
.campaign-calendar-scheduler .fc-scrollgrid { border: 0; }
.campaign-calendar-scheduler .fc-col-header-cell { background: #fafafa; padding: 8px 0; }
.campaign-calendar-scheduler .fc-col-header-cell-cushion { color: #6e6e73; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none; }
.campaign-calendar-scheduler .fc-daygrid-day-number { padding: 6px 8px; font-size: 12px; font-weight: 500; color: #3a3a3c; text-decoration: none; }
.campaign-calendar-scheduler .fc-day-today .fc-daygrid-day-number { margin: 4px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #1d1d1f; color: #fff; }
.campaign-calendar-scheduler .fc-day-other .fc-daygrid-day-number { color: #c7c7cc; }
.campaign-calendar-scheduler .fc-timegrid-slot { height: 32px; }
.campaign-calendar-scheduler .fc-timegrid-slot-label-cushion { font-size: 10px; font-weight: 500; color: #8e8e93; }
.campaign-calendar-scheduler .fc-timegrid-slot-minor { border-top-style: dashed; }
.campaign-calendar-scheduler .fc-event { margin: 1px 2px; border: 0; border-left: 3px solid var(--fc-event-border-color, transparent); border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); cursor: pointer; transition: box-shadow 0.15s ease; }
.campaign-calendar-scheduler .fc-event:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.14); z-index: 5; }
.campaign-calendar-scheduler .fc-daygrid-event { min-height: 34px; }
.campaign-calendar-scheduler .fc-daygrid-more-link { margin: 2px 4px; font-size: 11px; font-weight: 600; color: #0071e3; }
.campaign-calendar-scheduler .fc-popover { border-radius: 12px; border: 1px solid #e5e5ea; box-shadow: 0 12px 32px rgba(0,0,0,0.14); overflow: hidden; }
.campaign-calendar-scheduler .fc-popover-header { background: #fafafa; font-size: 12px; font-weight: 600; }
.campaign-calendar-scheduler .fc-scroller { scrollbar-width: thin; }
`;

const controlButtonClass = 'flex h-8 cursor-pointer items-center rounded-full border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50';
const navButtonClass = 'flex cursor-pointer items-center rounded-full border-0 bg-transparent p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900';
const searchInputClass = 'h-8 w-[180px] rounded-full border border-gray-200 bg-white py-0 pl-8 pr-3 text-[13px] text-gray-900 transition placeholder:text-gray-400 focus:border-[#0071e3] focus:outline-none focus:ring-2 focus:ring-gray-200 max-[1400px]:w-[150px] max-[1200px]:w-[130px] max-[1200px]:text-xs';
const filterSelectClass = 'h-8 max-w-[170px] cursor-pointer rounded-full border border-gray-200 bg-white px-2.5 text-[13px] font-medium text-gray-900 focus:border-[#0071e3] focus:outline-none max-[1400px]:max-w-[140px] max-[1200px]:max-w-[110px] max-[1200px]:text-xs';

// Custom appointment card — mirrors Monier's scheduler appointment render.
const renderAppointment = (model) => {
    const appt = model?.appointmentData || model?.data || model || {};
    const title = appt.text || '';
    const start = appt.startDate ? new Date(appt.startDate) : null;
    const end = appt.endDate ? new Date(appt.endDate) : null;
    const timeStr = start && end ? `${fmtTime(start)} – ${fmtTime(end)}` : '';
    const placement = appt.placement || '';
    const isRejected = false; // tinted cards keep dark text for every status

    return (
        <div className="campaign-appt-inner flex h-full flex-col justify-between gap-px overflow-hidden px-1.5 py-0.5">
            <div className={`campaign-appt-title line-clamp-2 shrink text-[13px] font-bold leading-[1.2] ${isRejected ? 'text-white' : 'text-black'} [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]`}>{title}</div>
            <div className="campaign-appt-footer mt-auto flex w-full items-center justify-between gap-1">
                {timeStr && <div className={`campaign-appt-time shrink overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-normal leading-[1.1] ${isRejected ? 'text-white/70' : 'text-black/70'}`}>{timeStr}</div>}
                {placement && <span className={`campaign-appt-placement shrink-0 whitespace-nowrap text-[11px] font-semibold ${isRejected ? 'text-white/60' : 'text-black/60'}`}>{placement}</span>}
            </div>
        </div>
    );
};

const HOVER_W = 300;

// Detail card shown while the pointer is over a calendar appointment (position: fixed so the board's overflow can't clip it).
function CampaignHoverCard({ hover }) {
    if (!hover) return null;
    const { appt, rect } = hover;
    const cp = appt.campaign || {};
    const job = (cp.jobs || []).find((j) => formatPlacementName(j?.placement) === appt.placement) || {};
    const status = CAMPAIGN_STATUS_LOOKUP[appt.statusValue];
    const color = STATUS_RESOURCE_COLORS[appt.statusValue] || '#9ca3af';
    const format = (job.adFormat || job.ad_format || '').toString();
    const left = Math.max(8, Math.min(window.innerWidth - HOVER_W - 8, rect.left + (rect.right - rect.left) / 2 - HOVER_W / 2));
    const below = window.innerHeight - rect.bottom > 230;
    const style = below ? { top: rect.bottom + 8, left } : { bottom: window.innerHeight - rect.top + 8, left };
    const sameDay = fmtDay(appt.startDate) === fmtDay(appt.endDate);

    return (
        <div role="tooltip" style={{ ...style, width: HOVER_W }} className="pointer-events-none fixed z-[1000] rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{appt.text}</p>
                    {cp.advertiser && <p className="mt-0.5 truncate text-xs text-gray-500">{cp.advertiser}</p>}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-800" style={{ background: `color-mix(in srgb, ${color} 18%, #fff)` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    {status?.label || appt.statusValue}
                </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Placement</dt><dd className="font-medium text-gray-900">{appt.placement}</dd></div>
                {format && <div className="flex justify-between gap-3"><dt className="text-gray-500">Format</dt><dd className="font-medium capitalize text-gray-900">{format}</dd></div>}
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Runs</dt><dd className="text-right font-medium text-gray-900">{sameDay ? fmtDay(appt.startDate) : `${fmtDay(appt.startDate)} – ${fmtDay(appt.endDate)}`}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Time</dt><dd className="font-medium text-gray-900">{fmtTime(appt.startDate)} – {fmtTime(appt.endDate)}</dd></div>
                {cp.priority && <div className="flex justify-between gap-3"><dt className="text-gray-500">Priority</dt><dd className="font-medium capitalize text-gray-900">{String(cp.priority).replace(/_/g, ' ')}</dd></div>}
            </dl>
            <p className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-400">Click to open campaign</p>
        </div>
    );
}

export default function CampaignCalendar({ campaigns = [], placementNames = [], onCampaignClick, loading = false, onCreateCampaign, onRefresh }) {
    const [currentDate, setCurrentDate] = useState(getStartOfToday);
    const [currentView, setCurrentView] = useState('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [placementSearchQuery, setPlacementSearchQuery] = useState('');

    const nonExpiredCampaigns = useMemo(() => {
        const todayDate = stripTime(new Date());
        const INACTIVE_STATUSES = new Set(['pause', 'paused', 'draft', 'stopped', 'ended', 'cancelled', 'canceled', 'expired']);
        return campaigns.filter((cp) => {
            const status = (cp?.status || '').toLowerCase().replace(/[\s_-]+/g, '');
            if (INACTIVE_STATUSES.has(status)) return false;
            if (!cp?.endDate) return true;
            const end = stripTime(new Date(cp.endDate));
            return end >= todayDate;
        });
    }, [campaigns]);

    const allPlacementNamesRaw = useMemo(() => {
        const fromSettings = (placementNames || []).map((name) => formatPlacementName(name)).filter(Boolean);
        const fromCampaigns = (campaigns || [])
            .flatMap((cp) => cp.jobs || [])
            .map((job) => formatPlacementName(job?.placement))
            .filter(Boolean);

        return Array.from(new Set([...fromSettings, ...fromCampaigns]));
    }, [placementNames, campaigns]);
    const allPlacementNames = useStableValue(allPlacementNamesRaw, (arr) => arr.join('|'));

    const [selectedPlacements, setSelectedPlacements] = useState(() => new Set(allPlacementNamesRaw));
    const [hasLoadedOnce, setHasLoadedOnce] = useState(() => campaigns.length > 0 || !loading);

    // Only show the loader for the initial load if no campaign data exists yet.
    useEffect(() => {
        if (!loading || campaigns.length > 0) setHasLoadedOnce(true);
    }, [loading, campaigns.length]);
    const showInitialLoader = loading && !hasLoadedOnce && campaigns.length === 0;

    // Kept separate from `loading` so background polling (every 30s in CampaignsManager)
    // doesn't flicker the Refresh button — only an explicit click drives its spin/disabled state.
    const [isRefreshing, setIsRefreshing] = useState(false);
    const handleRefreshClick = useCallback(async () => {
        if (!onRefresh || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh, isRefreshing]);

    const localTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

    const activePlacementNames = useMemo(() => {
        return Array.from(
            new Set(
                (nonExpiredCampaigns || [])
                    .flatMap((cp) => cp.jobs || [])
                    .map((job) => formatPlacementName(job?.placement))
                    .filter(Boolean)
            )
        );
    }, [nonExpiredCampaigns]);

    const inactiveOrMissingPlacementNames = useMemo(() => {
        const activeSet = new Set(activePlacementNames);
        return allPlacementNames.filter((name) => !activeSet.has(name));
    }, [allPlacementNames, activePlacementNames]);

    // Map campaign id → color index (stable) — kept for the placement status summary below.
    const colorMap = useMemo(() => {
        const map = {};
        nonExpiredCampaigns.forEach((cp, i) => {
            map[cp.id] = i % STATUS_COLORS.length;
        });
        return map;
    }, [nonExpiredCampaigns]);

    const placementColors = useMemo(() => {
        const map = {};
        allPlacementNames.forEach((name, i) => {
            map[name] = PLACEMENT_PALETTE[i % PLACEMENT_PALETTE.length];
        });
        return map;
    }, [allPlacementNames]);

    useEffect(() => {
        if (allPlacementNames.length === 0) return;
        setSelectedPlacements((prev) => {
            if (prev.size === 0) return new Set(allPlacementNames);
            const valid = new Set([...prev].filter((p) => allPlacementNames.includes(p)));
            const next = valid.size === 0 ? new Set(allPlacementNames) : valid;
            // Avoid a no-op state update (new Set with identical contents) that would otherwise
            // re-render and re-flicker the calendar on every background campaigns poll.
            if (next.size === prev.size && [...next].every((p) => prev.has(p))) return prev;
            return next;
        });
    }, [allPlacementNames]);

    const togglePlacement = useCallback((name) => {
        setSelectedPlacements((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    }, []);

    const toggleAllPlacements = useCallback(() => {
        setSelectedPlacements((prev) => (prev.size === allPlacementNames.length ? new Set() : new Set(allPlacementNames)));
    }, [allPlacementNames]);

    const resourcesDataRaw = useMemo(
        () => allPlacementNames.map((name) => ({ id: name, text: name, color: placementColors[name] || '#000000' })),
        [allPlacementNames, placementColors]
    );
    const resourcesData = useStableValue(resourcesDataRaw, (arr) => arr.map((r) => `${r.id}:${r.color}`).join('|'));

    const filteredPlacementsForSidebar = useMemo(() => {
        if (!placementSearchQuery) return allPlacementNames;
        const q = placementSearchQuery.toLowerCase();
        return allPlacementNames.filter((name) => name.toLowerCase().includes(q));
    }, [allPlacementNames, placementSearchQuery]);

    // One calendar appointment per job (placement + time range) on a campaign.
    const calendarEventsRaw = useMemo(() => {
        const events = [];
        (campaigns || []).forEach((cp) => {
            const statusValue = getEffectiveStatus(cp);
            const jobs = (cp.jobs && cp.jobs.length > 0) ? cp.jobs : [{ placement: null, startTime: cp.startDate, endTime: cp.endDate }];

            jobs.forEach((job, idx) => {
                const startRaw = job?.startTime || cp.startDate;
                const endRaw = job?.endTime || cp.endDate;
                if (!startRaw || !endRaw) return;

                const startDate = new Date(startRaw);
                const endDate = new Date(endRaw);
                if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;

                events.push({
                    id: `${cp.id ?? 'cp'}__${idx}`,
                    text: cp.name || 'Untitled Campaign',
                    startDate,
                    endDate,
                    placement: formatPlacementName(job?.placement) || 'Unassigned',
                    statusValue,
                    campaign: cp,
                });
            });
        });
        return events;
    }, [campaigns]);
    const calendarEvents = useStableValue(
        calendarEventsRaw,
        (events) => events.map((ev) => `${ev.id}:${ev.startDate.getTime()}:${ev.endDate.getTime()}:${ev.placement}:${ev.statusValue}:${ev.text}`).join('|')
    );

    const bookingsPerPlacement = useMemo(() => {
        const counts = new Map();
        calendarEvents.forEach((ev) => counts.set(ev.placement, (counts.get(ev.placement) ?? 0) + 1));
        return counts;
    }, [calendarEvents]);

    const dataSource = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = calendarEvents.filter((ev) => selectedPlacements.has(ev.placement));
        if (statusFilter) list = list.filter((ev) => ev.statusValue === statusFilter);
        if (q) {
            list = list.filter((ev) =>
                ev.text?.toLowerCase().includes(q) ||
                ev.campaign?.advertiser?.toLowerCase().includes(q) ||
                ev.placement?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [calendarEvents, selectedPlacements, statusFilter, searchQuery]);

    // Hover card: which appointment and where it is, set by FullCalendar's eventMouseEnter/Leave.
    const [hover, setHover] = useState(null);
    const showHover = useCallback((info) => {
        const r = info.el.getBoundingClientRect();
        setHover({ appt: info.event.extendedProps.appt, rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right } });
    }, []);
    const hideHover = useCallback(() => setHover(null), []);

    const calendarRef = useRef(null);
    const calendarFcEvents = useMemo(() => dataSource.map((ev) => ({
        id: String(ev.id),
        title: ev.text,
        start: ev.startDate,
        end: ev.endDate,
        backgroundColor: `color-mix(in srgb, ${STATUS_RESOURCE_COLORS[ev.statusValue] || '#9ca3af'} 16%, #ffffff)`,
        borderColor: STATUS_RESOURCE_COLORS[ev.statusValue] || '#9ca3af',
        extendedProps: { appt: ev },
    })), [dataSource]);
    // Keep FullCalendar in step with the board's own view/date controls.
    useEffect(() => {
        const api = calendarRef.current?.getApi?.();
        if (api) api.changeView(FC_VIEWS[currentView] || 'dayGridMonth', currentDate);
    }, [currentView, currentDate]);

    const displayDate = useMemo(() => new Date(currentDate), [currentDate]);
    // Native date input: value is a local YYYY-MM-DD, never a UTC-shifted ISO string.
    const dateInputValue = useMemo(() => {
        const d = displayDate;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, [displayDate]);
    const handleDateChange = useCallback((e) => {
        const [y, m, d] = e.target.value.split('-').map(Number);
        if (y && m && d) setCurrentDate(new Date(y, m - 1, d));
    }, []);

    const navigateDate = useCallback((dir) => {
        setCurrentDate((prevDate) => {
            const d = new Date(prevDate);
            if (currentView === 'day') d.setDate(d.getDate() + dir);
            else if (currentView === 'week') d.setDate(d.getDate() + 7 * dir);
            else d.setMonth(d.getMonth() + dir);
            return d;
        });
    }, [currentView]);

    const handleAppointmentClick = useCallback((e) => {
        e.cancel = true;
        const cp = e.appointmentData?.campaign;
        if (cp) onCampaignClick?.(cp);
    }, [onCampaignClick]);

    const handleAppointmentDblClick = useCallback((e) => {
        e.cancel = true;
    }, []);

    const handleAppointmentAdding = useCallback((e) => {
        e.cancel = true;
    }, []);

    const handleAppointmentFormOpening = useCallback((e) => {
        // Empty-cell double-click routes to Create Campaign instead of the built-in add form.
        e.cancel = true;
        onCreateCampaign?.();
    }, [onCreateCampaign]);

    const appointmentCollectorRender = useCallback((data) => {
        return <div className="mt-0.5 inline-flex cursor-pointer items-center whitespace-nowrap px-2 py-[3px] text-[11px] font-bold text-white transition-opacity hover:opacity-85">{data.appointmentCount} more</div>;
    }, []);

    const showLiveCurrentTime = currentView !== 'month';

    return (
        <div className="flex flex-col gap-4 overflow-y-auto pb-8">
            <style>{CALENDAR_CSS}</style>
            <div className="h-[calc(100vh-300px)] min-h-[700px]">
                <div className={schedulerBoardClass}>
                    <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 max-[1200px]:gap-2 max-[1200px]:px-3 max-[1024px]:h-auto max-[1024px]:flex-wrap max-[1024px]:px-3 max-[1024px]:py-2">
                        <div className="flex flex-nowrap items-center gap-3 max-[1400px]:gap-2 max-[1024px]:flex-1 max-[1024px]:flex-wrap">
                            <div className="flex h-8 items-stretch rounded-full border border-gray-200 bg-white p-0.5">
                                {['day', 'week', 'month'].map((v) => (
                                    <button
                                        key={v}
                                        className={`flex cursor-pointer items-center whitespace-nowrap rounded-full border-0 px-3.5 text-[13px] font-semibold transition max-[1400px]:px-2.5 max-[1400px]:py-1.5 max-[1200px]:px-2 max-[1200px]:text-xs ${currentView === v ? 'bg-[#1d1d1f] text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                                        onClick={() => setCurrentView(v)}
                                    >
                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 max-[1400px]:gap-1.5">
                                <div className="relative flex items-center">
                                    <Search size={16} className="absolute left-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search campaigns..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={searchInputClass}
                                    />
                                </div>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
                                    {STATUS_FILTER_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex h-8 items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5">
                                <button className={navButtonClass} onClick={() => navigateDate(-1)}><ChevronLeft size={18} /></button>
                                <input
                                    type="date"
                                    aria-label="Go to date"
                                    value={dateInputValue}
                                    onChange={handleDateChange}
                                    className="!m-0 !h-7 !w-[132px] !cursor-pointer !rounded-full !border-0 !bg-transparent !px-2 !py-0 text-center text-[13px] font-semibold text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 focus:!outline-none focus:!ring-0"
                                />
                                <button className={navButtonClass} onClick={() => navigateDate(1)}><ChevronRight size={18} /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 max-[1024px]:ml-auto max-[1024px]:flex-wrap max-[1024px]:justify-end">
                            <button className={controlButtonClass} onClick={() => setCurrentDate(getStartOfToday())}>Today</button>
                            <button
                                type="button"
                                className={`${controlButtonClass} gap-1.5`}
                                onClick={handleRefreshClick}
                                disabled={isRefreshing}
                                title="Refresh campaigns"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Placement Sidebar */}
                        <div className="flex w-[220px] min-w-[220px] flex-col overflow-hidden border-r border-gray-200 bg-white max-[1200px]:w-[180px] max-[1200px]:min-w-[180px] max-[1024px]:w-40 max-[1024px]:min-w-40">
                            <div className="flex flex-col gap-2 border-b border-gray-200 px-4 pb-2.5 pt-3">
                                <div className="mb-1 flex w-full items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            className="m-0 h-3.5 w-3.5 shrink-0 cursor-pointer accent-black"
                                            checked={selectedPlacements.size === allPlacementNames.length && allPlacementNames.length > 0}
                                            onChange={toggleAllPlacements}
                                        />
                                        <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-gray-900">Placements</span>
                                    </div>
                                </div>
                                <div className="relative flex items-center">
                                    <Search size={14} className="absolute left-2 z-[1] text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search placements..."
                                        value={placementSearchQuery}
                                        onChange={(e) => setPlacementSearchQuery(e.target.value)}
                                        className="h-7 w-full rounded-xl border border-gray-300 bg-white py-0 pl-7 pr-2 text-xs text-gray-900 transition placeholder:text-xs placeholder:text-gray-400 focus:border-[#0071e3] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredPlacementsForSidebar.map((name) => {
                                    const isSelected = selectedPlacements.has(name);
                                    const count = bookingsPerPlacement.get(name) ?? 0;

                                    return (
                                        <label key={name} className={`flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 transition hover:bg-black/[0.04] ${isSelected ? 'bg-black/5 hover:bg-black/10' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => togglePlacement(name)}
                                                className="hidden"
                                            />
                                            <div className="flex min-w-0 flex-col">
                                                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-gray-900">{name}</span>
                                                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium text-gray-400">{count} campaign{count === 1 ? '' : 's'}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                                {filteredPlacementsForSidebar.length === 0 && (
                                    <div className="p-4 text-center text-xs text-gray-400">No placements found.</div>
                                )}
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="relative flex-1 overflow-hidden">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView={FC_VIEWS[currentView] || 'dayGridMonth'}
                                initialDate={currentDate}
                                headerToolbar={false}
                                height="100%"
                                timeZone="local"
                                events={calendarFcEvents}
                                nowIndicator={showLiveCurrentTime}
                                slotDuration="00:30:00"
                                slotMinTime="00:00:00"
                                slotMaxTime="24:00:00"
                                dayMaxEvents={currentView === 'month' ? 2 : false}
                                editable={false}
                                eventContent={(arg) => renderAppointment(arg.event.extendedProps.appt)}
                                eventClick={(info) => { info.jsEvent.preventDefault(); handleAppointmentClick({ appointmentData: info.event.extendedProps.appt }); }}
                                dateClick={(info) => { if (info.jsEvent.detail >= 2) handleAppointmentFormOpening({}); }}
                                eventMouseEnter={showHover}
                                eventMouseLeave={hideHover}
                                moreLinkContent={(arg) => appointmentCollectorRender({ appointmentCount: arg.num })}
                            />

                            <CampaignHoverCard hover={hover} />

                            {showInitialLoader && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Placement status summary */}
            {/*
            <div className="border border-gray-200 rounded-xl bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Placement Status</h3>
                    <span className="text-xs text-gray-500">Total: {allPlacementNames.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Running</p>
                            <span className="text-xs font-semibold text-gray-700">{activePlacementNames.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {activePlacementNames.length > 0 ? activePlacementNames.map((name) => (
                                <span key={`active-${name}`} className="text-[11px] font-medium text-white bg-[#1d1d1f] px-2.5 py-1 rounded-full">
                                    {name}
                                </span>
                            )) : (
                                <p className="text-xs text-gray-600">No active placement campaigns.</p>
                            )}
                        </div>
                    </div>

                    <div className="border border-gray-200 bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Not Running</p>
                            <span className="text-xs font-semibold text-gray-700">{inactiveOrMissingPlacementNames.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {inactiveOrMissingPlacementNames.length > 0 ? inactiveOrMissingPlacementNames.map((name) => (
                                <span key={`inactive-${name}`} className="text-[11px] font-medium text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                                    {name}
                                </span>
                            )) : (
                                <p className="text-xs text-gray-600">All known placements have active campaigns.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            */}
        </div>
    );
}
