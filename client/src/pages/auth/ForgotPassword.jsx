import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPhone, FiSend, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import AuthCard from '../../components/common/AuthCard.jsx';
import { Field } from '../../components/common/FormField.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Enter your phone number');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { phone: phone.trim() });
      toast.success('Check your phone for the reset code');
      navigate('/reset-password', { state: { phone: phone.trim() } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start password reset');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      variant="customer"
      backgroundImage="/brand/login.jpg"
      title="Forgot your password?"
      subtitle="Enter the phone number on your account and we'll text you a reset code."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 text-primary font-semibold no-underline">
          <FiArrowLeft /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field
          icon={FiPhone}
          label="Phone number"
          name="phone"
          required
          placeholder="0244 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        <button
          className="btn-primary w-full py-2.5 text-sm rounded-lg inline-flex items-center justify-center gap-2"
          disabled={busy}
        >
          <FiSend /> {busy ? 'Sending code…' : 'Send reset code'}
        </button>
      </form>
    </AuthCard>
  );
}
