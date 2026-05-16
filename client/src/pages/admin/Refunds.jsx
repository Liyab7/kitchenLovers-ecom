import { useEffect, useState } from 'react';
import { FiRotateCcw, FiCheck, FiX, FiClock, FiSend } from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-ink/10 text-ink', Icon: FiClock },
  { value: 'approved', label: 'Approved', color: 'bg-accent/10 text-accent', Icon: FiCheck },
  { value: 'rejected', label: 'Rejected', color: 'bg-danger/10 text-danger', Icon: FiX },
  { value: 'processed', label: 'Processed', color: 'bg-success/10 text-success', Icon: FiSend },
];
const STATUS_INFO = STATUSES.reduce((acc, s) => ({ ...acc, [s.value]: s }), {});

const REASON_LABEL = {
  damaged: 'Damaged on arrival',
  wrong_item: 'Wrong item received',
  missing_item: 'Missing item',
  delayed: 'Delivery too late',
  other: 'Other',
};

function ResolveModal({ refund, onClose, onSave }) {
  const [status, setStatus] = useState('approved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!refund) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ status, adminNote: note }); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg">Resolve refund</h2>
            <p className="text-sm text-ink/60">Order {refund.orderNumber}</p>
          </div>
          <button type="button" className="btn-ghost p-1" onClick={onClose}><FiX /></button>
        </div>

        <ChipRow>
          {STATUSES.filter((s) => s.value !== 'pending').map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
              <s.Icon /> {s.label}
            </Chip>
          ))}
        </ChipRow>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Note (shown to customer)</p>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your decision or next steps..." />
        </div>

        <p className="text-xs text-ink/60">
          Marking <b>processed</b> will also change the order's status to <b>refunded</b>.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
            <FiCheck /> {saving ? 'Saving...' : `Mark ${status}`}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Refunds() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [resolving, setResolving] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/refunds', { params: filter ? { status: filter } : {} });
    setList(data.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function save({ status, adminNote }) {
    try {
      await api.patch(`/refunds/${resolving._id}/status`, { status, adminNote });
      toast.success(`Refund ${status}`);
      setResolving(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl inline-flex items-center gap-2"><FiRotateCcw className="text-primary" /> Refund requests</h1>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Filter by status</p>
        <ChipRow>
          <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
          {STATUSES.map((s) => (
            <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>{s.label}</Chip>
          ))}
        </ChipRow>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <p className="card p-6 text-ink/60 text-sm text-center">No refund requests match.</p>
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const s = STATUS_INFO[r.status];
            return (
              <div key={r._id} className="card p-4 grid sm:grid-cols-[1fr_auto] gap-3 items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.orderNumber}</p>
                    <span className={`badge ${s.color}`}><s.Icon /> {s.label}</span>
                    <span className="badge bg-primary/10 text-primary">{REASON_LABEL[r.reason] || r.reason}</span>
                  </div>
                  <p className="text-xs text-ink/60 mt-1">
                    {r.user?.fullName || 'Customer'} · {r.user?.phone} {r.user?.email && `· ${r.user.email}`}
                    <span className="text-ink/40"> · {new Date(r.createdAt).toLocaleString()}</span>
                  </p>
                  {r.description && <p className="text-sm text-ink/80 mt-2">{r.description}</p>}
                  {r.adminNote && (
                    <p className="text-xs text-ink/70 mt-2 border-l-2 border-primary pl-2">
                      <b>Admin note:</b> {r.adminNote}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {r.status === 'pending' ? (
                    <button onClick={() => setResolving(r)} className="btn-primary text-sm inline-flex items-center gap-1">
                      Resolve
                    </button>
                  ) : (
                    <button onClick={() => setResolving(r)} className="btn-outline text-sm inline-flex items-center gap-1">
                      Update
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResolveModal refund={resolving} onClose={() => setResolving(null)} onSave={save} />
    </div>
  );
}
