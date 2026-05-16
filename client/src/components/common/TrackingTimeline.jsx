import {
  FiClock, FiCreditCard, FiCheckCircle, FiPackage, FiTruck, FiMapPin, FiHome, FiX, FiRotateCcw,
} from 'react-icons/fi';

// Happy-path tracking stages, in display order.
const STAGES = [
  { key: 'pending', label: 'Order placed', Icon: FiClock },
  { key: 'paid', label: 'Payment received', Icon: FiCreditCard },
  { key: 'processing', label: 'Processing', Icon: FiCheckCircle },
  { key: 'packed', label: 'Packed', Icon: FiPackage },
  { key: 'dispatched', label: 'Dispatched', Icon: FiTruck },
  { key: 'in_transit', label: 'In transit', Icon: FiMapPin },
  { key: 'delivered', label: 'Delivered', Icon: FiHome },
];

const TERMINAL_BAD = {
  cancelled: { label: 'Order cancelled', Icon: FiX, tone: 'danger' },
  returned: { label: 'Returned', Icon: FiRotateCcw, tone: 'danger' },
  refunded: { label: 'Refunded', Icon: FiRotateCcw, tone: 'danger' },
};

function timeOf(history, key) {
  if (!Array.isArray(history)) return null;
  const evt = history.find((h) => h.status === key);
  return evt?.at ? new Date(evt.at) : null;
}

function formatShort(d) {
  if (!d) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' · '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function TrackingTimeline({ status, history = [] }) {
  // Handle terminal-bad states up front with a focused panel.
  if (TERMINAL_BAD[status]) {
    const t = TERMINAL_BAD[status];
    const at = timeOf(history, status);
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-danger/15 text-danger flex items-center justify-center shrink-0">
          <t.Icon />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{t.label}</p>
          {at && <p className="text-xs text-ink/60 mt-0.5">{formatShort(at)}</p>}
        </div>
      </div>
    );
  }

  const currentIndex = Math.max(0, STAGES.findIndex((s) => s.key === status));
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;

  return (
    <div>
      {/* Mobile: vertical timeline */}
      <ol className="sm:hidden relative pl-7">
        <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-ink/10" aria-hidden="true" />
        <div
          className="absolute left-3 top-1 w-0.5 bg-primary transition-all"
          style={{ height: `${(safeIndex / (STAGES.length - 1)) * 100}%` }}
          aria-hidden="true"
        />
        {STAGES.map((stage, i) => {
          const reached = i <= safeIndex;
          const isCurrent = i === safeIndex;
          const at = timeOf(history, stage.key);
          return (
            <li key={stage.key} className="relative pb-4 last:pb-0">
              <span
                className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0
                  ${reached ? 'bg-primary text-white' : 'bg-ink/10 text-ink/40'}
                  ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
              >
                <stage.Icon className="text-xs" />
              </span>
              <p className={`text-sm font-semibold ${reached ? 'text-ink' : 'text-ink/45'}`}>{stage.label}</p>
              {at ? (
                <p className="text-[11px] text-ink/55 mt-0.5">{formatShort(at)}</p>
              ) : (
                <p className="text-[11px] text-ink/35 mt-0.5">Pending</p>
              )}
            </li>
          );
        })}
      </ol>

      {/* Desktop: horizontal timeline */}
      <ol className="hidden sm:flex items-start gap-1">
        {STAGES.map((stage, i) => {
          const reached = i <= safeIndex;
          const isCurrent = i === safeIndex;
          const at = timeOf(history, stage.key);
          return (
            <li key={stage.key} className="flex-1 flex flex-col items-center text-center relative">
              {/* connecting line to next */}
              {i < STAGES.length - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 bg-ink/10" aria-hidden="true">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: i < safeIndex ? '100%' : '0%' }}
                  />
                </div>
              )}
              <span
                className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                  ${reached ? 'bg-primary text-white' : 'bg-ink/10 text-ink/40'}
                  ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
              >
                <stage.Icon className="text-sm" />
              </span>
              <p className={`text-[11px] font-semibold mt-2 ${reached ? 'text-ink' : 'text-ink/45'}`}>
                {stage.label}
              </p>
              <p className="text-[10px] text-ink/50 mt-0.5 leading-tight">
                {at ? formatShort(at) : '—'}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
