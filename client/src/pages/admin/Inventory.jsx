import { useEffect, useState } from 'react';
import {
  FiBox, FiSearch, FiPlus, FiMinus, FiX, FiActivity, FiAlertTriangle, FiArrowUpRight, FiArrowDownRight,
} from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import toast from 'react-hot-toast';

const ADJUSTMENT_REASONS = [
  { value: 'restock', label: 'Restock' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'damage', label: 'Damage' },
  { value: 'return', label: 'Customer return' },
  { value: 'cancellation', label: 'Order cancelled' },
];

const REASON_COLORS = {
  order: 'bg-accent/10 text-accent',
  restock: 'bg-success/10 text-success',
  adjustment: 'bg-primary/10 text-primary',
  damage: 'bg-danger/10 text-danger',
  return: 'bg-ink/10 text-ink',
  cancellation: 'bg-ink/10 text-ink',
};

function relative(ts) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

function AdjustModal({ product, onClose, onSave }) {
  const [direction, setDirection] = useState('in'); // 'in' or 'out'
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const delta = direction === 'in' ? Math.abs(qty) : -Math.abs(qty);
      await onSave({ delta, reason, note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Adjust stock</h2>
            <p className="text-sm text-ink/60 truncate">{product.name}</p>
            <p className="text-xs text-ink/50 mt-1">Current stock: <b>{product.stock}</b></p>
          </div>
          <button type="button" className="btn-ghost p-1" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

        <ChipRow>
          <Chip active={direction === 'in'} onClick={() => setDirection('in')}>+ Stock in</Chip>
          <Chip active={direction === 'out'} onClick={() => setDirection('out')}>− Stock out</Chip>
        </ChipRow>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Quantity</p>
          <div className="inline-flex items-stretch border border-ink/15 rounded-md overflow-hidden">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 hover:bg-ink/5" aria-label="Decrease"><FiMinus /></button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 text-center outline-none bg-white"
            />
            <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 hover:bg-ink/5" aria-label="Increase"><FiPlus /></button>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Reason</p>
          <ChipRow>
            {ADJUSTMENT_REASONS.map((r) => (
              <Chip key={r.value} active={reason === r.value} onClick={() => setReason(r.value)}>{r.label}</Chip>
            ))}
          </ChipRow>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Note (optional)</p>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. invoice #4321, received from supplier..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
            {direction === 'in' ? <FiPlus /> : <FiMinus />} {saving ? 'Saving...' : 'Apply adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Inventory() {
  const [levels, setLevels] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'low' | 'out'
  const [adjusting, setAdjusting] = useState(null);

  async function load() {
    setLoading(true);
    const params = { limit: 100 };
    if (filter === 'low') params.lowOnly = true;
    if (filter === 'out') params.outOnly = true;
    if (search) params.q = search;
    const [l, m] = await Promise.all([
      api.get('/admin/inventory/levels', { params }),
      api.get('/admin/inventory/movements', { params: { limit: 50 } }),
    ]);
    setLevels(l.data.data);
    setMovements(m.data.data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  async function applyAdjustment({ delta, reason, note }) {
    if (!adjusting) return;
    try {
      await api.post(`/admin/inventory/adjust/${adjusting._id}`, { delta, reason, note });
      toast.success('Stock adjusted');
      setAdjusting(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl inline-flex items-center gap-2"><FiBox className="text-primary" /> Inventory</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ChipRow>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
          <Chip active={filter === 'low'} onClick={() => setFilter('low')}>Low stock</Chip>
          <Chip active={filter === 'out'} onClick={() => setFilter('out')}>Out of stock</Chip>
        </ChipRow>
      </div>

      {loading ? <Loader /> : (
        <div className="grid lg:grid-cols-3 gap-4">
          <section className="card overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-ink/10 flex items-center justify-between">
              <h2 className="font-semibold">Stock levels</h2>
              <span className="text-xs text-ink/50">{levels.length} item{levels.length === 1 ? '' : 's'}</span>
            </div>
            <div className="divide-y divide-ink/10">
              {levels.length === 0 && <p className="p-5 text-sm text-ink/60">No products match.</p>}
              {levels.map((p) => {
                const isLow = p.trackInventory && p.stock <= p.lowStockThreshold && p.stock > 0;
                const isOut = p.trackInventory && p.stock <= 0;
                return (
                  <div key={p._id} className="p-3 sm:p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-canvas overflow-hidden shrink-0">
                      {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-ink/50 truncate">
                        {p.brand && <>{p.brand} · </>}{p.sku || 'no SKU'} · threshold {p.lowStockThreshold}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-semibold ${isOut ? 'text-danger' : isLow ? 'text-danger' : 'text-ink'}`}>
                        {p.stock}
                      </p>
                      {isOut && <span className="badge bg-danger/10 text-danger inline-flex items-center gap-1 text-[10px]"><FiAlertTriangle /> out</span>}
                      {isLow && <span className="badge bg-danger/10 text-danger inline-flex items-center gap-1 text-[10px]"><FiAlertTriangle /> low</span>}
                    </div>
                    <button
                      onClick={() => setAdjusting(p)}
                      className="btn-outline text-sm py-1.5 px-3 inline-flex items-center gap-1 shrink-0"
                      disabled={!p.trackInventory}
                      title={p.trackInventory ? 'Adjust stock' : 'Inventory tracking disabled for this product'}
                    >
                      <FiActivity /> Adjust
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="p-4 border-b border-ink/10">
              <h2 className="font-semibold">Recent movements</h2>
              <p className="text-xs text-ink/50 mt-0.5">Latest 50</p>
            </div>
            <div className="divide-y divide-ink/10 max-h-[600px] overflow-y-auto">
              {movements.length === 0 && <p className="p-5 text-sm text-ink/60">No stock movements yet.</p>}
              {movements.map((m) => (
                <div key={m._id} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{m.productName}</p>
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${m.delta < 0 ? 'text-danger' : 'text-success'}`}>
                      {m.delta < 0 ? <FiArrowDownRight /> : <FiArrowUpRight />} {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className={`badge ${REASON_COLORS[m.reason] || 'bg-ink/10'}`}>{m.reason}</span>
                    <span className="text-xs text-ink/50">{m.beforeStock} → {m.afterStock}</span>
                  </div>
                  {(m.note || m.reference?.label) && (
                    <p className="text-xs text-ink/60 mt-1.5 truncate">
                      {m.reference?.label && <span className="text-primary">{m.reference.label} </span>}
                      {m.note}
                    </p>
                  )}
                  <p className="text-[11px] text-ink/40 mt-1">{m.actorName || 'system'} · {relative(m.createdAt)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} onSave={applyAdjustment} />
    </div>
  );
}
