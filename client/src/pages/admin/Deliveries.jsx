import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiTruck, FiUser, FiMapPin, FiNavigation, FiSend, FiPhone,
  FiMessageSquare, FiRefreshCw, FiSave, FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import Loader from '../../components/common/Loader.jsx';
import Empty from '../../components/common/Empty.jsx';

const STATUS_TONE = {
  paid: 'badge bg-accent/10 text-accent',
  processing: 'badge bg-accent/10 text-accent',
  packed: 'badge-primary',
  dispatched: 'badge bg-amber-100 text-amber-700',
  in_transit: 'badge bg-amber-100 text-amber-700',
  delivered: 'badge-success',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function mapsLink(loc) {
  if (!loc?.lat || !loc?.lng) return null;
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

export default function AdminDeliveries() {
  const [list, setList] = useState(null);
  const [riders, setRiders] = useState([]);
  const [editing, setEditing] = useState(null); // orderId being edited
  const [form, setForm] = useState({ riderId: '', estimatedArrival: '' });
  const [locForm, setLocForm] = useState({ orderId: '', lat: '', lng: '', note: '', status: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [d, r] = await Promise.all([
      api.get('/deliveries/active'),
      api.get('/deliveries/riders'),
    ]);
    setList(d.data.data || []);
    setRiders(r.data.data || []);
  }, []);

  useEffect(() => { load().catch(() => setList([])); }, [load]);

  // Live: any delivery event refreshes the list.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const refresh = () => load().catch(() => {});
    socket.on('delivery:assigned', refresh);
    socket.on('delivery:location', refresh);
    socket.on('order:status', refresh);
    return () => {
      socket.off('delivery:assigned', refresh);
      socket.off('delivery:location', refresh);
      socket.off('order:status', refresh);
    };
  }, [load]);

  const counts = useMemo(() => {
    const total = list?.length || 0;
    const assigned = (list || []).filter((o) => o.assignedRider).length;
    const enRoute = (list || []).filter((o) => o.status === 'dispatched' || o.status === 'in_transit').length;
    return { total, assigned, unassigned: total - assigned, enRoute };
  }, [list]);

  function startAssign(order) {
    setEditing(order._id);
    setForm({
      riderId: order.assignedRider?._id || '',
      estimatedArrival: order.estimatedArrival
        ? new Date(order.estimatedArrival).toISOString().slice(0, 16)
        : '',
    });
  }

  async function submitAssign(orderId) {
    setSaving(true);
    try {
      await api.patch(`/deliveries/${orderId}/assign`, {
        riderId: form.riderId || null,
        estimatedArrival: form.estimatedArrival ? new Date(form.estimatedArrival).toISOString() : undefined,
      });
      toast.success('Rider assigned');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign rider');
    } finally {
      setSaving(false);
    }
  }

  async function submitLocation(e) {
    e.preventDefault();
    if (!locForm.orderId) return;
    setSaving(true);
    try {
      await api.post(`/deliveries/${locForm.orderId}/location`, {
        lat: locForm.lat ? Number(locForm.lat) : undefined,
        lng: locForm.lng ? Number(locForm.lng) : undefined,
        note: locForm.note || undefined,
        status: locForm.status || undefined,
      });
      toast.success('Location updated · customer notified');
      setLocForm({ orderId: '', lat: '', lng: '', note: '', status: '' });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update location');
    } finally {
      setSaving(false);
    }
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocForm((f) => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })),
      (err) => toast.error(err.message || 'Could not read location'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  if (list === null) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
            <FiTruck className="text-primary" /> Delivery management
          </h1>
          <p className="text-sm text-ink/55 mt-1">Assign riders, update delivery status, and follow live locations.</p>
        </div>
        <button onClick={load} className="btn-outline inline-flex items-center gap-2 text-sm py-1.5">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Active" value={counts.total} tone="primary" />
        <Stat label="Assigned" value={counts.assigned} tone="success" />
        <Stat label="Unassigned" value={counts.unassigned} tone="danger" />
        <Stat label="En route" value={counts.enRoute} tone="accent" />
      </div>

      {list.length === 0 ? (
        <Empty icon={FiTruck} title="No active deliveries" hint="Deliveries appear here once orders are paid and need to ship." />
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const rider = o.assignedRider;
            const isEditing = editing === o._id;
            const gmaps = mapsLink(o.lastLocation);
            const phone = o.user?.phone?.replace(/[^\d+]/g, '');
            const wa = phone ? `https://wa.me/${phone.replace(/^\+/, '')}` : null;
            return (
              <article key={o._id} className="card overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base">{o.orderNumber}</p>
                        <span className={`${STATUS_TONE[o.status] || 'badge-muted'} capitalize`}>{o.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-ink/55 mt-0.5">
                        {o.user?.fullName} · {new Date(o.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {phone && (
                        <>
                          <a href={`tel:${phone}`} className="btn-outline text-xs py-1.5 inline-flex items-center gap-1.5 no-underline">
                            <FiPhone /> Call
                          </a>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer" className="btn-outline text-xs py-1.5 inline-flex items-center gap-1.5 no-underline">
                              <FiMessageSquare /> WhatsApp
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">Deliver to</p>
                      <p className="font-medium">{o.shippingAddress.fullName}</p>
                      <p className="text-ink/65 text-xs">{o.shippingAddress.line1}, {o.shippingAddress.city}</p>
                      <p className="text-ink/55 text-xs">{o.shippingAddress.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">Rider</p>
                      {rider ? (
                        <>
                          <p className="font-medium inline-flex items-center gap-1.5"><FiUser className="text-primary" /> {rider.fullName}</p>
                          <p className="text-ink/65 text-xs">{rider.phone}</p>
                        </>
                      ) : (
                        <p className="text-ink/45 italic">Not assigned</p>
                      )}
                      {o.estimatedArrival && (
                        <p className="text-xs text-ink/55 mt-1">ETA {new Date(o.estimatedArrival).toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">Last location</p>
                      {o.lastLocation?.lat ? (
                        <>
                          <p className="font-mono text-xs">{o.lastLocation.lat.toFixed(5)}, {o.lastLocation.lng.toFixed(5)}</p>
                          <a href={gmaps} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 no-underline mt-0.5">
                            <FiNavigation /> Open in Maps · {timeAgo(o.lastLocation.at)}
                          </a>
                        </>
                      ) : (
                        <p className="text-ink/45 italic">No location yet</p>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 border-t border-ink/10 pt-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Rider</p>
                          <select
                            className="input"
                            value={form.riderId}
                            onChange={(e) => setForm({ ...form, riderId: e.target.value })}
                          >
                            <option value="">— Unassign —</option>
                            {riders.map((r) => (
                              <option key={r._id} value={r._id}>{r.fullName} · {r.phone}</option>
                            ))}
                          </select>
                          {riders.length === 0 && (
                            <p className="text-[11px] text-danger mt-1">
                              No riders registered. Create a user account with role=rider first.
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Estimated arrival</p>
                          <input
                            type="datetime-local"
                            className="input"
                            value={form.estimatedArrival}
                            onChange={(e) => setForm({ ...form, estimatedArrival: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => submitAssign(o._id)} disabled={saving} className="btn-primary inline-flex items-center gap-2">
                          <FiSave /> {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-ghost">
                          <FiX /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => startAssign(o)} className="btn-outline text-sm py-1.5 inline-flex items-center gap-1.5">
                        <FiUser /> {rider ? 'Re-assign' : 'Assign rider'}
                      </button>
                      <button
                        onClick={() => setLocForm({ orderId: o._id, lat: '', lng: '', note: '', status: '' })}
                        className="btn-outline text-sm py-1.5 inline-flex items-center gap-1.5"
                      >
                        <FiMapPin /> Push location
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Location push modal */}
      {locForm.orderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setLocForm({ orderId: '', lat: '', lng: '', note: '', status: '' })}>
          <form
            onSubmit={submitLocation}
            onClick={(e) => e.stopPropagation()}
            className="card p-5 w-full max-w-md space-y-3"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-lg">Push delivery update</h2>
              <button type="button" className="btn-ghost p-1" onClick={() => setLocForm({ orderId: '', lat: '', lng: '', note: '', status: '' })}>
                <FiX />
              </button>
            </div>
            <p className="text-xs text-ink/55">The customer will be notified in real time.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Latitude</p>
                <input type="number" step="any" className="input" value={locForm.lat} onChange={(e) => setLocForm({ ...locForm, lat: e.target.value })} placeholder="5.6037" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Longitude</p>
                <input type="number" step="any" className="input" value={locForm.lng} onChange={(e) => setLocForm({ ...locForm, lng: e.target.value })} placeholder="-0.1870" />
              </div>
            </div>
            <button type="button" onClick={useBrowserLocation} className="btn-ghost text-xs inline-flex items-center gap-1.5">
              <FiNavigation /> Use my current location
            </button>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Update status (optional)</p>
              <select className="input" value={locForm.status} onChange={(e) => setLocForm({ ...locForm, status: e.target.value })}>
                <option value="">No status change</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Note</p>
              <input className="input" value={locForm.note} onChange={(e) => setLocForm({ ...locForm, note: e.target.value })} placeholder="e.g. 5 minutes away" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-outline" onClick={() => setLocForm({ orderId: '', lat: '', lng: '', note: '', status: '' })}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                <FiSend /> {saving ? 'Sending…' : 'Send update'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'primary' }) {
  const tones = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', danger: 'bg-danger/10 text-danger', accent: 'bg-accent/10 text-accent' };
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-[10px] uppercase tracking-wider text-ink/55 font-semibold">{label}</p>
      <p className={`text-xl sm:text-2xl font-extrabold mt-1 tabular-nums inline-flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${tones[tone].split(' ')[0]}`} />
        {value}
      </p>
    </div>
  );
}
