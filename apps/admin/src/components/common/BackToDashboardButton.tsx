import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface BackToDashboardButtonProps {
  onClick: () => void;
  label?: string;
  shortLabel?: string;
  className?: string;
  variant?: 'pill' | 'minimal';
}

export default function BackToDashboardButton({
  onClick,
  label = 'Back to Dashboard',
  shortLabel = 'Dashboard',
  className = '',
  variant = 'pill',
}: BackToDashboardButtonProps) {
  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-black transition-colors duration-150 focus:outline-none ${className}`}
      >
        <span className="w-6 h-6 rounded-md bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600 group-hover:text-black transition-transform duration-150 group-hover:-translate-x-0.5" />
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/90 hover:text-black border border-gray-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${className}`}
    >
      <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.06)] group-hover:border-gray-300 transition-all flex-shrink-0">
        <ChevronLeft className="w-3.5 h-3.5 text-gray-600 group-hover:text-black transition-transform duration-150 group-hover:-translate-x-0.5" />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}
