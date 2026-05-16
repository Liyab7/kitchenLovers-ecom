import { useCallback, useEffect, useState } from 'react';
import {
  FiTruck, FiUser, FiPhone, FiMessageSquare, FiMapPin, FiNavigation,
  FiRefreshCw, FiPackage, FiCheck, FiX, FiSend,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import Loader from '../../components/common/Loader.jsx';
import Empty from '../../components/common/Empty.jsx';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';

const STATUS_TONE = {
  paid: 'badge bg-accent/10 text-accent',
  processing: 'badge bg-accent/10 text-accent',
  packed: 'badge-primary',
  dispatched: 'badge bg-amber-100 text-amber-700',
  in_transit: 'badge bg-amber-100 text-amber-700',
  delivered: 'badge-success',
};

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'all', label: 'All' },
];

export default function RiderDeliveries() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('active');
  const [modal, setModal] = useState(null); // { order, lat, lng, note, status }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/deliveries/mine');
    setList(data.data || []);
  }, []);

  useEffect(() => { load().catch(() => setList([])); }, [load]);

  // Live: refresh when any delivery the rider is on changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const refresh = () => load().catch(() => {});
    socket.on('order:updated', refresh);
    socket.on('delivery:assigned', refresh);
    return () => {
      socket.off('order:updated', refresh);
      socket.off('delivery:assigned', refresh);
    };
  }, [load]);

  if (list === null) return <Loader />;

  const filtered = (() => {
    if (filter === 'all') return list;
    if (filter === 'active') return list.filter((o) => ['paid', 'processing', 'packed', 'dispatched', 'in_transit'].includes(o.status));
    return list.filter((o) => o.status === filter);
  })();

  function openLocationModal(order) {
    setModal({
      order,
      lat: '',
      lng: '',
      note: '',
      status: '',
    });
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setModal((m) => m && ({ ...m, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })),
      (err) => toast.error(err.message || 'Could not read location'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function quickStatus(order, status) {
    try {
      await api.post(`/deliveries/${order._id}/location`, { status });
      toast.success(`Marked ${status.replace('_', ' ')}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  }

  async function submitLocation(e) {
    e.preventDefault();
    if (!modal?.order) return;
    setSaving(true);
    try {
      await api.post(`/deliveries/${modal.order._id}/location`, {
        lat: modal.lat ? Number(modal.lat) : undefined,
        lng: modal.lng ? Number(modal.lng) : undefined,
        note: modal.note || undefined,
        status: modal.status || undefined,
      });
      toast.success('Update sent · customer notified');
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
            <FiTruck className="text-primary" /> My deliveries
          </h1>
          <p className="text-sm text-ink/55 mt-1">Update location and status as you go — the customer sees it live.</p>
        </div>
        <button onClick={load} className="btn-outline inline-flex items-center gap-2 text-sm py-1.5">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</Chip>
        ))}
      </ChipRow>

      {filtered.length === 0 ? (
        <Empty
          icon={FiPackage}
          title={filter === 'active' ? 'No active deliveries' : 'No deliveries here'}
          hint="Once an admin assigns you to an order it'll appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const phone = o.user?.phone?.replace(/[^\d+]/g, '');
            const wa = phone ? `https://wa.me/${phone.replace(/^\+/, '')}` : null;
            return (
              <article key={o._id} className="card p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold inline-flex items-center gap-2 flex-wrap">
                      {o.orderNumber}
                      <span className={`${STATUS_TONE[o.status] || 'badge-muted'} capitalize`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p className="text-xs text-ink/55 mt-0.5">
                      {o.user?.fullName} · {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {phone && (
                    <div className="flex gap-2 shrink-0">
                      <a href={`tel:${phone}`} className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 no-underline">
                        <FiPhone /> Call
                      </a>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 no-underline">
                          <FiMessageSquare /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-canvas border border-ink/8 p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-wider text-ink/55 font-semibold mb-1">Deliver to</p>
                  <p className="font-medium">{o.shippingAddress?.fullName}</p>
                  <p className="text-ink/65">{o.shippingAddress?.line1}{o.shippingAddress?.line2 ? `, ${o.shippingAddress.line2}` : ''}</p>
                  <p className="text-ink/65">
                    {o.shippingAddress?.city}{o.shippingAddress?.state ? `, ${o.shippingAddress.state}` : ''}, {o.shippingAddress?.country}
                  </p>
                  <p className="text-xs text-ink/55 mt-1">{o.shippingAddress?.phone}</p>
                </div>

                {o.lastLocation?.lat && (
                  <div className="text-xs text-ink/60 inline-flex items-center gap-1.5">
                    <FiMapPin /> Last reported: {o.lastLocation.lat.toFixed(5)}, {o.lastLocation.lng.toFixed(5)}
                    <a
                      href={`https://www.google.com/maps?q=${o.lastLocation.lat},${o.lastLocation.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 no-underline"
                    >
                      <FiNavigation /> Open
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => openLocationModal(o)} className="btn-outline text-sm py-1.5 inline-flex items-center gap-1.5">
                    <FiMapPin /> Update location
                  </button>
                  {o.status === 'dispatched' && (
                    <button onClick={() => quickStatus(o, 'in_transit')} className="btn-outline text-sm py-1.5 inline-flex items-center gap-1.5">
                      <FiTruck /> Mark in transit
                    </button>
                  )}
                  {(o.status === 'dispatched' || o.status === 'in_transit') && (
                    <button onClick={() => quickStatus(o, 'delivered')} className="btn-primary text-sm py-1.5 inline-flex items-center gap-1.5">
                      <FiCheck /> Mark delivered
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <form
            onSubmit={submitLocation}
            onClick={(e) => e.stopPropagation()}
            className="card p-5 w-full max-w-md space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-lg">Push delivery update</h2>
                <p className="text-xs text-ink/55">{modal.order.orderNumber}</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="btn-ghost p-1"><FiX /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Latitude</p>
                <input type="number" step="any" className="input" value={modal.lat} onChange={(e) => setModal({ ...modal, lat: e.target.value })} placeholder="5.6037" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Longitude</p>
                <input type="number" step="any" className="input" value={modal.lng} onChange={(e) => setModal({ ...modal, lng: e.target.value })} placeholder="-0.1870" />
              </div>
            </div>
            <button type="button" onClick={useBrowserLocation} className="btn-ghost text-xs inline-flex items-center gap-1.5">
              <FiNavigation /> Use my current location
            </button>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Status (optional)</p>
              <select className="input" value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                <option value="">No status change</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold mb-1">Note (optional)</p>
              <input className="input" value={modal.note} onChange={(e) => setModal({ ...modal, note: e.target.value })} placeholder="e.g. 5 minutes away" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                <FiSend /> {saving ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
