// Captures the browser's `beforeinstallprompt` event at module load (before any
// React component mounts), since the browser fires it exactly once per page load
// and there's no way to re-request it. Consumers subscribe to be notified when
// installability changes, and call install() to trigger the native dialog.

let deferredPrompt = null;
let installed = isStandalone();
const listeners = new Set();

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function notify() {
  for (const fn of listeners) fn(getState());
}

function getState() {
  return {
    canInstall: !!deferredPrompt && !installed,
    installed,
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  fn(getState());
  return () => listeners.delete(fn);
}

export function getInstallState() {
  return getState();
}

export async function triggerInstall() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  notify();
  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return { outcome: choice?.outcome || 'dismissed' };
  } catch {
    return { outcome: 'error' };
  }
}
