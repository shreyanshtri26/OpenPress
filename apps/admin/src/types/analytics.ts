// ─── Analytics Layer API Types ────────────────────────────────────────────────

export interface IdentityEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    event_time_utc: string;
    referrer: string | null;
    referrer_domain: string | null;
    log_stream: string;
    application_id: string;
}

export interface EngagementEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    page_interaction_id: string | null;
    interaction_index: number;
    time_on_parent_page_ms: number | null;
    event_type: string;
}

export interface ContentEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    page_id: string;
    page_title: string;
    page_category: string;
    parent_page_id: string | null;
}

export interface AudienceEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    device_type: string;
    platform_type: string;
    browser_name: string;
    browser_version: string;
    os_name: string;
    os_version: string;
    browser_language: string;
}

export interface GeographyEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    country_code: string;
    subdivision_code: string;
    locality_name: string;
    domain: string;
}

export interface SharingEvent {
    user_id: string;
    session_id: string;
    event_id: string;
    event_timestamp_ms: number;
    event_type: string;
    share_platform: string | null;
}

export interface LayerResponse<T> {
    data: T[];
    total: number;
}

// ─── Aggregated API Types ────────────────────────────────────────────────────

export interface OverviewCounts {
    total_sessions: number;
    active_users: number;
    total_page_views: number;
    total_events: number;
    avg_time_on_page_ms: number;
}

export interface PerformanceChartItem {
    day: string;
    value: number;
}

export interface NewVsReturningItem {
    type: string;
    count: number;
}

export interface TrafficSourceItem {
    source: string;
    count: number;
}

export interface FunnelItem {
    stage: string;
    count: number;
    pct: number;
}

export interface SessionFrequencyItem {
    k: string;
    v: number;
}

export interface RealtimeSummary {
    active_users: number;
    views_last_30m: number;
    minutes: { minute: string; count: number }[];
    top_cities: { city: string; count: number }[];
    top_pages: { title: string; views: number; users: number }[];
    last_update: string;
}

export interface ContentTopCategory {
    key: string;
    count: number;
}

export interface CategoryTrendResponse {
    categories: string[];
    data: any[];
}

export interface ScrollDepthItem {
    depth: string;
    count: number;
}

export interface TopContentItem {
    title: string;
    category: string;
    views: number;
    avg_time_ms: number;
    avg_interactions: number;
    score: number;
}

export interface TopContentResponse {
    data: TopContentItem[];
    max_score: number;
    total: number;
    next_offset: number | null;
}

export interface ExitPageItem {
    title: string;
    exits: number;
}

export interface DeviceEngagementItem {
    device: string;
    sessions: number;
    avg_time_s: number;
    avg_interactions: number;
}

export interface EngagementSegment {
    label: string;
    desc: string;
    val: number;
}

export interface CohortRetentionItem {
    week: string;
    pct: number;
}

export interface ShareStatItem {
    key: string;
    count: number;
}

export interface HighValueUserItem {
    user_id: string;
    sessions: number;
    page_views: number;
    shares: number;
    top_category: string;
    score: number;
}

export interface TopCountryItem {
    key: string;
    count: number;
    pct: number;
    color?: string;
}

export interface RegionCategoryPrefItem {
    region: string;
    top_category: string;
    count: number;
}

export interface TopLocalityItem {
    locality: string;
    country: string;
    users: number;
    sessions: number;
    avg_time_s: number;
    avg_interactions: number;
}

export interface LocalityEngagementItem {
    locality: string;
    country: string;
    sessions: number;
    avg_time_s: number;
    avg_interactions: number;
}

export interface LocalityBreakdownItem {
    locality: string;
    country: string;
    users: number;
    sessions: number;
    avg_time_s: number;
    avg_interactions: number;
}

export interface BrowserShareItem {
    key: string;
    count: number;
}

export interface OSShareItem {
    key: string;
    count: number;
}

export interface LanguageShareItem {
    key: string;
    count: number;
}

export interface SharingCounts {
    total_shares: number;
    avg_shares_per_day: number;
    share_conversion_rate: number;
    total_ad_impressions: number;
    total_ad_clicks: number;
    ad_ctr: number;
}

export interface SharesByPlatformResponse {
    total_shares: number;
    data: SharingByPlatformItem[];
}

export interface SharingByPlatformItem {
    platform: string;
    count: number;
}

export interface SharesByUserItem {
    user_id: string;
    total: number;
    top_platform: string;
    platforms_used: string[];
}

export type SharingByUserItem = SharesByUserItem;

export interface SharingEventLogItem {
    event_timestamp_ms: number;
    user_id: string;
    session_id: string;
    share_platform: string;
}

// ─── Dashboard UI Types ───────────────────────────────────────────────────────

export type TabId = 'overview' | 'content' | 'users' | 'geo' | 'sharing' | 'realtime' | 'ads';

export interface AnalyticsDashboardProps {
    onBack: () => void;
}