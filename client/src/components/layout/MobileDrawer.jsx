import { Link, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiX, FiHome, FiPackage, FiGrid, FiInfo, FiPhone,
  FiLogIn, FiLogOut, FiUserPlus, FiUser, FiFolder, FiHeart, FiRotateCcw,
} from 'react-icons/fi';
import { logoutThunk } from '../../store/slices/authSlice.js';
import Brand from '../common/Brand.jsx';

const navItems = [
  { to: '/', label: 'Home', Icon: FiHome, end: true },
  { to: '/products', label: 'Shop', Icon: FiPackage },
  { to: '/categories', label: 'Categories', Icon: FiFolder },
  { to: '/about', label: 'About', Icon: FiInfo },
  { to: '/contact', label: 'Contact', Icon: FiPhone },
];

export default function MobileDrawer({ open, onClose }) {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl md:hidden transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-ink/10">
          <Brand size="h-10" />
          <button onClick={onClose} aria-label="Close menu" className="btn-ghost p-2">
            <FiX className="text-xl" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-md no-underline text-ink hover:bg-primary/5 ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
              }
            >
              <Icon className="text-lg" /> {label}
            </NavLink>
          ))}
          {user && (
            <>
              <NavLink
                to="/orders"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md no-underline text-ink hover:bg-primary/5 ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
                }
              >
                <FiGrid className="text-lg" /> My orders
              </NavLink>
              <NavLink
                to="/wishlist"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md no-underline text-ink hover:bg-primary/5 ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
                }
              >
                <FiHeart className="text-lg" /> Wishlist
              </NavLink>
              <NavLink
                to="/refunds"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md no-underline text-ink hover:bg-primary/5 ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
                }
              >
                <FiRotateCcw className="text-lg" /> Refunds
              </NavLink>
              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md no-underline text-ink hover:bg-primary/5 ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`
                }
              >
                <FiUser className="text-lg" /> Profile
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-ink/10 p-3 space-y-2 absolute bottom-0 left-0 right-0">
          {user ? (
            <>
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link to="/admin" onClick={onClose} className="btn-outline w-full inline-flex items-center justify-center gap-2 no-underline">
                  <FiUser /> Admin
                </Link>
              )}
              <button
                onClick={() => { dispatch(logoutThunk()); onClose(); }}
                className="btn-ghost w-full inline-flex items-center justify-center gap-2"
              >
                <FiLogOut /> Sign out
              </button>
              <p className="text-xs text-ink/50 text-center pt-1">{user.fullName} • {user.phone}</p>
            </>
          ) : (
            <>
              <Link to="/login" onClick={onClose} className="btn-outline w-full inline-flex items-center justify-center gap-2 no-underline">
                <FiLogIn /> Sign in
              </Link>
              <Link to="/register" onClick={onClose} className="btn-primary w-full inline-flex items-center justify-center gap-2 no-underline">
                <FiUserPlus /> Sign up
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
