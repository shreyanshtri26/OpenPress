export function AllStoriesLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <img
        src="/images/tube-spinner.svg"
        alt="Loading"
        className="w-12 h-12 sm:w-16 sm:h-16 animate-spin"
      />
    </div>
  );
}
