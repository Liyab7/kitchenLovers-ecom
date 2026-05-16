import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiRotateCcw, FiArrowRight, FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import Loader from '../components/common/Loader.jsx';
import Empty from '../components/common/Empty.jsx';

const STATUS_META = {
  pending: { Icon: FiClock, label: 'Pending review', badge: 'badge-muted' },
  approved: { Icon: FiCheckCircle, label: 'Approved', badge: 'badge bg-accent/10 text-accent' },
  rejected: { Icon: FiXCircle, label: 'Rejected', badge: 'badge-danger' },
  processed: { Icon: FiDollarSign, label: 'Refunded', badge: 'badge-success' },
};

export default function MyRefunds() {
  const [list, setList] = useState(null);

  const load = useCallback(() => {
    api.get('/refunds/mine').then((r) => setList(r.data.data || [])).catch(() => setList([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live: re-fetch when admin updates a refund status (server pushes refund:updated)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.on('refund:updated', load);
    return () => socket.off('refund:updated', load);
  }, [load]);

  if (list === null) return <Loader />;
  if (list.length === 0) {
    return (
      <Empty
        icon={FiRotateCcw}
        title="No refund requests"
        hint="If something arrives wrong, you can request a refund from the order page."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
          <FiRotateCcw className="text-primary" /> My refund requests
        </h1>
        <span className="text-[11px] inline-flex items-center gap-1.5 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
        </span>
      </div>

      <div className="card divide-y divide-ink/10">
        {list.map((r) => {
          const orderId = typeof r.order === 'object' ? r.order?._id : r.order;
          const meta = STATUS_META[r.status] || STATUS_META.pending;
          return (
            <Link
              key={r._id}
              to={`/orders/${orderId}`}
              className="p-4 flex items-center gap-3 sm:gap-4 no-underline text-ink hover:bg-ink/[0.02] transition"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                r.status === 'processed' ? 'bg-success/15 text-success'
                : r.status === 'rejected' ? 'bg-danger/15 text-danger'
                : r.status === 'approved' ? 'bg-accent/15 text-accent'
                : 'bg-ink/8 text-ink/55'
              }`}>
                <meta.Icon className="text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{r.orderNumber}</p>
                <p className="text-xs text-ink/60 capitalize mt-0.5">
                  {r.reason.replace('_', ' ')} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                {r.adminNote && (
                  <p className="text-xs text-ink/70 mt-1 line-clamp-2 border-l-2 border-primary/40 pl-2">
                    {r.adminNote}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={meta.badge}>{meta.label}</span>
                <FiArrowRight className="text-ink/35" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
