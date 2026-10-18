import { BookOpen } from 'lucide-react';

export function AllStoriesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:px-8 py-12 sm:py-16 text-center min-h-[300px]">
      <span className="inline-flex h-12 sm:h-16 w-12 sm:w-16 items-center justify-center bg-slate-100 text-slate-500 flex-shrink-0">
        <BookOpen className="h-6 sm:h-8 w-6 sm:w-8" aria-hidden="true" />
      </span>
      <h2 className="text-base sm:text-lg font-semibold text-slate-800">No stories to display</h2>
      <p className="text-xs sm:text-sm text-slate-600 max-w-md">
        There aren&apos;t any stories in this workflow yet. Try choosing a different tab or
        submit a new story to get started.
      </p>
    </div>
  );
}
