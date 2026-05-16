import { useEffect, useState } from 'react';
import { FiShoppingBag, FiEdit2, FiX } from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { fmt } from '../../utils/format.js';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import toast from 'react-hot-toast';

const STATUSES = [
  'pending', 'paid', 'processing', 'packed', 'dispatched', 'in_transit',
  'delivered', 'cancelled', 'returned', 'refunded',
];

const STATUS_BADGE = {
  pending: 'bg-ink/10 text-ink',
  paid: 'bg-accent/10 text-accent',
  processing: 'bg-accent/10 text-accent',
  packed: 'bg-accent/10 text-accent',
  dispatched: 'bg-primary/10 text-primary',
  in_transit: 'bg-primary/10 text-primary',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  returned: 'bg-danger/10 text-danger',
  refunded: 'bg-danger/10 text-danger',
};

const STATUS_LABEL = {
  in_transit: 'in transit',
};

function StatusModal({ order, onClose, onPick }) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg">Update status</h2>
            <p className="text-sm text-ink/60">{order.orderNumber}</p>
          </div>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Chip key={s} active={order.status === s} onClick={() => onPick(s)}>{STATUS_LABEL[s] || s}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusing, setStatusing] = useState(null);

  async function load() {
    setLoading(true);
    const params = filter ? { status: filter } : {};
    const { data } = await api.get('/orders/all', { params });
    setOrders(data.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function pick(status) {
    if (!statusing) return;
    try {
      await api.patch(`/orders/${statusing._id}/status`, { status });
      toast.success(`Marked ${status}`);
      setStatusing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl inline-flex items-center gap-2"><FiShoppingBag className="text-primary" /> Orders</h1>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Filter by status</p>
        <ChipRow>
          <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s] || s}</Chip>
          ))}
        </ChipRow>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {orders.length === 0 && <p className="text-ink/60 text-sm">No orders match.</p>}
            {orders.map((o) => (
              <div key={o._id} className="card p-3">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.orderNumber}</p>
                    <p className="text-xs text-ink/60">{o.user?.fullName || o.user?.phone}</p>
                    <p className="text-xs text-ink/50 mt-1">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    <p className="text-sm font-semibold mt-1">{fmt(o.total, o.currency)}</p>
                  </div>
                </div>
                <button onClick={() => setStatusing(o)} className="btn-outline w-full mt-3 inline-flex items-center justify-center gap-2 text-sm">
                  <FiEdit2 /> Update status
                </button>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr className="text-left">
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-ink/60">No orders match this filter.</td></tr>
                )}
                {orders.map((o) => (
                  <tr key={o._id} className="border-t border-ink/10">
                    <td className="p-3 font-medium">{o.orderNumber}</td>
                    <td className="p-3">{o.user?.fullName || o.user?.phone}</td>
                    <td className="p-3">{fmt(o.total, o.currency)}</td>
                    <td className="p-3"><span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <button className="btn-ghost py-1 px-2 text-sm inline-flex items-center gap-1" onClick={() => setStatusing(o)}>
                        <FiEdit2 /> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <StatusModal order={statusing} onClose={() => setStatusing(null)} onPick={pick} />
    </div>
  );
}
