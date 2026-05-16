import { useEffect, useState } from 'react';
import { FiBell, FiBellOff, FiCheckCircle, FiSend } from 'react-icons/fi';
import { api } from '../../services/api.js';
import toast from 'react-hot-toast';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({ publicKey: '', enabled: false });

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.pushManager?.getSubscription().then((sub) => setSubscribed(!!sub));
      });
    }
    api.get('/push/public-key').then((r) => setConfig(r.data.data || {})).catch(() => {});
  }, []);

  async function enable() {
    if (!supported) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('Notifications permission denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      if (!config.publicKey) {
        toast('Subscribed locally. Set VAPID keys on the server to enable real push delivery.');
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: config.publicKey ? urlBase64ToUint8Array(config.publicKey) : undefined,
      });
      const json = sub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });
      setSubscribed(true);
      toast.success('Notifications enabled');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not enable notifications');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Notifications turned off');
    } catch (err) {
      toast.error('Failed to disable');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    try {
      const { data } = await api.post('/push/test');
      if (data.data?.stub) toast('Sent (stub mode — install web-push + VAPID env to deliver to browser).');
      else toast.success(`Test sent to ${data.data?.sent} device(s)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-ink/60 inline-flex items-center gap-2">
        <FiBellOff /> Push notifications aren't supported in this browser.
      </p>
    );
  }

  if (subscribed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-success inline-flex items-center gap-2">
          <FiCheckCircle /> Push notifications are on for this device.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={sendTest} className="btn-outline text-sm inline-flex items-center gap-2"><FiSend /> Send test</button>
          <button onClick={disable} disabled={busy} className="btn-ghost text-sm inline-flex items-center gap-2 text-danger"><FiBellOff /> Turn off</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">
        Get notified the moment your order ships, gets delivered, or there's a deal we think you'll like.
      </p>
      <button onClick={enable} disabled={busy || permission === 'denied'} className="btn-primary inline-flex items-center gap-2">
        <FiBell /> {busy ? 'Enabling...' : 'Enable notifications'}
      </button>
      {permission === 'denied' && (
        <p className="text-xs text-danger">
          Permission is blocked at the browser level. Allow notifications for this site in your browser settings, then refresh.
        </p>
      )}
    </div>
  );
}
