import { useEffect, useState, useRef } from 'react';
import { FiDownload, FiX, FiSmartphone, FiShare, FiPlusSquare, FiChrome } from 'react-icons/fi';
import { subscribeInstall, triggerInstall } from '../../services/pwaInstall.js';

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function inStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/**
 * "Install KitchenLovers" prompt with platform-aware fallbacks.
 *
 * Auto-hides on regular page loads as a small toast. When opened via the header
 * "Install App" button on a platform that doesn't fire `beforeinstallprompt`
 * (notably iOS Safari), it switches to an instructional modal showing the
 * exact share-sheet → Add to Home Screen flow.
 */
export default function InstallPrompt({ autoHideMs = 10000, onClose, forceShow = false }) {
  const [state, setState] = useState({ canInstall: false, installed: false });
  const [visible, setVisible] = useState(true);
  const sessionDismissed = useRef(false);
  const platform = detectPlatform();
  const isStandalone = inStandalone();

  useEffect(() => subscribeInstall(setState), []);

  useEffect(() => {
    if (!visible || !autoHideMs || forceShow) return;
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [visible, autoHideMs, onClose, forceShow]);

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

  if (!visible || state.installed || isStandalone || sessionDismissed.current) return null;

  // forceShow + iOS → full instructional modal (no native prompt on iOS).
  if (forceShow && platform === 'ios') {
    return (
      <div
        role="dialog"
        aria-label="Install KitchenLovers on iOS"
        className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fade-in"
        onClick={dismiss}
      >
        <div
          className="card w-full max-w-md bg-white p-5 sm:p-6 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
              <FiSmartphone />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-base">Install on iPhone / iPad</h3>
              <p className="text-xs text-ink/60 mt-1">
                Add KitchenLovers to your Home Screen for a faster, full-screen experience.
              </p>
            </div>
            <button onClick={dismiss} aria-label="Dismiss" className="btn-ghost p-1.5 text-ink/50">
              <FiX />
            </button>
          </div>

          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">1</span>
              <span className="flex items-center gap-2">
                Tap the <FiShare className="text-primary" /> <strong>Share</strong> icon at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">2</span>
              <span className="flex items-center gap-2">
                Scroll and tap <FiPlusSquare className="text-primary" /> <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">3</span>
              <span>Tap <strong>Add</strong> in the top-right corner. Done!</span>
            </li>
          </ol>

          <p className="mt-4 text-[11px] text-ink/55">
            Note: iOS only supports installing from <strong>Safari</strong>. If you opened this page in Chrome,
            Firefox, or another browser, please open it in Safari first.
          </p>
        </div>
      </div>
    );
  }

  // forceShow + Android (no canInstall) — usually means user already dismissed or
  // hasn't met engagement threshold. Show a helpful modal with browser menu hint.
  if (forceShow && platform === 'android' && !state.canInstall) {
    return (
      <div
        role="dialog"
        aria-label="Install KitchenLovers on Android"
        className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fade-in"
        onClick={dismiss}
      >
        <div
          className="card w-full max-w-md bg-white p-5 sm:p-6 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
              <FiChrome />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-base">Install on Android</h3>
              <p className="text-xs text-ink/60 mt-1">
                Add KitchenLovers to your home screen for offline access and faster loading.
              </p>
            </div>
            <button onClick={dismiss} aria-label="Dismiss" className="btn-ghost p-1.5 text-ink/50">
              <FiX />
            </button>
          </div>

          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">1</span>
              <span>Tap the <strong>⋮ menu</strong> in the top-right of your browser.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">2</span>
              <span>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">3</span>
              <span>Confirm <strong>Install</strong>. The icon appears on your home screen.</span>
            </li>
          </ol>

          <p className="mt-4 text-[11px] text-ink/55">
            Don't see "Install app"? Some browsers (Samsung Internet, Firefox) show this under
            a different name. Make sure you're on the main page over HTTPS — then try again.
          </p>
        </div>
      </div>
    );
  }

  // Default lightweight toast for normal page loads.
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
            : platform === 'ios'
            ? 'Tap Share → "Add to Home Screen" in Safari.'
            : 'Use your browser menu → "Install app".'}
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
