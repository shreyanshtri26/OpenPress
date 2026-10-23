import React from 'react';
import { TextBox } from '@/components/ui/kit/text-box';
import { Switch } from '@/components/ui/kit/switch';
import { NumberBox } from '@/components/ui/kit/number-box';
import { SelectBox } from '@/components/ui/kit/select-box';
import { Validator, RequiredRule, PatternRule } from '@/components/ui/kit/validator';

const Field = ({ label, required, children }) => (
    <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-400">
            {label}{required && <span className="text-red-500"> *</span>}
        </span>
        {children}
    </label>
);

export default function BasicInfoForm({ formData, onFieldChange }) {
    const statusOptions = ["Start now", "Start later"];
    const periodOptions = ["Session", "Hour", "Day", "Week", "Campaign"];

    return (
        <div className="px-10 py-6 w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <Field label="Campaign Name" required>
                    <TextBox
                        value={formData.campaignName}
                        height={45}
                        onValueChanged={(e) => onFieldChange({ dataField: 'campaignName', value: e.value })}
                    />
                </Field>
                <Field label="Status" required>
                    <SelectBox
                        items={statusOptions}
                        value={formData.status}
                        height={45}
                        width="100%"
                        onValueChanged={(e) => onFieldChange({ dataField: 'status', value: e.value })}
                    />
                </Field>
                <Field label="Advertiser Name" required>
                    <TextBox
                        value={formData.advertiserName}
                        onValueChanged={(e) => onFieldChange({ dataField: 'advertiserName', value: e.value })}
                    />
                </Field>
                <Field label="Landing Page URL" required>
                    <TextBox
                        value={formData.url}
                        placeholder="https://example.com/landing-page"
                        onValueChanged={(e) => onFieldChange({ dataField: 'url', value: e.value })}
                    >
                        <Validator>
                            <RequiredRule message="Landing Page URL is required" />
                            <PatternRule
                                pattern={/^(https?:\/\/)[^\s$.?#].[^\s]*$/i}
                                message="URL must start with http:// or https:// (e.g. https://example.com)"
                            />
                        </Validator>
                    </TextBox>
                </Field>
                <div className="border-t border-gray-200 pt-6 mt-6 w-full md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="block text-sm text-gray-500 mb-2">Global Frequency Cap (Optional)</span>
                        <Switch
                            value={formData.frequencyCapEnabled}
                            onValueChanged={(e) => onFieldChange({ dataField: 'frequencyCapEnabled', value: e.value })}
                        />
                    </div>

                    <div className={`flex items-center gap-3 mt-4 transition-opacity ${!formData.frequencyCapEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="block text-sm text-gray-500 mb-2">Max impressions per user</span>
                        <div className="w-24">
                            <NumberBox
                                value={formData.frequencyCapMax}
                                onValueChanged={(e) => onFieldChange({ dataField: 'frequencyCapMax', value: e.value })}
                                min={0}
                                showSpinButtons={true}
                                className="border border-black"
                                width="100%"
                            />
                        </div>
                        <span className="block text-sm text-gray-500 mb-2">per</span>
                        <div className="w-40">
                            <SelectBox
                                items={periodOptions}
                                value={formData.frequencyCapPeriod}
                                onValueChanged={(e) => onFieldChange({ dataField: 'frequencyCapPeriod', value: e.value })}
                                className="border border-black"
                                width="100%"
                                dropDownOptions={{ minWidth: "100%", width: "100%" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {formData.url && /^(https?:\/\/)[^\s$.?#].[^\s]*$/i.test(formData.url) && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex items-center gap-3">
                        <span className="flex h-2.5 w-2.5 relative text-emerald-500">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Visual Verification Helper</span>
                            <span className="text-[11px] text-gray-500 max-w-sm truncate">Ready to test: {formData.url}</span>
                        </div>
                    </div>
                    <a 
                        href={formData.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded transition-all inline-flex items-center gap-1.5"
                    >
                        Demo Link ↗
                    </a>
                </div>
            )}
            <style>{`
            `}</style>
        </div>
    );
}
