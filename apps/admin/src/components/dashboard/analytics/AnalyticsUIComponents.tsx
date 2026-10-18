import React from 'react';
import { ChevronRight } from 'lucide-react';
import { catStyle } from '../../../utils/analyticsUtils';

// ─── Skeletons ────────────────────────────────────────────────────────────────

export const Skeleton = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <div className={`bg-slate-100 animate-pulse rounded ${className}`} style={style} />
);

export const TableSkeleton = () => (
    <div className="w-full space-y-6">
        <div className="space-y-2 mb-2">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5 opacity-50" />
        </div>
        <div className="w-full space-y-4">
            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 border-b border-slate-50 pb-4 last:border-0">
                    <Skeleton className="h-6 w-full" />
                </div>
            ))}
        </div>
    </div>
);

export const ChartSkeleton = ({ height = "200px" }: { height?: string }) => (
    <div className="w-full space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5 opacity-50" />
        </div>
        <Skeleton className="w-full rounded-md" style={{ height }} />
    </div>
);

export const NumberSkeleton = () => (
    <div className="flex flex-col space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-2.5 w-20" />
    </div>
);

// ─── Card ─────────────────────────────────────────────────────────────────────

export const Card = ({
    children,
    className = '',
    noPadding = false,
    style = {},
    isLoading = false,
    skeletonType = 'chart',
    skeletonHeight = "250px",
}: {
    children?: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    style?: React.CSSProperties;
    isLoading?: boolean;
    skeletonType?: 'chart' | 'table' | 'number';
    skeletonHeight?: string;
}) => (
    <div
        className={`bg-white border border-black overflow-hidden ${noPadding ? 'p-0' : 'p-3'} ${className}`}
        style={style}
    >
        {isLoading ? (
            <div className={noPadding ? 'p-4' : ''}>
                {skeletonType === 'table' && <TableSkeleton />}
                {skeletonType === 'chart' && <ChartSkeleton height={skeletonHeight} />}
                {skeletonType === 'number' && <NumberSkeleton />}
            </div>
        ) : (
            children
        )}
    </div>
);

// ─── CardTitle ────────────────────────────────────────────────────────────────

export const CardTitle = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="text-sm font-semibold mb-3.5 text-slate-900">
        {title}
        {sub && <span className="font-normal text-gray-500 text-xs ml-1"> — {sub}</span>}
    </div>
);

// ─── KpiTile ──────────────────────────────────────────────────────────────────

export const KpiTile = ({
    label,
    value,
    sub,
    showArrow,
    trend,
    trendLabel,
    isLoading = false,
}: {
    label: string;
    value: string | number;
    sub?: string;
    showArrow?: boolean;
    trend?: 'up' | 'down';
    trendLabel?: string;
    isLoading?: boolean;
}) => (
    <div className="flex items-center gap-3 sm:gap-6 group">
        <div className="flex flex-col min-w-[120px]">
            {isLoading ? (
                <NumberSkeleton />
            ) : (
                <>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 opacity-90">{label}</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-light text-slate-600 tracking-tight leading-none">{value}</span>
                        {trend && (
                            <span className={`text-[10px] font-black tracking-tighter flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {trend === 'up' ? '↑' : '↓'} {trendLabel}
                            </span>
                        )}
                    </div>
                    {sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{sub}</span>}
                </>
            )}
        </div>
        {showArrow && (
            <div className="hidden lg:block text-slate-200 mt-4">
                <ChevronRight size={40} strokeWidth={1} />
            </div>
        )}
    </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────

export const Badge = ({ value }: { value: string }) => {
    const s = catStyle(value);
    return (
        <span
            className="px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{ background: s.bg, color: s.text }}
        >
            {value}
        </span>
    );
};

// ─── SidebarItem ──────────────────────────────────────────────────────────────

export const SidebarItem = ({
    label,
    value,
    isLink,
}: {
    label: string;
    value: string;
    isLink?: boolean;
}) => (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
        <div className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{label}</div>
        {isLink ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                {value}
            </a>
        ) : (
            <div className="text-sm text-slate-550 font-medium">{value}</div>
        )}
    </div>
);

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export const ProgressBar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
    </div>
);

// ─── MiniSparkline ────────────────────────────────────────────────────────────

export const MiniSparkline = ({ values, color }: { values: number[]; color: string }) => {
    const max = Math.max(...values, 1);
    return (
        <div className="flex gap-0.5 items-end h-5">
            {values.map((v, i) => (
                <div
                    key={i}
                    className="w-1.5 rounded-[1px]"
                    style={{ height: `${Math.max(15, (v / max) * 90)}%`, background: color }}
                />
            ))}
        </div>
    );
};