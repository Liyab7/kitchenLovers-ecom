import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiPhone, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { verifyOtpThunk, resendOtpThunk } from '../../store/slices/authSlice.js';
import AuthCard from '../../components/common/AuthCard.jsx';
import { Field } from '../../components/common/FormField.jsx';

const OTP_LENGTH = 6;

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const initialPhone = location.state?.phone || '';
  const [phone, setPhone] = useState(initialPhone);
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
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
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
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
    if (code.length !== OTP_LENGTH) return toast.error('Enter the 6-digit code');
    setBusy(true);
    const res = await dispatch(verifyOtpThunk({ phone, code }));
    setBusy(false);
    if (verifyOtpThunk.fulfilled.match(res)) {
      toast.success('Phone verified');
      const role = res.payload?.role;
      if (role === 'rider') navigate('/rider/deliveries', { replace: true });
      else if (role === 'admin' || role === 'super_admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/', { replace: true });
    } else {
      toast.error(res.payload || 'Invalid OTP');
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    const res = await dispatch(resendOtpThunk({ phone }));
    if (resendOtpThunk.fulfilled.match(res)) {
      toast.success('OTP resent');
      setCooldown(30);
    } else {
      toast.error(res.payload || 'Could not resend');
    }
  }

  return (
    <AuthCard
      variant="customer"
      backgroundImage="/brand/login.jpg"
      title="Verify your phone."
      subtitle={`Enter the ${OTP_LENGTH}-digit code we just texted to your phone.`}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field icon={FiPhone} label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">Verification code</p>
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
              />
            ))}
          </div>
        </div>

        <button className="btn-primary w-full py-2.5 text-sm rounded-lg inline-flex items-center justify-center gap-2" disabled={busy}>
          <FiCheckCircle /> {busy ? 'Verifying...' : 'Verify and continue'}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="block mx-auto text-sm text-accent hover:underline disabled:no-underline disabled:text-ink/40 inline-flex items-center gap-1.5"
        >
          <FiRefreshCw /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </form>
    </AuthCard>
  );
}
