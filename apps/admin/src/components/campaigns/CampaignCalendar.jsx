import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateBox } from '@/components/ui/dx/date-box';
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

// Devextreme scheduler views — mirrors the Monier scheduler board.
const views = [
    { type: 'day', name: 'Day', startDayHour: 0, endDayHour: 24, cellDuration: 30, maxAppointmentsPerCell: 'unlimited' },
    { type: 'week', name: 'Week', startDayHour: 0, endDayHour: 24, cellDuration: 30, maxAppointmentsPerCell: 'unlimited' },
    { type: 'month', name: 'Month', maxAppointmentsPerCell: 2 },
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
        <div className="flex items-center gap-2 rounded-none border border-gray-300 bg-white px-3 py-1.5">
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

const schedulerBoardClass = `
    campaign-calendar-scheduler flex h-full flex-col overflow-hidden rounded-none border border-black bg-white
    [&_*]:box-border
    [&_.dx-scheduler-header]:!hidden
    [&_.dx-scheduler-date-table-cell]:!border-b [&_.dx-scheduler-date-table-cell]:!border-r [&_.dx-scheduler-date-table-cell]:!border-gray-200
    [&_.dx-scheduler-work-space-month_.dx-scheduler-date-table-row]:!h-[150px]
    [&_.dx-scheduler-work-space-month_.dx-scheduler-date-table-cell]:!h-[150px]
    [&_.dx-scheduler-work-space-day_.dx-scheduler-cell-sizes-vertical]:!h-8
    [&_.dx-scheduler-work-space-week_.dx-scheduler-cell-sizes-vertical]:!h-8
    [&_.dx-scheduler-header-panel-cell]:!border-b [&_.dx-scheduler-header-panel-cell]:!border-r [&_.dx-scheduler-header-panel-cell]:!border-gray-200
    [&_.dx-scheduler-header-panel-cell]:!bg-gray-50 [&_.dx-scheduler-header-panel-cell]:!text-[13px] [&_.dx-scheduler-header-panel-cell]:!font-semibold [&_.dx-scheduler-header-panel-cell]:!text-gray-700
    [&_.dx-scheduler-header-panel-cell::after]:!border-gray-200 [&_.dx-scheduler-header-panel-cell::before]:!border-gray-200
    [&_.dx-scheduler-header-panel-cell.dx-state-active]:!bg-gray-50 [&_.dx-scheduler-header-panel-cell.dx-state-active]:!shadow-none [&_.dx-scheduler-header-panel-cell.dx-state-active]:!outline-none
    [&_.dx-scheduler-header-panel-cell.dx-state-focused]:!bg-gray-50 [&_.dx-scheduler-header-panel-cell.dx-state-focused]:!shadow-none [&_.dx-scheduler-header-panel-cell.dx-state-focused]:!outline-none
    [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel-cell]:!h-8
    [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel-cell]:!h-8
    [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel-cell]:!border-b [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel-cell]:!border-dashed [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel-cell]:!border-gray-300
    [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel-cell]:!border-b [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel-cell]:!border-dashed [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel-cell]:!border-gray-300
    [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel]:!w-12 [&_.dx-scheduler-work-space-week_.dx-scheduler-time-panel]:!min-w-12
    [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel]:!w-12 [&_.dx-scheduler-work-space-day_.dx-scheduler-time-panel]:!min-w-12
    [&_.dx-scheduler-time-panel-cell]:!whitespace-nowrap [&_.dx-scheduler-time-panel-cell]:!border-b [&_.dx-scheduler-time-panel-cell]:!border-gray-200
    [&_.dx-scheduler-time-panel-cell]:!pr-1 [&_.dx-scheduler-time-panel-cell]:!text-right [&_.dx-scheduler-time-panel-cell]:!text-[10px] [&_.dx-scheduler-time-panel-cell]:!font-medium [&_.dx-scheduler-time-panel-cell]:!text-gray-400
    [&_.dx-scheduler-date-table-cell.dx-scheduler-date-table-cell-current]:!bg-gray-100
    [&_.dx-scheduler-date-time-indicator]:!h-0.5 [&_.dx-scheduler-date-time-indicator]:!bg-black
    [&_.dx-scheduler-date-time-indicator::before]:!h-2 [&_.dx-scheduler-date-time-indicator::before]:!w-2 [&_.dx-scheduler-date-time-indicator::before]:!rounded-full [&_.dx-scheduler-date-time-indicator::before]:!bg-black
    [&_.dx-scheduler-header-panel]:!border-0 [&_.dx-scheduler-header-panel]:!shadow-none
    [&_.dx-scheduler-header-row]:!border-0 [&_.dx-scheduler-header-row]:!shadow-none
    [&_.dx-scheduler-header-panel-container]:!border-0 [&_.dx-scheduler-header-panel-container]:!shadow-none
    [&_.dx-scheduler-header-scrollable]:!border-0 [&_.dx-scheduler-header-scrollable]:!shadow-none
    [&_.dx-scheduler-all-day-panel]:!min-h-[42px] [&_.dx-scheduler-all-day-panel]:!bg-gray-50
    [&_.dx-scheduler-all-day-appointment]:!h-6
    [&_.dx-scheduler-all-day-title]:!text-[11px] [&_.dx-scheduler-all-day-title]:!font-medium [&_.dx-scheduler-all-day-title]:!text-gray-400
    [&_.dx-scheduler-appointment]:![container-type:size] [&_.dx-scheduler-appointment]:!m-px [&_.dx-scheduler-appointment]:!rounded-none
    [&_.dx-scheduler-appointment]:!border-0 [&_.dx-scheduler-appointment]:!border-l-[3px] [&_.dx-scheduler-appointment]:!border-l-[rgba(255,255,255,0.35)]
    [&_.dx-scheduler-appointment]:!shadow-[0_1px_2px_rgba(0,0,0,0.08)] [&_.dx-scheduler-appointment]:!transition-shadow
    [&_.dx-scheduler-appointment:hover]:!shadow-[0_2px_6px_rgba(0,0,0,0.16)]
    [&_.dx-scheduler-appointment-content]:!block [&_.dx-scheduler-appointment-content]:!h-full [&_.dx-scheduler-appointment-content]:!overflow-hidden [&_.dx-scheduler-appointment-content]:!p-0
    [&_.dx-scheduler-work-space-month_.dx-scheduler-appointment]:!h-[34px]
    [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector]:!hidden [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector]:!invisible [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector]:!pointer-events-none
    [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector-content]:!hidden [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector-content]:!invisible [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment-collector-content]:!pointer-events-none
    [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector]:!hidden [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector]:!invisible [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector]:!pointer-events-none
    [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector-content]:!hidden [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector-content]:!invisible [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment-collector-content]:!pointer-events-none
    [&_.dx-scheduler-work-space-week_.dx-scheduler-appointment]:!min-w-0
    [&_.dx-scheduler-work-space-day_.dx-scheduler-appointment]:!min-w-0
    [&_.dx-scheduler-work-space-week_.campaign-appt-title]:!text-[11px] [&_.dx-scheduler-work-space-week_.campaign-appt-title]:!font-semibold [&_.dx-scheduler-work-space-week_.campaign-appt-title]:!leading-[1.3]
    [&_.dx-scheduler-work-space-day_.campaign-appt-title]:!text-[11px] [&_.dx-scheduler-work-space-day_.campaign-appt-title]:!font-semibold [&_.dx-scheduler-work-space-day_.campaign-appt-title]:!leading-[1.3]
    [&_.dx-scheduler-work-space-week_.campaign-appt-time]:!text-[10px] [&_.dx-scheduler-work-space-week_.campaign-appt-time]:!leading-[1.2]
    [&_.dx-scheduler-work-space-day_.campaign-appt-time]:!text-[10px] [&_.dx-scheduler-work-space-day_.campaign-appt-time]:!leading-[1.2]
    [&_.dx-scheduler-work-space-week_.campaign-appt-placement]:!text-[9px]
    [&_.dx-scheduler-work-space-day_.campaign-appt-placement]:!text-[9px]
    [&_.dx-scheduler-work-space-week_.campaign-appt-inner]:!gap-0 [&_.dx-scheduler-work-space-week_.campaign-appt-inner]:!px-[5px] [&_.dx-scheduler-work-space-week_.campaign-appt-inner]:!py-0.5
    [&_.dx-scheduler-work-space-day_.campaign-appt-inner]:!gap-0 [&_.dx-scheduler-work-space-day_.campaign-appt-inner]:!px-[5px] [&_.dx-scheduler-work-space-day_.campaign-appt-inner]:!py-0.5
    [&_.dx-scheduler-container_*]:!box-border
`;

const controlButtonClass = 'flex h-8 cursor-pointer items-center rounded-none border border-gray-300 bg-white px-3.5 text-[13px] font-semibold text-gray-900 transition hover:border-black hover:bg-gray-50';
const navButtonClass = 'flex cursor-pointer items-center rounded-none border-0 bg-transparent p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900';
const searchInputClass = 'h-8 w-[180px] rounded-none border border-gray-300 bg-white py-0 pl-8 pr-3 text-[13px] text-gray-900 transition placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-gray-200 max-[1400px]:w-[150px] max-[1200px]:w-[130px] max-[1200px]:text-xs';
const filterSelectClass = 'h-8 max-w-[170px] cursor-pointer rounded-none border border-gray-300 bg-white px-2.5 text-[13px] font-medium text-gray-900 focus:border-black focus:outline-none max-[1400px]:max-w-[140px] max-[1200px]:max-w-[110px] max-[1200px]:text-xs';

// Custom appointment card — mirrors Monier's scheduler appointment render.
const renderAppointment = (model) => {
    const appt = model?.appointmentData || model?.data || model || {};
    const title = appt.text || '';
    const start = appt.startDate ? new Date(appt.startDate) : null;
    const end = appt.endDate ? new Date(appt.endDate) : null;
    const timeStr = start && end ? `${fmtTime(start)} – ${fmtTime(end)}` : '';
    const placement = appt.placement || '';
    const isRejected = appt.statusValue === 'rejected';

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

    const calendarRef = useRef(null);
    const calendarFcEvents = useMemo(() => dataSource.map((ev) => ({
        id: String(ev.id),
        title: ev.text,
        start: ev.startDate,
        end: ev.endDate,
        backgroundColor: STATUS_RESOURCE_COLORS[ev.statusValue] || '#9ca3af',
        borderColor: STATUS_RESOURCE_COLORS[ev.statusValue] || '#9ca3af',
        extendedProps: { appt: ev },
    })), [dataSource]);
    // Keep FullCalendar in step with the board's own view/date controls.
    useEffect(() => {
        const api = calendarRef.current?.getApi?.();
        if (api) api.changeView(FC_VIEWS[currentView] || 'dayGridMonth', currentDate);
    }, [currentView, currentDate]);

    const displayDate = useMemo(() => new Date(currentDate), [currentDate]);
    const handleDateChange = useCallback((e) => setCurrentDate(new Date(e.value)), []);

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
            <div className="h-[calc(100vh-300px)] min-h-[700px]">
                <div className={schedulerBoardClass}>
                    <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 max-[1200px]:gap-2 max-[1200px]:px-3 max-[1024px]:h-auto max-[1024px]:flex-wrap max-[1024px]:px-3 max-[1024px]:py-2">
                        <div className="flex flex-nowrap items-center gap-3 max-[1400px]:gap-2 max-[1024px]:flex-1 max-[1024px]:flex-wrap">
                            <div className="flex h-8 items-stretch rounded-none border border-gray-300 bg-white p-0.5">
                                {['day', 'week', 'month'].map((v) => (
                                    <button
                                        key={v}
                                        className={`flex cursor-pointer items-center whitespace-nowrap rounded-none border-0 px-3.5 text-[13px] font-semibold transition max-[1400px]:px-2.5 max-[1400px]:py-1.5 max-[1200px]:px-2 max-[1200px]:text-xs ${currentView === v ? 'bg-black text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
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
                            <div className="flex h-8 items-center gap-1 rounded-none border border-gray-300 bg-white p-0.5">
                                <button className={navButtonClass} onClick={() => navigateDate(-1)}><ChevronLeft size={18} /></button>
                                <div className="whitespace-nowrap text-sm font-semibold text-gray-900 [&_.dx-texteditor-input]:!p-0 [&_.dx-texteditor-input]:!text-sm [&_.dx-texteditor-input]:!font-semibold [&_.dx-texteditor-input]:!text-gray-900 [&_.dx-texteditor.dx-editor-underlined]:!border-0">
                                    <DateBox value={displayDate} onValueChanged={handleDateChange} type="date" displayFormat="MMM dd, yyyy" stylingMode="underlined" width={140} />
                                </div>
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
                                        className="h-7 w-full rounded-none border border-gray-300 bg-white py-0 pl-7 pr-2 text-xs text-gray-900 transition placeholder:text-xs placeholder:text-gray-400 focus:border-black focus:outline-none"
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
                                moreLinkContent={(arg) => appointmentCollectorRender({ appointmentCount: arg.num })}
                            />

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
            <div className="border border-gray-200 rounded-none bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Placement Status</h3>
                    <span className="text-xs text-gray-500">Total: {allPlacementNames.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 bg-gray-50 rounded-none p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Running</p>
                            <span className="text-xs font-semibold text-gray-700">{activePlacementNames.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {activePlacementNames.length > 0 ? activePlacementNames.map((name) => (
                                <span key={`active-${name}`} className="text-[11px] font-medium text-white bg-black border border-black px-2 py-1 rounded-none">
                                    {name}
                                </span>
                            )) : (
                                <p className="text-xs text-gray-600">No active placement campaigns.</p>
                            )}
                        </div>
                    </div>

                    <div className="border border-gray-200 bg-gray-50 rounded-none p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Not Running</p>
                            <span className="text-xs font-semibold text-gray-700">{inactiveOrMissingPlacementNames.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {inactiveOrMissingPlacementNames.length > 0 ? inactiveOrMissingPlacementNames.map((name) => (
                                <span key={`inactive-${name}`} className="text-[11px] font-medium text-black bg-white border border-gray-200 px-2 py-1 rounded-none">
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
