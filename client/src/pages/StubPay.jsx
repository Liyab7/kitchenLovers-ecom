import { useSearchParams, Link } from 'react-router-dom';
import { FiCreditCard, FiCheckCircle } from 'react-icons/fi';

export default function StubPay() {
  const [params] = useSearchParams();
  const reference = params.get('reference');

  return (
    <div className="card p-6 max-w-md mx-auto text-center">
      <FiCreditCard className="text-4xl text-primary mx-auto mb-2" />
      <h1 className="text-xl mb-2">Sandbox payment</h1>
      <p className="text-sm text-ink/70 mb-4">
        Paystack is not configured. Click below to simulate a successful payment.
      </p>
      <p className="text-xs text-ink/50 mb-6">Reference: {reference}</p>
      <Link to={`/checkout/callback?reference=${reference}`} className="btn-primary no-underline inline-flex items-center gap-2">
        <FiCheckCircle /> Simulate successful payment
      </Link>
    </div>
  );
}
