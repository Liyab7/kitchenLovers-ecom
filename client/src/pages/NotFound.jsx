import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="mt-2 text-ink/70">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-6 no-underline">Back to home</Link>
    </div>
  );
}
