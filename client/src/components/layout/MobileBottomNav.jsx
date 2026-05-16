import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiHome, FiPackage, FiShoppingCart, FiLogIn, FiUserPlus, FiUser,
  FiFolder, FiTag, FiBox, FiHelpCircle,
} from 'react-icons/fi';
import { selectCartCount } from '../../store/slices/cartSlice.js';

const navItems = [
  { to: '/', label: 'Home', Icon: FiHome, end: true },
  { to: '/products', label: 'Shop', Icon: FiPackage },
  { to: '/categories', label: 'Categories', Icon: FiFolder },
  { to: '/products?tag=deals', label: 'Deals', Icon: FiTag },
  { to: '/products?tag=bulk', label: 'Bulk orders', Icon: FiBox },
  { to: '/contact', label: 'Support', Icon: FiHelpCircle },
];

export default function MobileBottomNav() {
  const user = useSelector((s) => s.auth.user);
  const cartCount = useSelector(selectCartCount);

  const navClass = ({ isActive }) =>
    `flex min-w-[66px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative whitespace-nowrap
     ${isActive ? 'text-primary' : 'text-ink/55 hover:text-primary'}`;

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-ink/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex h-16 max-w-lg mx-auto gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink key={to + label} to={to} end={end} className={navClass}>
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                  <Icon className="text-[18px]" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <NavLink to="/cart" className={navClass}>
          {({ isActive }) => (
            <>
              <span className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                <FiShoppingCart className="text-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] leading-none font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
              <span>Cart</span>
            </>
          )}
        </NavLink>

        {user ? (
          <NavLink to="/orders" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                  <FiUser className="text-[18px]" />
                </span>
                <span>Account</span>
              </>
            )}
          </NavLink>
        ) : (
          <>
            <NavLink to="/login" className={navClass}>
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                    <FiLogIn className="text-[18px]" />
                  </span>
                  <span>Sign in</span>
                </>
              )}
            </NavLink>

            <NavLink to="/register" className={navClass}>
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
                    <FiUserPlus className="text-[18px]" />
                  </span>
                  <span>Sign up</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
