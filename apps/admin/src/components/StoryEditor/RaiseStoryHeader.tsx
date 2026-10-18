import React from 'react';
import CustomButton from '../../components/common/CustomButton';

interface EditorHeaderProps {
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  lastSaved: Date | null;
  openDrawer: (open: boolean) => void;
  drawerOpened: boolean;
  autoSaveStatus?: 'idle' | 'saving' | 'saved';
}

export const RaiseStoryHeader = ({
  onBack,
  onSaveDraft,
  onSubmit,
  lastSaved,
  openDrawer,
  isSaving,
  isSubmitting,
  drawerOpened,
  autoSaveStatus = 'idle',
}: EditorHeaderProps) => {
  function getTimeAgo(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1m ago';
    return `${diffMins}m ago`;
  }

  const handleNextClick = () => {
    openDrawer(true);
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-xl border-b border-black/[0.08] transition-all">
      <div className="w-full flex justify-center">
        <div className="w-full px-6 max-w-5xl py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left section: Breadcrumb & Ambient Autosave */}
          <div className="flex items-center gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 font-medium tracking-tight">
              <button
                onClick={onBack}
                className="hover:text-black transition-colors"
              >
                Dashboard
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold">Raise A Story</span>
            </nav>

            <span className="h-3 w-px bg-black/10 hidden sm:inline-block" />

            {/* Ambient Autosave Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  autoSaveStatus === 'saving'
                    ? 'bg-amber-500 animate-pulse'
                    : autoSaveStatus === 'saved' || lastSaved
                    ? 'bg-emerald-500'
                    : 'bg-gray-300'
                }`}
              />
              <span className="text-[11px] text-gray-500 tabular-nums">
                {autoSaveStatus === 'saving' && 'Saving...'}
                {autoSaveStatus === 'saved' && (lastSaved ? `Saved ${getTimeAgo(lastSaved)}` : 'Saved')}
                {autoSaveStatus === 'idle' && (lastSaved ? `Saved ${getTimeAgo(lastSaved)}` : 'All changes saved')}
              </span>
            </div>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex items-center sm:justify-end justify-start gap-2">
            {!drawerOpened ? (
              <CustomButton variant="black" onClick={handleNextClick}>
                Next
              </CustomButton>
            ) : (
              <CustomButton variant="black" onClick={onSubmit} disabled={isSubmitting || isSaving}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </CustomButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};