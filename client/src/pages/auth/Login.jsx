import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiAtSign, FiLock, FiLogIn } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { loginThunk } from '../../store/slices/authSlice.js';
import AuthCard from '../../components/common/AuthCard.jsx';
import { Field } from '../../components/common/FormField.jsx';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useSelector((s) => s.auth.status);

  const [form, setForm] = useState({ identifier: '', password: '' });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const res = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(res)) {
      const role = res.payload.role;
      toast.success('Welcome back');

      if (role === 'super_admin' || role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      if (role === 'rider') {
        navigate('/rider/deliveries', { replace: true });
        return;
      }

      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    } else if (res.payload?.code === 'PHONE_NOT_VERIFIED') {
      toast('Verify your phone to continue');
      navigate('/verify-otp', { state: { phone: res.payload.phone } });
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Login failed');
    }
  }

  return (
    <AuthCard
      variant="customer"
      backgroundImage="/brand/signup.jpg"
      title="Welcome back."
      subtitle="Sign in to continue shopping with KitchenLovers."
      footer={<>New to KitchenLovers? <Link to="/register" className="font-semibold text-primary">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field icon={FiAtSign} label="Email or phone" name="identifier" required placeholder="0244 000 000  or  email" value={form.identifier} onChange={change} autoComplete="username" />
        <Field icon={FiLock} label="Password" type="password" name="password" required placeholder="Enter your password" value={form.password} onChange={change} autoComplete="current-password" />
        <div className="text-right -mt-1">
          <Link to="/forgot-password" className="text-xs text-primary font-semibold no-underline hover:underline">
            Forgot password?
          </Link>
        </div>
        <button className="btn-primary w-full py-2.5 text-sm rounded-lg inline-flex items-center justify-center gap-2" disabled={status === 'loading'}>
          <FiLogIn /> {status === 'loading' ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
}
