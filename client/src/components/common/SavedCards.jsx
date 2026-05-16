import { useEffect, useState } from 'react';
import { FiCreditCard, FiStar, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { useConfirm } from './ConfirmDialog.jsx';

const BRAND_LABEL = {
  visa: 'Visa', mastercard: 'Mastercard', verve: 'Verve', amex: 'Amex',
};

function brandColor(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('visa')) return 'bg-blue-600';
  if (t.includes('master')) return 'bg-red-600';
  if (t.includes('verve')) return 'bg-emerald-600';
  return 'bg-ink';
}

export default function SavedCards() {
  const [cards, setCards] = useState(null);
  const requestConfirmation = useConfirm();

  async function load() {
    try {
      const { data } = await api.get('/me/payment-methods');
      setCards(data.data || []);
    } catch {
      setCards([]);
    }
  }
  useEffect(() => { load(); }, []);

  async function setDefault(id) {
    try {
      await api.patch(`/me/payment-methods/${id}`, { isDefault: true });
      toast.success('Default card updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  async function remove(card) {
    const confirmed = await requestConfirmation({
      title: 'Remove saved card?',
      message: `Remove ${BRAND_LABEL[card.cardType] || 'card'} ending ${card.last4}?`,
      confirmLabel: 'Remove card',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/me/payment-methods/${card._id}`);
      toast.success('Card removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  if (cards === null) return <p className="text-sm text-ink/50">Loading…</p>;

  if (cards.length === 0) {
    return (
      <p className="text-sm text-ink/60">
        No saved cards yet. After your next successful Paystack purchase, the card is securely tokenized so future checkouts are one tap.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((c) => (
        <div key={c._id} className="border border-ink/10 rounded-lg p-3 flex items-center gap-3">
          <div className={`w-12 h-9 rounded-md ${brandColor(c.cardType)} text-white text-[10px] font-bold flex items-center justify-center uppercase tracking-wider shrink-0`}>
            {BRAND_LABEL[c.cardType] || (c.cardType || 'card').slice(0, 4)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              •••• •••• •••• {c.last4 || '••••'}
              {c.isDefault && <span className="badge bg-primary/10 text-primary ml-2 inline-flex items-center gap-1"><FiCheckCircle /> default</span>}
            </p>
            <p className="text-xs text-ink/60">
              {c.bank ? `${c.bank} · ` : ''}exp {c.expMonth || '••'}/{c.expYear || '••'}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {!c.isDefault && (
              <button onClick={() => setDefault(c._id)} className="btn-ghost p-2 text-sm" aria-label="Set default" title="Set as default">
                <FiStar />
              </button>
            )}
            <button onClick={() => remove(c)} className="btn-ghost p-2 text-sm text-danger" aria-label="Remove" title="Remove">
              <FiTrash2 />
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs text-ink/50 inline-flex items-center gap-1.5">
        <FiCreditCard /> Card details are stored at Paystack — we only keep a reusable authorization token.
      </p>
    </div>
  );
}
