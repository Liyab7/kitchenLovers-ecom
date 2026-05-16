import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiMail, FiLock, FiUserPlus, FiShoppingBag, FiTruck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { registerThunk } from '../../store/slices/authSlice.js';
import AuthCard from '../../components/common/AuthCard.jsx';
import { Field } from '../../components/common/FormField.jsx';

const ROLE_OPTIONS = [
  {
    value: 'client',
    title: 'Shopper',
    body: 'Browse the shop, order kitchen essentials, track delivery.',
    Icon: FiShoppingBag,
  },
  {
    value: 'rider',
    title: 'Rider',
    body: 'Get assigned deliveries and update customers in real time.',
    Icon: FiTruck,
  },
];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector((s) => s.auth.status);

  const [form, setForm] = useState({
    role: 'client',
    fullName: '',
    phone: '',
    email: '',
    password: '',
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const res = await dispatch(registerThunk(form));
    if (registerThunk.fulfilled.match(res)) {
      toast.success('OTP sent to your phone');
      navigate('/verify-otp', { state: { phone: form.phone, role: form.role } });
    } else {
      toast.error(res.payload || 'Registration failed');
    }
  }

  return (
    <AuthCard
      variant="customer"
      backgroundImage="/brand/signup.jpg"
      title="Create your account."
      subtitle="It takes less than a minute. We'll text you a code to verify your phone."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        {/* Role picker */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 mb-1.5">I am signing up as</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const active = form.role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={`text-left p-3 rounded-lg border-2 transition ${
                    active ? 'border-primary bg-primary/5' : 'border-ink/10 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <opt.Icon className={`text-lg ${active ? 'text-primary' : 'text-ink/55'}`} />
                    <span className={`font-semibold text-sm ${active ? 'text-primary' : 'text-ink'}`}>{opt.title}</span>
                  </div>
                  <p className="text-[11px] text-ink/55 mt-1 leading-snug">{opt.body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Field icon={FiUser} label="Full name" name="fullName" required placeholder="Ama Mensah" value={form.fullName} onChange={change} autoComplete="name" />
        <Field icon={FiPhone} label="Phone number" name="phone" required placeholder="0244 000 000" value={form.phone} onChange={change} autoComplete="tel" />
        <Field icon={FiMail} label="Email (optional)" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={change} autoComplete="email" />
        <Field icon={FiLock} label="Password" type="password" name="password" required minLength={8} placeholder="Min. 8 characters" value={form.password} onChange={change} autoComplete="new-password" />
        <button className="btn-primary w-full py-2.5 text-sm rounded-lg inline-flex items-center justify-center gap-2 mt-1" disabled={status === 'loading'}>
          <FiUserPlus /> {status === 'loading' ? 'Creating...' : `Create ${form.role === 'rider' ? 'rider' : ''} account`.replace(/\s+/g, ' ').trim()}
        </button>
        <p className="text-[11px] text-ink/50 text-center">
          By creating an account you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthCard>
  );
}
