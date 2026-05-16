import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiPackage, FiMapPin, FiClock, FiRotateCcw, FiX, FiSend, FiTruck, FiDownload, FiArrowLeft, FiHome, FiActivity, FiPhone, FiMessageSquare, FiUser, FiNavigation } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { fetchOrder } from '../store/slices/ordersSlice.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import Loader from '../components/common/Loader.jsx';
import TrackingTimeline from '../components/common/TrackingTimeline.jsx';
import { Chip, ChipRow } from '../components/common/Chips.jsx';
import { fmt } from '../utils/format.js';

const REFUNDABLE = ['dispatched', 'in_transit', 'delivered'];

const REASONS = [
  { value: 'damaged', label: 'Damaged item' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'delayed', label: 'Delivery too late' },
  { value: 'other', label: 'Other' },
];

const REFUND_STATUS_BADGE = {
  pending: 'bg-ink/10 text-ink',
  approved: 'bg-accent/10 text-accent',
  rejected: 'bg-danger/10 text-danger',
  processed: 'bg-success/10 text-success',
};

function RefundModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState('damaged');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit({ reason, description }); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} className="card p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg">Request a refund</h2>
            <p className="text-sm text-ink/60">Order {order.orderNumber}</p>
          </div>
          <button type="button" className="btn-ghost p-1" onClick={onClose}><FiX /></button>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Reason</p>
          <ChipRow>
            {REASONS.map((r) => (
              <Chip key={r.value} active={reason === r.value} onClick={() => setReason(r.value)}>{r.label}</Chip>
            ))}
          </ChipRow>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Description</p>
          <textarea
            className="input"
            rows={4}
            placeholder="Tell us what happened so we can help quickly..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <p className="text-xs text-ink/60">
          Our team typically responds within one business day.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={busy}>
            <FiSend /> {busy ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const order = useSelector((s) => s.orders.current);
  const [refunds, setRefunds] = useState([]);
  const [showModal, setShowModal] = useState(false);

  function goBack() {
    // Prefer the actual previous page; fall back to the orders list, then home.
    if (window.history.length > 1) navigate(-1);
    else navigate('/orders');
  }

  useEffect(() => { dispatch(fetchOrder(id)); }, [dispatch, id]);

  useEffect(() => {
    api.get('/refunds/mine').then((r) => {
      setRefunds((r.data.data || []).filter((x) => x.order === id || x.order?._id === id));
    }).catch(() => {});
  }, [id]);

  // Live updates: when admin changes the order status or refund status, refresh in place.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onOrder = (payload) => {
      if (payload?.orderId === id) {
        dispatch(fetchOrder(id));
        toast.success(`Order is now ${payload.status.replace('_', ' ')}`);
      }
    };
    const onRefund = (payload) => {
      if (payload?.orderId === id) {
        api.get('/refunds/mine')
          .then((r) => setRefunds((r.data.data || []).filter((x) => x.order === id || x.order?._id === id)))
          .catch(() => {});
        toast.success(`Refund ${payload.status}`);
      }
    };
    socket.on('order:updated', onOrder);
    socket.on('refund:updated', onRefund);
    return () => {
      socket.off('order:updated', onOrder);
      socket.off('refund:updated', onRefund);
    };
  }, [dispatch, id]);

  if (!order || order._id !== id) return <Loader />;

  async function submitRefund({ reason, description }) {
    try {
      const { data } = await api.post('/refunds', { orderId: id, reason, description });
      setRefunds((r) => [data.data, ...r]);
      setShowModal(false);
      toast.success('Refund request sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  }

  const eligibleForRefund = REFUNDABLE.includes(order.status) && refunds.every((r) => r.status === 'rejected');
  const receiptEligible = ['paid', 'processing', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned', 'refunded'].includes(order.status);

  async function downloadReceipt() {
    try {
      const res = await api.get(`/orders/${order._id}/receipt`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = (res.headers['content-type'] || '').includes('pdf') ? 'pdf' : 'txt';
      a.download = `receipt-${order.orderNumber}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not download receipt');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm py-1.5 px-2"
        >
          <FiArrowLeft /> Back
        </button>
        <Link
          to="/"
          className="btn-ghost inline-flex items-center gap-1.5 text-sm py-1.5 px-2 no-underline"
        >
          <FiHome /> Home
        </Link>
      </div>

      <header className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold inline-flex items-center gap-2 break-all">
            <FiPackage className="text-primary shrink-0" />
            <span>Order {order.orderNumber}</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink/60 mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
          {order.deliveryMethod && (
            <p className="text-xs text-ink/60 mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <FiTruck className="shrink-0" /> {order.deliveryMethod.replace('_', ' ')}
              {order.deliveryEtaDays && (
                <span className="text-ink/50">· ETA {order.deliveryEtaDays[0]}–{order.deliveryEtaDays[1]} day(s)</span>
              )}
            </p>
          )}
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <span className="badge-primary capitalize">{order.status.replace('_', ' ')}</span>
          {receiptEligible && (
            <button onClick={downloadReceipt} className="btn-outline text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
              <FiDownload /> Receipt
            </button>
          )}
        </div>
      </header>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base sm:text-lg inline-flex items-center gap-2">
            <FiActivity className="text-primary" /> Tracking
          </h2>
          <span className="text-[11px] inline-flex items-center gap-1.5 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
          </span>
        </div>
        <TrackingTimeline status={order.status} history={order.history} />

        {(order.assignedRider || order.estimatedArrival || order.lastLocation?.lat || order.dispatchedAt) && (
          <div className="mt-5 pt-5 border-t border-ink/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rider card */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FiUser />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Your rider</p>
                {order.assignedRider ? (
                  <>
                    <p className="font-semibold mt-0.5 truncate">{order.assignedRider.fullName}</p>
                    <p className="text-xs text-ink/60">{order.assignedRider.phone}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.assignedRider.phone && (
                        <a
                          href={`tel:${order.assignedRider.phone}`}
                          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 no-underline"
                        >
                          <FiPhone /> Call
                        </a>
                      )}
                      {order.assignedRider.phone && (
                        <a
                          href={`https://wa.me/${order.assignedRider.phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 no-underline"
                        >
                          <FiMessageSquare /> WhatsApp
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink/55 mt-1">A rider will be assigned once your order is packed.</p>
                )}
              </div>
            </div>

            {/* Dispatch / ETA / location card */}
            <div className="rounded-lg bg-canvas border border-ink/10 p-4 space-y-2.5">
              <p className="text-[10px] uppercase tracking-wider text-ink/55 font-semibold">Delivery details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-ink/55">Dispatch time</p>
                  <p className="font-medium">
                    {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink/55">Estimated arrival</p>
                  <p className="font-medium">
                    {order.estimatedArrival ? new Date(order.estimatedArrival).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              {order.lastLocation?.lat ? (
                <div className="pt-2 border-t border-ink/10">
                  <p className="text-[11px] text-ink/55">Last reported location</p>
                  <a
                    href={`https://www.google.com/maps?q=${order.lastLocation.lat},${order.lastLocation.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary inline-flex items-center gap-1.5 no-underline"
                  >
                    <FiNavigation /> Open in Maps
                  </a>
                  <p className="text-[11px] text-ink/55 mt-0.5">
                    Updated {new Date(order.lastLocation.at).toLocaleTimeString()}
                    {order.lastLocation.note && ` · ${order.lastLocation.note}`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink/45 pt-2 border-t border-ink/10">
                  Location updates will appear here once your rider is on the way.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="font-semibold text-base sm:text-lg mb-3">Items</h2>
        <ul className="divide-y divide-ink/10">
          {order.items.map((i) => (
            <li key={i.product} className="py-2 flex justify-between gap-2 text-sm">
              <span className="min-w-0 break-words"><span className="font-medium">{i.name}</span> <span className="text-ink/55">× {i.quantity}</span></span>
              <span className="font-medium tabular-nums whitespace-nowrap">{fmt(i.subtotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-ink/10 mt-3 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{fmt(order.subtotal, order.currency)}</span></div>
          <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{order.shippingFee === 0 ? 'Free' : fmt(order.shippingFee, order.currency)}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span>
              <span>−{fmt(order.discount, order.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t border-ink/10">
            <span>Total</span><span>{fmt(order.total, order.currency)}</span>
          </div>
        </div>
      </section>

      {refunds.length > 0 && (
        <section className="card p-4 sm:p-5">
          <h2 className="font-semibold text-base sm:text-lg mb-3 inline-flex items-center gap-2"><FiRotateCcw className="text-primary" /> Refund history</h2>
          <ul className="space-y-2">
            {refunds.map((r) => (
              <li key={r._id} className="border border-ink/10 rounded-md p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`badge ${REFUND_STATUS_BADGE[r.status]}`}>{r.status}</span>
                  <span className="text-xs text-ink/50">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm mt-1 capitalize">{r.reason.replace('_', ' ')}{r.description && ` — ${r.description}`}</p>
                {r.adminNote && <p className="text-xs text-ink/70 mt-1 border-l-2 border-primary pl-2"><b>Reply:</b> {r.adminNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {eligibleForRefund && (
        <section className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-primary/20">
          <div>
            <p className="font-semibold">Something wrong with your order?</p>
            <p className="text-sm text-ink/60">Request a refund and our team will get back within a business day.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto">
            <FiRotateCcw /> Request refund
          </button>
        </section>
      )}

      <section className="card p-4 sm:p-5">
        <h2 className="font-semibold text-base sm:text-lg mb-3 inline-flex items-center gap-2"><FiMapPin className="text-primary" /> Shipping address</h2>
        <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
        <p className="text-sm text-ink/65">{order.shippingAddress.phone}</p>
        <p className="text-sm text-ink/70 mt-1">
          {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
        </p>
        <p className="text-sm text-ink/70">
          {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}, {order.shippingAddress.country}
        </p>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="font-semibold text-base sm:text-lg mb-3 inline-flex items-center gap-2"><FiClock className="text-primary" /> Status history</h2>
        <ol className="space-y-2.5">
          {order.history.map((h, idx) => (
            <li key={idx} className="text-sm flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
              <span className="capitalize font-medium">
                {h.status.replace('_', ' ')}
                {h.note && <span className="font-normal text-ink/65"> — {h.note}</span>}
              </span>
              <span className="text-xs text-ink/50 shrink-0">{new Date(h.at).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </section>

      {showModal && <RefundModal order={order} onClose={() => setShowModal(false)} onSubmit={submitRefund} />}
    </div>
  );
}
