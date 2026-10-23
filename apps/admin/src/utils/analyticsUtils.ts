import { LayerResponse } from "@/types/analytics";
import apiFetch from "@/utils/api";

// ─── API Base ─────────────────────────────────────────────────────────────────

// Reports are served by our own API (/analytics/*, see apps/api/routes/analytics); VITE_USER_DASHBOARD_API_URL overrides that.
export const API_BASE = (import.meta.env.VITE_USER_DASHBOARD_API_URL || `${import.meta.env.VITE_BACKEND_API ?? ''}/analytics`).replace(/\/$/, '');

// ─── Shared styles (the grid kit overrides) ────────────────────────────────────

export const DX_OVERRIDES = `
  .kit-borderless { border: none !important; background: transparent !important; }
`;

// ─── Color constants ──────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    Technology: { bg: '#f0f0f0', text: '#111111' },
    Politics: { bg: '#e8e8e8', text: '#222222' },
    Business: { bg: '#e0e0e0', text: '#1a1a1a' },
    Sports: { bg: '#d8d8d8', text: '#333333' },
    default: { bg: '#f5f5f5', text: '#444444' },
};

export const catStyle = (cat: string) => CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;

// Monochromatic black/gray palette for all charts
export const BAR_COLORS = ['#000000', '#525252', '#969696', '#cccccc', '#737373', '#a3a3a3', '#d4d4d4'];

// ─── API helper ───────────────────────────────────────────────────────────────

export async function fetchLayer<T>(
    endpoint: string,
    params: Record<string, string>,
    onProgress?: (fetched: number, total: number) => void
): Promise<{ data: T[]; total: number }> {
    const allRows: T[] = [];
    let offset: number | null = 0;
    let total = 0;
    const limit = 1000;

    try {
        do {
            const queryParams: Record<string, string> = {
                ...params,
                limit: String(limit),
                offset: String(offset)
            };
            const qs = new URLSearchParams();
            Object.entries(queryParams).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    qs.append(k, v);
                }
            });

            const url = `${API_BASE}/${endpoint}${qs.toString() ? '?' + qs.toString() : ''}`;
            const res = await apiFetch(url);

            if (!res.ok) {
                throw new Error(`${endpoint} failed at offset ${offset}: ${res.status}`);
            }

            const json = await res.json();
            allRows.push(...(json.data || []));
            total = json.total || 0;

            onProgress?.(allRows.length, total);
            offset = json.next_offset;
        } while (offset !== null);

        return { data: allRows, total };
    } catch (e: any) {
        console.error(`[AnalyticsDashboard] fetch ${endpoint} failed: ${e.message}`);
        return { data: allRows, total: total || allRows.length };
    }
}

const requestCache = new Map<string, { data: any, timestamp: number }>();

interface QueueTask {
    task: () => Promise<any>;
    priority: number;
    resolve: (val: any) => void;
    reject: (err: any) => void;
}

class ConcurrencyQueue {
    private concurrency: number;
    private running: number = 0;
    private queue: QueueTask[] = [];

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    async add<T>(task: () => Promise<T>, priority: number = 1): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ task, priority, resolve, reject });
            this.queue.sort((a, b) => b.priority - a.priority); // Highest priority first
            this.process();
        });
    }

    private async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const next = this.queue.shift()!;
        try {
            const res = await next.task();
            next.resolve(res);
        } catch (e) {
            next.reject(e);
        } finally {
            this.running--;
            this.process();
        }
    }
}

export function clearRequestCache() {
    requestCache.clear();
}

// Limit globally to 6 concurrent analytics queries. 
// We can safely raise this from 3 to 6 now that AbortController cancels abandoned requests!
const analyticsQueue = new ConcurrencyQueue(6);

export async function fetchAggregated<T>(
    endpoint: string,
    params: Record<string, string>,
    retries = 3,
    signal?: AbortSignal,
    priority: number = 1,
    bypassCache: boolean = false
): Promise<T> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            qs.append(k, v);
        }
    });

    const url = `${API_BASE}/${endpoint}${qs.toString() ? '?' + qs.toString() : ''}`;
    
    // Check global memory cache (5 minute TTL), except for realtime endpoints or when bypassCache is requested
    const isRealtime = endpoint.startsWith('realtime/') || bypassCache;
    const cached = isRealtime ? null : requestCache.get(url);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
    }

    return analyticsQueue.add(async () => {
        for (let i = 0; i <= retries; i++) {
            if (signal?.aborted) throw new Error('Aborted');
            try {
                const res = await apiFetch(url, { signal });
                
                // If we get a 504 or 502, wait and retry with longer backoff
                if (res.status === 504 || res.status === 502) {
                    if (i < retries) {
                        const delay = (2000 * (i + 1)) + (Math.random() * 1000); // 2s, 4s, 6s + jitter
                        console.warn(`[Analytics] ${res.status} on ${endpoint}, retrying in ${Math.round(delay)}ms... (${i + 1}/${retries})`);
                        await new Promise((resolve) => {
                            const timer = setTimeout(resolve, delay);
                            signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(undefined); });
                        });
                        if (signal?.aborted) throw new Error('Aborted');
                        continue;
                    }
                }

                if (!res.ok) {
                    const err: any = new Error(`${endpoint} failed: ${res.status}`);
                    // Only 502/504 are transient (already retried above); anything else
                    // (404, 400, etc.) is a permanent failure and shouldn't be retried.
                    err.permanent = true;
                    throw err;
                }

                const data = await res.json();
                if (!isRealtime) {
                    requestCache.set(url, { data, timestamp: Date.now() });
                }
                return data;
            } catch (e: any) {
                if (e.name === 'AbortError' || signal?.aborted) throw e;
                if (e.permanent) {
                    console.error(`[Analytics] ${endpoint} permanent failure, not retrying:`, e);
                    throw e;
                }
                if (i === retries) {
                    console.error(`[Analytics] ${endpoint} final failure after ${retries} retries:`, e);
                    throw e;
                }
                const delay = 1500 * (i + 1);
                console.warn(`[Analytics] fetch error on ${endpoint}, retrying...`, e);
                await new Promise((resolve) => {
                    const timer = setTimeout(resolve, delay);
                    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(undefined); });
                });
                if (signal?.aborted) throw new Error('Aborted');
            }
        }
        throw new Error(`${endpoint} failed after retries`);
    }, priority);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export const fmtMs = (ms: number | null | undefined): string => {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export function countBy<T>(arr: T[], key: keyof T): { key: string; count: number }[] {
    const map = new Map<string, number>();
    arr.forEach(item => {
        const k = String(item[key] ?? 'Unknown');
        map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);
}