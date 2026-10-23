export function ProgressBar({ value = 0, min = 0, max = 100, showStatus = true, visible = true, width, id, statusFormat }) {
  if (!visible) return null;
  const pct = Math.round(((Math.min(Math.max(value, min), max) - min) / (max - min || 1)) * 100);
  return (
    <div id={id} style={{ width }}>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      {showStatus && <div className="mt-1 text-xs text-gray-600">{statusFormat ? statusFormat(pct / 100, value) : `Progress: ${pct}%`}</div>}
    </div>
  );
}

export default ProgressBar;
