import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FiMapPin, FiCheckSquare, FiCreditCard, FiArrowRight, FiArrowLeft,
  FiTruck, FiZap, FiHome, FiTag, FiX, FiCheck,
} from 'react-icons/fi';
import { placeOrder } from '../store/slices/ordersSlice.js';
import { selectCartSubtotal } from '../store/slices/cartSlice.js';
import { api } from '../services/api.js';
import toast from 'react-hot-toast';
import Empty from '../components/common/Empty.jsx';
import { Chip, ChipRow } from '../components/common/Chips.jsx';
import { fmt } from '../utils/format.js';

const METHOD_ICONS = { standard: FiTruck, express: FiZap, pickup: FiHome };

export default function Checkout() {
  const items = useSelector((s) => s.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'Ghana',
    postalCode: '',
  });

  // Delivery + promo
  const [methods, setMethods] = useState([]);
  const [methodId, setMethodId] = useState('standard');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [pickedAddressId, setPickedAddressId] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // { code, type, discount, freeShipping }
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    api.get('/delivery-methods').then((r) => setMethods(r.data.data));
    api.get('/me/addresses').then((r) => {
      setSavedAddresses(r.data.data || []);
      const def = (r.data.data || []).find((a) => a.isDefault);
      if (def) {
        setPickedAddressId(def._id);
        setShippingAddress({
          fullName: user?.fullName || '',
          phone: user?.phone || '',
          line1: def.line1, line2: def.line2 || '', city: def.city,
          state: def.state || '', country: def.country, postalCode: def.postalCode || '',
        });
      }
    }).catch(() => { /* unauthenticated etc */ });
  }, []); // eslint-disable-line

  if (items.length === 0) return <Empty title="Cart is empty" hint="Add items before checking out." />;

  const currency = items[0]?.product.currency || 'GHS';
  const method = methods.find((m) => m.id === methodId) || methods[0] || { fee: 0, label: 'Standard delivery', etaDays: [3, 5], description: '' };
  const shippingFee = promo?.freeShipping ? 0 : (method.fee || 0);
  const discount = promo?.freeShipping ? 0 : (promo?.discount || 0);
  const total = Math.max(0, subtotal + shippingFee - discount);

  const change = (e) => setShippingAddress({ ...shippingAddress, [e.target.name]: e.target.value });

  function pickSavedAddress(id) {
    setPickedAddressId(id);
    if (id === 'new') return;
    const a = savedAddresses.find((x) => x._id === id);
    if (!a) return;
    setShippingAddress({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      line1: a.line1, line2: a.line2 || '', city: a.city,
      state: a.state || '', country: a.country, postalCode: a.postalCode || '',
    });
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setValidating(true);
    try {
      const { data } = await api.post('/promos/validate', {
        code: promoInput.trim(),
        subtotal,
        shippingFee: method.fee || 0,
      });
      setPromo(data.data);
      toast.success(`Promo ${data.data.code} applied`);
    } catch (err) {
      setPromo(null);
      toast.error(err.response?.data?.message || 'Invalid promo');
    } finally {
      setValidating(false);
    }
  }

  function clearPromo() {
    setPromo(null);
    setPromoInput('');
  }

  async function pay() {
    setBusy(true);
    const payload = {
      items: items.map((i) => ({ product: i.product._id, quantity: i.quantity })),
      shippingAddress,
      deliveryMethod: methodId,
      promoCode: promo?.code,
    };
    const res = await dispatch(placeOrder(payload));
    setBusy(false);
    if (placeOrder.fulfilled.match(res)) {
      const url = res.payload.payment?.authorizationUrl;
      if (url) window.location.href = url;
      else navigate(`/orders/${res.payload.order._id}`);
    } else {
      toast.error(res.payload || 'Order failed');
    }
  }

  const Step = ({ n, label, Icon }) => {
    const done = step > n;
    const current = step === n;
    return (
      <li className="flex items-center gap-2 min-w-0">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
            done ? 'bg-primary text-white' : current ? 'bg-primary/15 text-primary ring-2 ring-primary/30' : 'bg-ink/10 text-ink/50'
          }`}
        >
          {done ? <FiCheck /> : n}
        </span>
        <span className={`text-sm whitespace-nowrap hidden sm:inline ${current || done ? 'text-ink font-medium' : 'text-ink/50'}`}>
          {label}
        </span>
      </li>
    );
  };

  const PickupSelected = methodId === 'pickup';

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <ol className="card px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          <Step n={1} label="Delivery" Icon={FiMapPin} />
          <div className={`flex-1 h-px min-w-[20px] ${step > 1 ? 'bg-primary' : 'bg-ink/10'}`} />
          <Step n={2} label="Review" Icon={FiCheckSquare} />
          <div className={`flex-1 h-px min-w-[20px] ${step > 2 ? 'bg-primary' : 'bg-ink/10'}`} />
          <Step n={3} label="Payment" Icon={FiCreditCard} />
        </ol>

        {step === 1 && (
          <>
            <div className="card p-4 sm:p-5 space-y-3">
              <h2 className="font-semibold text-base sm:text-lg inline-flex items-center gap-2"><FiTruck className="text-primary" /> Delivery method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {methods.map((m) => {
                  const Icon = METHOD_ICONS[m.id] || FiTruck;
                  const active = methodId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethodId(m.id)}
                      className={`text-left p-4 rounded-lg border-2 transition ${active ? 'border-primary bg-primary/5' : 'border-ink/10 hover:border-primary/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`text-xl ${active ? 'text-primary' : 'text-ink/60'}`} />
                        <span className="text-sm font-semibold">{m.fee === 0 ? 'Free' : fmt(m.fee, currency)}</span>
                      </div>
                      <p className="font-semibold mt-2 text-sm">{m.label}</p>
                      <p className="text-xs text-ink/60 mt-0.5">
                        {m.etaDays[0] === m.etaDays[1]
                          ? `${m.etaDays[0]} day${m.etaDays[0] === 1 ? '' : 's'}`
                          : `${m.etaDays[0]}–${m.etaDays[1]} days`}
                      </p>
                      <p className="text-xs text-ink/50 mt-2">{m.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {!PickupSelected && (
              <div className="card p-4 sm:p-5 space-y-3">
                <h2 className="font-semibold text-base sm:text-lg inline-flex items-center gap-2"><FiMapPin className="text-primary" /> Shipping address</h2>

                {savedAddresses.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Use a saved address</p>
                    <ChipRow>
                      {savedAddresses.map((a) => (
                        <Chip key={a._id} active={pickedAddressId === a._id} onClick={() => pickSavedAddress(a._id)}>
                          {a.label || 'Address'} — {a.city}
                        </Chip>
                      ))}
                      <Chip active={pickedAddressId === 'new'} onClick={() => pickSavedAddress('new')}>+ Use a new one</Chip>
                    </ChipRow>
                  </div>
                )}

                <input name="fullName" className="input" placeholder="Full name" value={shippingAddress.fullName} onChange={change} />
                <input name="phone" className="input" placeholder="Phone" value={shippingAddress.phone} onChange={change} />
                <input name="line1" className="input" placeholder="Street address" value={shippingAddress.line1} onChange={change} />
                <input name="line2" className="input" placeholder="Apartment, suite (optional)" value={shippingAddress.line2} onChange={change} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="city" className="input" placeholder="City" value={shippingAddress.city} onChange={change} />
                  <input name="state" className="input" placeholder="Region" value={shippingAddress.state} onChange={change} />
                  <input name="country" className="input" placeholder="Country" value={shippingAddress.country} onChange={change} />
                  <input name="postalCode" className="input" placeholder="Postal code" value={shippingAddress.postalCode} onChange={change} />
                </div>
              </div>
            )}

            <button
              className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              onClick={() => setStep(2)}
              disabled={!PickupSelected && (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.country)}
            >
              Continue <FiArrowRight />
            </button>
          </>
        )}

        {step === 2 && (
          <div className="card p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-base sm:text-lg inline-flex items-center gap-2"><FiCheckSquare className="text-primary" /> Review your order</h2>
            <ul className="divide-y divide-ink/10">
              {items.map((i) => (
                <li key={i.product._id} className="py-2 flex justify-between gap-2 text-sm">
                  <span className="min-w-0"><span className="font-medium">{i.product.name}</span> <span className="text-ink/55">× {i.quantity}</span></span>
                  <span className="font-medium tabular-nums whitespace-nowrap">{fmt(i.product.price * i.quantity, i.product.currency)}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink/10 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{method.label}{!PickupSelected && shippingAddress.city ? ` to ${shippingAddress.city}` : ''}</span>
                <span>{shippingFee === 0 ? 'Free' : fmt(shippingFee, currency)}</span>
              </div>
              {promo && (
                <div className="flex justify-between text-success">
                  <span className="inline-flex items-center gap-1"><FiTag /> {promo.code}</span>
                  <span>−{fmt(promo.freeShipping ? (method.fee || 0) : promo.discount, currency)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button className="btn-outline inline-flex items-center justify-center gap-2 sm:w-auto" onClick={() => setStep(1)}><FiArrowLeft /> Back</button>
              <button className="btn-primary inline-flex items-center justify-center gap-2 flex-1 sm:flex-none" onClick={() => setStep(3)}>Continue to payment <FiArrowRight /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-4 sm:p-5 space-y-4">
            <h2 className="font-semibold text-base sm:text-lg inline-flex items-center gap-2"><FiCreditCard className="text-primary" /> Payment</h2>
            <p className="text-sm text-ink/70">You'll be redirected to Paystack to complete your purchase securely.</p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button className="btn-outline inline-flex items-center justify-center gap-2 sm:w-auto" onClick={() => setStep(2)}><FiArrowLeft /> Back</button>
              <button className="btn-primary inline-flex items-center justify-center gap-2 flex-1 sm:flex-none" disabled={busy} onClick={pay}>
                <FiCreditCard /> {busy ? 'Processing...' : `Pay ${fmt(total, currency)}`}
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="card p-4 sm:p-5 h-fit space-y-2 lg:sticky lg:top-24">
        <h3 className="font-semibold text-base sm:text-lg">Order summary</h3>
        <div className="flex justify-between text-sm"><span>Items ({items.length})</span><span>{fmt(subtotal, currency)}</span></div>
        <div className="flex justify-between text-sm">
          <span>{method.label}</span>
          <span>{shippingFee === 0 ? 'Free' : fmt(shippingFee, currency)}</span>
        </div>

        {/* Promo */}
        <div className="pt-1">
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5 inline-flex items-center gap-1.5"><FiTag /> Promo code</p>
          {promo ? (
            <div className="flex items-center justify-between gap-2 bg-success/10 text-success rounded-md px-3 py-2 text-sm">
              <span className="font-mono font-semibold inline-flex items-center gap-1"><FiCheck /> {promo.code}</span>
              <button onClick={clearPromo} className="text-success/80 hover:text-success" aria-label="Remove promo"><FiX /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="input text-sm"
                placeholder="Enter code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }}
              />
              <button onClick={applyPromo} disabled={validating || !promoInput} className="btn-outline text-sm shrink-0">
                {validating ? '...' : 'Apply'}
              </button>
            </div>
          )}
          {promo && (
            <p className="text-xs text-success mt-1">
              {promo.freeShipping ? 'Free shipping applied' : `−${fmt(promo.discount, currency)} off`}
            </p>
          )}
        </div>

        <div className="border-t border-ink/10 pt-2 flex justify-between font-semibold">
          <span>Total</span><span>{fmt(total, currency)}</span>
        </div>
      </aside>
    </div>
  );
}
