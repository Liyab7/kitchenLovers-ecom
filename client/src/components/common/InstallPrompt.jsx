import { useEffect, useState, useRef } from 'react';
import { FiDownload, FiX, FiSmartphone } from 'react-icons/fi';
import { subscribeInstall, triggerInstall } from '../../services/pwaInstall.js';

/**
 * Floating "Install KitchenLovers" toast.
 *
 * Uses the shared pwaInstall service which captures the `beforeinstallprompt`
 * event at app startup (the browser only fires it once per page load).
 */
export default function InstallPrompt({ autoHideMs = 10000, onClose }) {
  const [state, setState] = useState({ canInstall: false, installed: false });
  const [visible, setVisible] = useState(true);
  const sessionDismissed = useRef(false);

  useEffect(() => subscribeInstall(setState), []);

  useEffect(() => {
    if (!visible || !autoHideMs) return;
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [visible, autoHideMs, onClose]);

  function dismiss() {
    sessionDismissed.current = true;
    setVisible(false);
    onClose?.();
  }

  async function install() {
    await triggerInstall();
    setVisible(false);
    onClose?.();
  }

  if (!visible || state.installed || sessionDismissed.current) return null;

  return (
    <div
      role="dialog"
      aria-label="Install KitchenLovers app"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 z-50 w-[92%] max-w-md card p-4 flex items-center gap-3 animate-slide-up bg-white shadow-2xl border border-primary/20"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
        <FiSmartphone />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install KitchenLovers</p>
        <p className="text-xs text-ink/60 truncate">
          {state.canInstall
            ? 'Add to your home screen for a faster experience.'
            : 'Use your browser menu → "Install app" or "Add to Home Screen".'}
        </p>
      </div>
      {state.canInstall && (
        <button onClick={install} className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
          <FiDownload /> Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="btn-ghost p-2 text-ink/50">
        <FiX />
      </button>
    </div>
  );
}
