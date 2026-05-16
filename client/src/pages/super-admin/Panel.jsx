import { useEffect, useState } from 'react';
import { FiSettings, FiUserCheck, FiUserPlus, FiPower, FiSave, FiSliders } from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

export default function Panel() {
  const [admins, setAdmins] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdmin, setNewAdmin] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [newSetting, setNewSetting] = useState({ key: '', value: '', isPublic: false });

  async function load() {
    setLoading(true);
    const [a, s] = await Promise.all([api.get('/super-admin/admins'), api.get('/super-admin/settings')]);
    setAdmins(a.data.data);
    setSettings(s.data.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createAdmin(e) {
    e.preventDefault();
    try {
      await api.post('/super-admin/admins', newAdmin);
      toast.success('Admin created');
      setNewAdmin({ fullName: '', phone: '', email: '', password: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  async function saveSetting(e) {
    e.preventDefault();
    let value = newSetting.value;
    try { value = JSON.parse(newSetting.value); } catch { /* keep as string */ }
    await api.put('/super-admin/settings', { key: newSetting.key, value, isPublic: newSetting.isPublic });
    toast.success('Saved');
    setNewSetting({ key: '', value: '', isPublic: false });
    load();
  }

  async function toggleActive(u) {
    await api.patch(`/super-admin/users/${u._id}/active`, { isActive: !u.isActive });
    load();
  }

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl inline-flex items-center gap-2"><FiSettings className="text-primary" /> Super Admin</h1>

      <section className="card p-5">
        <h2 className="text-lg mb-3 inline-flex items-center gap-2"><FiUserCheck className="text-primary" /> Admins</h2>
        <div className="space-y-2 mb-4">
          {admins.map((a) => (
            <div key={a._id} className="flex justify-between items-center text-sm border-b border-ink/10 pb-2">
              <div>
                <p className="font-medium">
                  {a.fullName} <span className="badge bg-primary/10 text-primary ml-1 capitalize">{a.role.replace('_', ' ')}</span>
                </p>
                <p className="text-ink/60">{a.phone} {a.email && `• ${a.email}`}</p>
              </div>
              <button className="btn-outline text-sm py-1 px-3 inline-flex items-center gap-1" onClick={() => toggleActive(a)}>
                <FiPower /> {a.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={createAdmin} className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Full name" value={newAdmin.fullName} onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })} required />
          <input className="input" placeholder="Phone" value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} required />
          <input className="input" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required minLength={8} />
          <button className="btn-primary col-span-2 inline-flex items-center justify-center gap-2">
            <FiUserPlus /> Create admin
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-lg mb-3 inline-flex items-center gap-2"><FiSliders className="text-primary" /> Settings</h2>
        <ul className="text-sm space-y-1 mb-4">
          {settings.map((s) => (
            <li key={s._id} className="border-b border-ink/10 py-1">
              <span className="font-medium">{s.key}</span> {s.isPublic && <span className="badge bg-success/10 text-success ml-2">public</span>}
              <pre className="text-xs bg-canvas p-2 mt-1 rounded">{JSON.stringify(s.value, null, 2)}</pre>
            </li>
          ))}
        </ul>
        <form onSubmit={saveSetting} className="space-y-2">
          <input className="input" placeholder="Setting key (e.g. shipping.fee)" value={newSetting.key} onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })} required />
          <textarea className="input" rows={3} placeholder='Value (JSON or string, e.g. {"amount":500})' value={newSetting.value} onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })} required />
          <label className="text-sm flex gap-2 items-center">
            <input type="checkbox" checked={newSetting.isPublic} onChange={(e) => setNewSetting({ ...newSetting, isPublic: e.target.checked })} />
            Public (visible to storefront)
          </label>
          <button className="btn-primary inline-flex items-center gap-2">
            <FiSave /> Save setting
          </button>
        </form>
      </section>
    </div>
  );
}
