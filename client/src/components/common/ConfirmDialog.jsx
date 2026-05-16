import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiHelpCircle, FiX } from 'react-icons/fi';

const ConfirmContext = createContext(null);

const toneStyles = {
  danger: {
    Icon: FiAlertTriangle,
    icon: 'bg-danger/10 text-danger',
    button: 'btn bg-danger text-white hover:bg-danger/90',
  },
  primary: {
    Icon: FiHelpCircle,
    icon: 'bg-primary/10 text-primary',
    button: 'btn-primary',
  },
};

const defaultOptions = {
  title: 'Please confirm',
  message: 'Are you sure you want to continue?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'danger',
};

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions = {}) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setOptions({ ...defaultOptions, ...nextOptions });
  }), []);

  useEffect(() => {
    if (!options) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, options]);

  const value = useMemo(() => confirm, [confirm]);
  const styles = toneStyles[options?.tone] || toneStyles.primary;
  const Icon = styles.Icon;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-4 animate-fade-in" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="card w-full max-w-md p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
                <Icon className="text-xl" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-lg leading-tight">{options.title}</h2>
                <p className="mt-1 text-sm text-ink/65">{options.message}</p>
              </div>
              <button type="button" className="btn-ghost p-2 -mt-2 -mr-2" onClick={() => close(false)} aria-label="Close">
                <FiX />
              </button>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => close(false)}>
                {options.cancelLabel}
              </button>
              <button type="button" className={styles.button} onClick={() => close(true)}>
                {options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}
