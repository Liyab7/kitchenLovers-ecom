import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiEdit2, FiTrash2, FiPlus, FiCheck, FiX,
  FiCreditCard, FiBell, FiPackage, FiHeart, FiRotateCcw, FiArrowRight,
} from 'react-icons/fi';
import SavedCards from '../components/common/SavedCards.jsx';
import PushOptIn from '../components/common/PushOptIn.jsx';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import { fetchMe } from '../store/slices/authSlice.js';
import { Field } from '../components/common/FormField.jsx';
import Loader from '../components/common/Loader.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

const emptyAddress = { label: 'Home', line1: '', line2: '', city: '', state: '', country: 'Ghana', postalCode: '', isDefault: false };

function AddressForm({ initial, onCancel, onSave, saving }) {
  const [form, setForm] = useState(initial);
  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      className="card p-4 space-y-3 border border-primary/30"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Label (Home, Work)" value={form.label} onChange={change('label')} />
        <input className="input" placeholder="Country" value={form.country} onChange={change('country')} required />
      </div>
      <input className="input" placeholder="Street address" value={form.line1} onChange={change('line1')} required />
      <input className="input" placeholder="Apartment, suite (optional)" value={form.line2} onChange={change('line2')} />
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="input" placeholder="City" value={form.city} onChange={change('city')} required />
        <input className="input" placeholder="Region/State" value={form.state} onChange={change('state')} />
        <input className="input" placeholder="Postal code" value={form.postalCode} onChange={change('postalCode')} />
      </div>
      <label className="text-sm inline-flex items-center gap-2">
        <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-primary" />
        Use as default delivery address
      </label>
      <div className="flex gap-2">
        <button className="btn-primary inline-flex items-center gap-2" disabled={saving} type="submit">
          <FiSave /> {saving ? 'Saving...' : 'Save address'}
        </button>
        <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={onCancel}>
          <FiX /> Cancel
        </button>
      </div>
    </form>
  );
}

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [profile, setProfile] = useState({ fullName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [addresses, setAddresses] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | <id> | null
  const [saving, setSaving] = useState(false);
  const requestConfirmation = useConfirm();

  useEffect(() => {
    if (user) setProfile({ fullName: user.fullName || '', email: user.email || '' });
  }, [user]);

  useEffect(() => {
    api.get('/me/addresses').then((r) => setAddresses(r.data.data));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/me/profile', profile);
      await dispatch(fetchMe());
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAddress(form) {
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const { data } = isNew
        ? await api.post('/me/addresses', form)
        : await api.put(`/me/addresses/${editing}`, form);
      setAddresses(data.data);
      toast.success(isNew ? 'Address added' : 'Address updated');
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(address) {
    const confirmed = await requestConfirmation({
      title: 'Delete address?',
      message: `Delete the "${address.label || 'Delivery'}" address?`,
      confirmLabel: 'Delete address',
    });
    if (!confirmed) return;
    try {
      const { data } = await api.delete(`/me/addresses/${address._id}`);
      setAddresses(data.data);
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  if (!user) return <Loader />;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-extrabold inline-flex items-center gap-2"><FiUser className="text-primary" /> My account</h1>

      {/* Quick links — most-used customer actions */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { to: '/orders', label: 'My orders', Icon: FiPackage },
          { to: '/wishlist', label: 'Wishlist', Icon: FiHeart },
          { to: '/refunds', label: 'Refunds', Icon: FiRotateCcw },
        ].map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 no-underline text-ink hover:shadow-md hover:-translate-y-0.5 transition flex flex-col items-start gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon />
            </div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-[11px] text-primary inline-flex items-center gap-1">View <FiArrowRight className="text-[10px]" /></p>
          </Link>
        ))}
      </section>

      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-lg">Account details</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field icon={FiUser} label="Full name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} required />
          <Field icon={FiMail} type="email" label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="you@example.com" />
          <div className="text-sm text-ink/60 inline-flex items-center gap-2">
            <FiPhone /> {user.phone}
            <span className="badge bg-success/10 text-success ml-1 inline-flex items-center gap-1"><FiCheck /> verified</span>
          </div>
          <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={savingProfile}>
            <FiSave /> {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg inline-flex items-center gap-2"><FiMapPin className="text-primary" /> Delivery addresses</h2>
          {editing !== 'new' && (
            <button onClick={() => setEditing('new')} className="btn-outline inline-flex items-center gap-2 text-sm">
              <FiPlus /> Add address
            </button>
          )}
        </div>

        {addresses === null ? (
          <Loader />
        ) : (
          <div className="space-y-3">
            {editing === 'new' && (
              <AddressForm initial={emptyAddress} onCancel={() => setEditing(null)} onSave={saveAddress} saving={saving} />
            )}

            {addresses.length === 0 && editing !== 'new' && (
              <p className="text-sm text-ink/60">No addresses saved. Add one to speed up checkout.</p>
            )}

            {addresses.map((a) => (
              editing === a._id ? (
                <AddressForm key={a._id} initial={a} onCancel={() => setEditing(null)} onSave={saveAddress} saving={saving} />
              ) : (
                <div key={a._id} className="border border-ink/10 rounded-lg p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium inline-flex items-center gap-2">
                      {a.label}
                      {a.isDefault && <span className="badge bg-primary/10 text-primary">default</span>}
                    </p>
                    <p className="text-sm text-ink/70 mt-1">
                      {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                      {a.city}{a.state ? `, ${a.state}` : ''}{a.postalCode ? ` ${a.postalCode}` : ''}<br />
                      {a.country}
                    </p>
                  </div>
                  <div className="shrink-0 space-x-1">
                    <button className="btn-ghost p-2" onClick={() => setEditing(a._id)} aria-label="Edit"><FiEdit2 /></button>
                    <button className="btn-ghost p-2 text-danger" onClick={() => removeAddress(a)} aria-label="Delete"><FiTrash2 /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-lg inline-flex items-center gap-2"><FiCreditCard className="text-primary" /> Saved payment methods</h2>
        <SavedCards />
      </section>

      <section className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-lg inline-flex items-center gap-2"><FiBell className="text-primary" /> Notifications</h2>
        <PushOptIn />
      </section>
    </div>
  );
}
