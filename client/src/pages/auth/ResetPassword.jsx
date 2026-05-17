import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiPhone, FiLock, FiCheckCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import AuthCard from '../../components/common/AuthCard.jsx';
import { Field } from '../../components/common/FormField.jsx';

const OTP_LENGTH = 6;

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(location.state?.phone || '');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function setDigit(i, v) {
    const clean = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    text.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  async function submit(e) {
    e.preventDefault();
    const code = digits.join('');
    if (!phone.trim()) return toast.error('Phone number required');
    if (code.length !== OTP_LENGTH) return toast.error(`Enter the ${OTP_LENGTH}-digit code`);
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

    setBusy(true);
    try {
      await api.post('/auth/reset-password', { phone: phone.trim(), code, newPassword });
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || !phone.trim()) return;
    try {
      await api.post('/auth/forgot-password', { phone: phone.trim() });
      toast.success('Code resent');
      setCooldown(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    }
  }

  return (
    <AuthCard
      variant="customer"
      backgroundImage="/brand/login.jpg"
      title="Reset password"
      subtitle={`Enter the ${OTP_LENGTH}-digit code we sent to your phone, then choose a new password.`}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 text-primary font-semibold no-underline">
          <FiArrowLeft /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          icon={FiPhone}
          label="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 mb-1.5">Reset code</p>
          <div className="flex gap-2 justify-between">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                inputMode="numeric"
                maxLength={1}
                className="input w-full aspect-square text-center text-xl sm:text-2xl font-mono font-bold p-0"
                autoComplete="one-time-code"
              />
            ))}
          </div>
        </div>

        <Field
          icon={FiLock}
          type="password"
          label="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />

        <button
          className="btn-primary w-full py-2.5 text-sm rounded-lg inline-flex items-center justify-center gap-2"
          disabled={busy}
        >
          <FiCheckCircle /> {busy ? 'Resetting…' : 'Reset password'}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || !phone.trim()}
          className="block mx-auto text-sm text-accent hover:underline disabled:no-underline disabled:text-ink/40 inline-flex items-center gap-1.5"
        >
          <FiRefreshCw /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </form>
    </AuthCard>
  );
}
