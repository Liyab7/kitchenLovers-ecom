import { useEffect, useState } from 'react';
import {
  FiUsers, FiSearch, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2, FiSave, FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  isPhoneVerified: false,
  isActive: true,
};

export default function AdminCustomers() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const requestConfirmation = useConfirm();

  async function load(search = q) {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/customers', { params: { q: search || undefined } });
      setList(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q]);

  function startEdit(customer) {
    setEditing(customer);
    setForm({
      fullName: customer.fullName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      isPhoneVerified: !!customer.isPhoneVerified,
      isActive: customer.isActive !== false,
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    try {
      await api.patch(`/admin/customers/${editing._id}`, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        isPhoneVerified: form.isPhoneVerified,
        isActive: form.isActive,
      });
      toast.success('Customer saved');
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(customer) {
    const confirmed = await requestConfirmation({
      title: 'Delete customer?',
      message: `Delete ${customer.fullName || customer.phone}? This removes the customer account but keeps existing order records.`,
      confirmLabel: 'Delete customer',
    });
    if (!confirmed) return;

    setDeleting(customer._id);
    try {
      await api.delete(`/admin/customers/${customer._id}`);
      toast.success('Customer deleted');
      if (editing?._id === customer._id) {
        setEditing(null);
        setForm(emptyForm);
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiUsers className="text-primary" /> Customers</h1>
        <div className="relative max-w-sm w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className="input pl-10"
            placeholder="Search name, phone or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg">Edit customer</h2>
              <p className="text-sm text-ink/60">{editing.phone}</p>
            </div>
            <button type="button" className="btn-ghost p-2" onClick={() => setEditing(null)} aria-label="Close">
              <FiX />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Full name</p>
              <input
                className="input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Phone</p>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Email</p>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="text-sm inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-primary"
              />
              Active account
            </label>
            <label className="text-sm inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPhoneVerified}
                onChange={(e) => setForm({ ...form, isPhoneVerified: e.target.checked })}
                className="accent-primary"
              />
              Phone verified
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save customer'}
            </button>
            <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setEditing(null)} disabled={saving}>
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? <Loader /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Joined</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-ink/60">No customers found.</td></tr>
              )}
              {list.map((u) => (
                <tr key={u._id} className="border-t border-ink/10">
                  <td className="p-3 font-medium">{u.fullName}</td>
                  <td className="p-3">{u.phone}</td>
                  <td className="p-3">{u.email || '-'}</td>
                  <td className="p-3">
                    <span className={`badge ${u.isActive ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/60'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.isPhoneVerified
                      ? <span className="inline-flex items-center gap-1 text-success"><FiCheckCircle /> Yes</span>
                      : <span className="inline-flex items-center gap-1 text-ink/50"><FiXCircle /> No</span>}
                  </td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="btn-ghost py-1 px-2 text-sm inline-flex items-center gap-1"
                      onClick={() => startEdit(u)}
                    >
                      <FiEdit2 /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost py-1 px-2 text-sm text-danger inline-flex items-center gap-1"
                      onClick={() => remove(u)}
                      disabled={deleting === u._id}
                    >
                      <FiTrash2 /> {deleting === u._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
