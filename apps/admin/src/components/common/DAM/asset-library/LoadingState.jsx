const LoadingState = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-gray-600 font-sans z-20">
    <div className="flex flex-col items-center gap-3 text-center">
      <img src="/images/tube-spinner.svg" alt="Loading" className="w-16 h-16 animate-spin" />
      <h3 className="text-lg font-medium text-gray-900">Loading assets...</h3>
    </div>
  </div>
);

export default LoadingState;
