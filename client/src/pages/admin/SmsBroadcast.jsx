import { useEffect, useState } from 'react';
import { FiSend, FiMessageSquare, FiUsers, FiAlertTriangle, FiCheckCircle, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';

const MAX_LENGTH = 480;

const TEMPLATES = [
  {
    label: 'Brand intro',
    body: 'KITCHENLOVERS 🔥\nQuality kitchen appliances at affordable prices.\nVisit kitchenlovers.store\nHotline: 0551234567',
  },
  {
    label: 'Welcome',
    body: 'Welcome to KITCHENLOVERS 🛒\nShop trusted kitchen essentials today.\nVisit kitchenlovers.store\nHotline: 0551234567',
  },
  {
    label: 'Flash sale',
    body: 'FLASH SALE ⚡\nGet amazing kitchen deals today.\nVisit kitchenlovers.store\nHotline: 0551234567',
  },
];

export default function SmsBroadcast() {
  const [message, setMessage] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyActive, setOnlyActive] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeSubscribers, setIncludeSubscribers] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const requestConfirmation = useConfirm();

  async function loadPreview() {
    setPreviewing(true);
    try {
      const { data } = await api.get('/admin/sms-broadcast/preview', {
        params: { onlyVerified, onlyActive, includeUsers, includeSubscribers },
      });
      setPreview(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load recipient count');
    } finally {
      setPreviewing(false);
    }
  }

  useEffect(() => { loadPreview(); }, [onlyVerified, onlyActive, includeUsers, includeSubscribers]);

  async function submit(e) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Write a message before sending');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      toast.error(`Message exceeds ${MAX_LENGTH} characters`);
      return;
    }
    if (!preview || preview.total === 0) {
      toast.error('No recipients match the selected filters');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send SMS broadcast?',
      message: `This will send the message to ${preview.total} customer${preview.total === 1 ? '' : 's'}. SMS credits will be consumed and delivery cannot be undone.`,
      confirmLabel: `Send to ${preview.total}`,
    });
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post('/admin/sms-broadcast', {
        message: trimmed,
        onlyVerified,
        onlyActive,
        includeUsers,
        includeSubscribers,
      });
      setResult(data.data);
      toast.success(`Sent to ${data.data.sent} of ${data.data.totalRecipients}`);
      setMessage('');
      await loadPreview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  }

  const remaining = MAX_LENGTH - message.length;
  const segments = Math.max(1, Math.ceil((message.length || 1) / 160));

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl inline-flex items-center gap-2">
          <FiMessageSquare className="text-primary" /> SMS Broadcast
        </h1>
        <p className="text-sm text-ink/60 mt-1">
          Send a one-off SMS to every customer account on the platform.
        </p>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-ink/50 mb-1.5 block inline-flex items-center gap-1.5">
            <FiZap className="text-primary" /> Quick templates
          </label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setMessage(t.body)}
                className="text-xs px-3 py-1.5 rounded-full border border-ink/15 hover:border-primary hover:bg-primary/5 transition"
                title={t.body}
              >
                {t.label}
              </button>
            ))}
            {message && (
              <button
                type="button"
                onClick={() => setMessage('')}
                className="text-xs px-3 py-1.5 rounded-full border border-ink/10 text-ink/60 hover:text-danger hover:border-danger/40 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-ink/50 mb-1.5 block">
            Message
          </label>
          <textarea
            className="input min-h-[140px] resize-y"
            placeholder="Hello! We're running a flash sale on kitchenware this weekend — 20% off everything. Reply STOP to opt out."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_LENGTH}
            required
          />
          <div className="flex items-center justify-between mt-1.5 text-xs text-ink/60">
            <span>{segments} SMS segment{segments === 1 ? '' : 's'} per recipient</span>
            <span className={remaining < 40 ? 'text-warning' : ''}>
              {remaining} characters left
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Audience</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 p-3 rounded-md border border-ink/10 cursor-pointer hover:bg-ink/[0.02]">
              <input
                type="checkbox"
                checked={includeUsers}
                onChange={(e) => setIncludeUsers(e.target.checked)}
                className="accent-primary mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Registered customers</span>
                <span className="block text-xs text-ink/60">
                  {preview ? `${preview.userTotal ?? 0} matching` : 'Accounts on the platform'}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 p-3 rounded-md border border-ink/10 cursor-pointer hover:bg-ink/[0.02]">
              <input
                type="checkbox"
                checked={includeSubscribers}
                onChange={(e) => setIncludeSubscribers(e.target.checked)}
                className="accent-primary mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Newsletter subscribers</span>
                <span className="block text-xs text-ink/60">
                  {preview ? `${preview.subscriberTotal ?? 0} phone subscribers` : 'Phones from "Stay Updated" form'}
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Filters (apply to registered customers)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={`flex items-start gap-2 p-3 rounded-md border border-ink/10 cursor-pointer hover:bg-ink/[0.02] ${!includeUsers ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                disabled={!includeUsers}
                className="accent-primary mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Active accounts only</span>
                <span className="block text-xs text-ink/60">Skip disabled customer accounts</span>
              </span>
            </label>
            <label className={`flex items-start gap-2 p-3 rounded-md border border-ink/10 cursor-pointer hover:bg-ink/[0.02] ${!includeUsers ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
                disabled={!includeUsers}
                className="accent-primary mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Phone-verified only</span>
                <span className="block text-xs text-ink/60">Skip unverified phone numbers (recommended)</span>
              </span>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-md bg-canvas border border-ink/10">
          <div className="flex items-center gap-2 text-sm">
            <FiUsers className="text-primary" />
            <span className="font-medium">
              {previewing ? 'Counting recipients…' : (
                <>
                  {preview?.total ?? 0} recipient{preview?.total === 1 ? '' : 's'} will receive this message
                </>
              )}
            </span>
          </div>
          {preview && (
            <p className="text-xs text-ink/55 mt-1">
              {includeUsers && (<>{preview.userTotal ?? 0} customers</>)}
              {includeUsers && includeSubscribers && ' · '}
              {includeSubscribers && (<>{preview.subscriberTotal ?? 0} subscribers</>)}
              {(includeUsers || includeSubscribers) && ' · '}
              deduplicated by phone
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-ink/70 bg-warning/10 border border-warning/30 rounded-md p-3">
          <FiAlertTriangle className="text-warning shrink-0 mt-0.5" />
          <span>
            Broadcasts consume SMS credits and cannot be recalled once dispatched. Double-check
            the message and recipient filters before sending.
          </span>
        </div>

        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-2"
          disabled={sending || !message.trim() || !preview?.total}
        >
          <FiSend /> {sending ? 'Sending…' : `Send broadcast${preview?.total ? ` to ${preview.total}` : ''}`}
        </button>
      </form>

      {result && (
        <div className="card p-5 space-y-2">
          <h2 className="text-lg inline-flex items-center gap-2">
            <FiCheckCircle className="text-success" /> Last broadcast
          </h2>
          <p className="text-sm">
            Sent to <strong>{result.sent}</strong> of {result.totalRecipients} recipients
            {result.failed > 0 && (
              <span className="text-danger"> · {result.failed} failed</span>
            )}
          </p>
          {result.failures?.length > 0 && (
            <details className="text-xs text-ink/65">
              <summary className="cursor-pointer">View first {result.failures.length} failures</summary>
              <ul className="mt-2 space-y-1">
                {result.failures.map((f, i) => (
                  <li key={i} className="font-mono">
                    {f.phone}: {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
