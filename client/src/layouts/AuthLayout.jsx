import { Outlet, Link } from 'react-router-dom';
import Particles from '../components/common/Particles.jsx';
import Brand from '../components/common/Brand.jsx';

export default function AuthLayout() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-canvas via-white to-primary/5">
      <Particles count={50} color="#FF6B35" linkColor="#FF6B35" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-4 sm:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="no-underline"><Brand size="h-12" /></Link>
          <Link to="/" className="text-sm text-ink/70 hover:text-primary no-underline">Back to shop →</Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
