import React, { useState } from 'react';
import DateBox from '@/components/ui/dx/date-box';
import SelectBox from '@/components/ui/dx/select-box';

interface FilterDrawerProps {
    fromDate: string;
    toDate: string;
    selectedUserId: string;
    allUserIds: string[];
    dateError: string | null;
    onApply: (vals: { fromDate: string; toDate: string; selectedUserId: string }) => void;
    onReset: () => void;
    onClose: () => void;
}

export const FilterDrawer = ({
    fromDate,
    toDate,
    selectedUserId,
    allUserIds,
    dateError,
    onApply,
    onReset,
    onClose,
}: FilterDrawerProps) => {
    // Staged locally — only committed to the dashboard (and fetched) on Apply,
    // so picking a start date doesn't fire requests before the end date is set.
    const [localFromDate, setLocalFromDate] = useState(fromDate);
    const [localToDate, setLocalToDate] = useState(toDate);
    const [localUserId, setLocalUserId] = useState(selectedUserId);

    return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        />
        <div
            className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
        >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Filters</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Refine audience data</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                {dateError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold">
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {dateError}
                    </div>
                )}

                {/* From Section */}
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Timeframe Start</label>
                    <div className="border border-black flex flex-col divide-y divide-black">
                        <div className="flex items-center px-3 py-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Date</span>
                            <DateBox
                                type="date"
                                pickerType="native"
                                value={localFromDate ? new Date(localFromDate) : undefined}
                                max={new Date()}
                                onValueChanged={e => {
                                    if (!e.value) setLocalFromDate('');
                                    else {
                                        const d = new Date(e.value);
                                        setLocalFromDate(d.toISOString().split('T')[0]);
                                    }
                                }}
                                displayFormat="dd/MM/yyyy"
                                useMaskBehavior={true}
                                showDropDownButton={false}
                                placeholder="Select start date"
                                className="dx-borderless flex-1"
                            />
                        </div>
                    </div>
                </div>

                {/* To Section */}
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Timeframe End</label>
                    <div className="border border-black flex flex-col divide-y divide-black">
                        <div className="flex items-center px-3 py-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Date</span>
                            <DateBox
                                type="date"
                                pickerType="native"
                                value={localToDate ? new Date(localToDate) : undefined}
                                max={new Date()}
                                onValueChanged={e => {
                                    if (!e.value) setLocalToDate('');
                                    else {
                                        const d = new Date(e.value);
                                        setLocalToDate(d.toISOString().split('T')[0]);
                                    }
                                }}
                                displayFormat="dd/MM/yyyy"
                                useMaskBehavior={true}
                                showDropDownButton={false}
                                placeholder="Select end date"
                                className="dx-borderless flex-1"
                            />
                        </div>
                    </div>
                </div>

                {/* User Section */}
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Specific Audience</label>
                    <div className="border border-black px-3 py-1">
                        <SelectBox
                            items={[{ id: '', label: 'All Users' }, ...allUserIds.map(uid => ({ id: uid, label: `${uid.slice(0, 8)}…${uid.slice(-4)}` }))]}
                            valueExpr="id"
                            displayExpr="label"
                            value={localUserId}
                            onValueChanged={e => setLocalUserId(e.value)}
                            placeholder="Select user ID"
                            className="dx-borderless w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                <button
                    onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 30);
                        setLocalFromDate(d.toISOString().split('T')[0]);
                        setLocalToDate(new Date().toISOString().split('T')[0]);
                        setLocalUserId('');
                        onReset();
                    }}
                    className="flex-1 py-4 text-xs font-bold border border-black hover:bg-white transition-all uppercase tracking-widest"
                >
                    Reset All
                </button>
                <button
                    onClick={() => onApply({ fromDate: localFromDate, toDate: localToDate, selectedUserId: localUserId })}
                    className="flex-1 py-4 text-xs font-bold bg-black text-white hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-black/10"
                >
                    Apply
                </button>
            </div>
        </div>
    </div>
    );
};