import { useEffect, useState } from 'react';
import {
  FiTag, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCopy, FiPercent, FiDollarSign, FiTruck,
} from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import { fmt } from '../../utils/format.js';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'percent', label: 'Percentage off', Icon: FiPercent },
  { value: 'fixed', label: 'Fixed amount off', Icon: FiDollarSign },
  { value: 'free_shipping', label: 'Free shipping', Icon: FiTruck },
];

const emptyForm = {
  code: '', description: '', type: 'percent', value: 10,
  minOrderAmount: 0, maxDiscount: 0,
  startsAt: '', endsAt: '',
  maxUses: 0, perUserLimit: 0,
  isActive: true,
};

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function Promos() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const requestConfirmation = useConfirm();

  async function load() {
    setLoading(true);
    const { data } = await api.get('/promos');
    setList(data.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startNew() { setEditing('new'); setForm(emptyForm); }
  function startEdit(p) {
    setEditing(p._id);
    setForm({
      code: p.code,
      description: p.description || '',
      type: p.type,
      value: p.value || 0,
      minOrderAmount: p.minOrderAmount || 0,
      maxDiscount: p.maxDiscount || 0,
      startsAt: toInputDate(p.startsAt),
      endsAt: toInputDate(p.endsAt),
      maxUses: p.maxUses || 0,
      perUserLimit: p.perUserLimit || 0,
      isActive: p.isActive !== false,
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount),
        maxDiscount: Number(form.maxDiscount),
        maxUses: Number(form.maxUses),
        perUserLimit: Number(form.perUserLimit),
        startsAt: form.startsAt ? new Date(form.startsAt) : null,
        endsAt: form.endsAt ? new Date(form.endsAt) : null,
      };
      if (editing === 'new') await api.post('/promos', payload);
      else await api.put(`/promos/${editing}`, payload);
      toast.success('Saved');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(promo) {
    const confirmed = await requestConfirmation({
      title: 'Delete promo?',
      message: `Delete promo code "${promo.code}"?`,
      confirmLabel: 'Delete promo',
    });
    if (!confirmed) return;
    await api.delete(`/promos/${promo._id}`);
    await load();
  }

  function copy(code) {
    navigator.clipboard?.writeText(code);
    toast.success(`Copied ${code}`);
  }

  function describeValue(p) {
    if (p.type === 'percent') return `${p.value}% off${p.maxDiscount ? ` (max ${fmt(p.maxDiscount, 'GHS')})` : ''}`;
    if (p.type === 'fixed') return `${fmt(p.value, 'GHS')} off`;
    return 'Free shipping';
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiTag className="text-primary" /> Promo codes</h1>
        <button className="btn-primary inline-flex items-center gap-2" onClick={startNew}>
          <FiPlus /> New promo
        </button>
      </div>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="text-lg">{editing === 'new' ? 'New promo' : 'Edit promo'}</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Code</p>
              <input className="input uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required maxLength={40} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Description (internal)</p>
              <input className="input" placeholder="Optional admin note" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Type</p>
            <ChipRow>
              {TYPES.map((t) => (
                <Chip key={t.value} active={form.type === t.value} onClick={() => setForm({ ...form, type: t.value })}>
                  <t.Icon /> {t.label}
                </Chip>
              ))}
            </ChipRow>
          </div>

          {form.type !== 'free_shipping' && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">
                  {form.type === 'percent' ? 'Percentage (1-100)' : 'Amount (GHS)'}
                </p>
                <input className="input" type="number" min={0} max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
              </div>
              {form.type === 'percent' && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Max discount (GHS, 0 = none)</p>
                  <input className="input" type="number" min={0} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Min order amount (GHS)</p>
                <input className="input" type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Starts</p>
              <input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Ends</p>
              <input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Total uses limit (0 = unlimited)</p>
              <input className="input" type="number" min={0} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Per-user limit (0 = unlimited)</p>
              <input className="input" type="number" min={0} value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
            Active
          </label>

          <div className="flex gap-2 pt-2">
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save promo'}
            </button>
            <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setEditing(null)}>
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-canvas">
            <tr className="text-left">
              <th className="p-3">Code</th>
              <th className="p-3">Type</th>
              <th className="p-3">Value</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Window</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ink/60">No promos yet.</td></tr>}
            {list.map((p) => (
              <tr key={p._id} className="border-t border-ink/10">
                <td className="p-3 font-mono font-semibold">
                  <span className="inline-flex items-center gap-2">
                    {p.code}
                    <button onClick={() => copy(p.code)} className="text-ink/40 hover:text-primary" aria-label="Copy"><FiCopy /></button>
                  </span>
                  {p.description && <p className="text-xs text-ink/50 font-normal mt-0.5">{p.description}</p>}
                </td>
                <td className="p-3 capitalize">{p.type.replace('_', ' ')}</td>
                <td className="p-3">{describeValue(p)}</td>
                <td className="p-3">{p.usesCount}{p.maxUses ? `/${p.maxUses}` : ''}</td>
                <td className="p-3 text-xs">
                  {p.startsAt ? new Date(p.startsAt).toLocaleDateString() : 'anytime'}
                  {' → '}
                  {p.endsAt ? new Date(p.endsAt).toLocaleDateString() : 'no end'}
                </td>
                <td className="p-3">
                  <span className={`badge ${p.isActive ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/60'}`}>
                    {p.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3 text-right space-x-1">
                  <button className="btn-ghost py-1 px-2 text-sm" onClick={() => startEdit(p)}><FiEdit2 /></button>
                  <button className="btn-ghost py-1 px-2 text-sm text-danger" onClick={() => remove(p)}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
