import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export function Field({ icon: Icon, label, type = 'text', error, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword && show ? 'text' : type;

  return (
    <label className="block">
      {label && <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink/60 mb-1.5">{label}</span>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-base" />}
        <input
          {...props}
          type={actualType}
          className={`input ${Icon ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} py-2.5 text-sm rounded-lg ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink p-1 text-base"
          >
            {show ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </label>
  );
}
