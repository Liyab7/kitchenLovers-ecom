export default function Loader({ label = 'Loading…', variant = 'spinner', rows = 4 }) {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    );
  }
  if (variant === 'card-grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-busy="true" aria-label={label}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-square w-full rounded-none" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-7 w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-10 text-ink/60" role="status" aria-live="polite">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
