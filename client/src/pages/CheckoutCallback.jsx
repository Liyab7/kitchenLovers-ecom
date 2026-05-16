import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyPayment } from '../store/slices/ordersSlice.js';
import Loader from '../components/common/Loader.jsx';
import toast from 'react-hot-toast';

export default function CheckoutCallback() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setStatus('failed'); return; }
    dispatch(verifyPayment(reference)).then((res) => {
      const ok = verifyPayment.fulfilled.match(res) && res.payload.status === 'success';
      if (ok) { toast.success('Payment confirmed'); setStatus('success'); setTimeout(() => navigate('/orders'), 1500); }
      else { setStatus('failed'); toast.error('Payment not confirmed'); }
    });
  }, [params, dispatch, navigate]);

  if (status === 'verifying') return <Loader label="Verifying your payment..." />;
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl">{status === 'success' ? 'Thank you!' : 'Payment failed'}</h1>
      <p className="mt-2 text-ink/70">{status === 'success' ? 'Your order is confirmed.' : 'We could not verify your payment. Please contact support.'}</p>
    </div>
  );
}
