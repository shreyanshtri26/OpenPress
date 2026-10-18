// src/components/campaigns/MetricCard.jsx
import React from 'react';

export default function MetricCard({ label, value }) {
    return (
        <div className="flex flex-col justify-center">
            <div className="text-sm font-bold text-gray-900 mb-1">{label}</div>
            <div className="text-4xl text-gray-600 font-light tracking-wide">{value}</div>
        </div>
    );
}
