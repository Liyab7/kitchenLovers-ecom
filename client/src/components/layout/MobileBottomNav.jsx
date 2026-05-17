import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiHome, FiGrid, FiTag, FiUser, FiLogIn } from 'react-icons/fi';

const navItems = [
  { to: '/', label: 'Home', Icon: FiHome, end: true },
  { to: '/categories', label: 'Categories', Icon: FiGrid },
  { to: '/products?tag=deals', label: 'Deals', Icon: FiTag },
];

export default function MobileBottomNav() {
  const user = useSelector((s) => s.auth.user);

  const navClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors relative
     ${isActive ? 'text-primary' : 'text-ink/55 hover:text-primary'}`;

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-ink/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex h-16 max-w-lg mx-auto">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink key={to + label} to={to} end={end} className={navClass}>
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className="text-[20px]" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <NavLink to={user ? '/profile' : '/login'} className={navClass}>
          {({ isActive }) => (
            <>
              <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                {user ? <FiUser className="text-[20px]" /> : <FiLogIn className="text-[20px]" />}
              </span>
              <span>Account</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
