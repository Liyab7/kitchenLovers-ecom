import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiUser, FiPackage, FiHeart, FiRotateCcw, FiSettings, FiLogOut, FiChevronDown, FiTruck,
} from 'react-icons/fi';
import { logoutThunk } from '../../store/slices/authSlice.js';

const CUSTOMER_ITEMS = [
  { to: '/orders', label: 'My orders', Icon: FiPackage },
  { to: '/wishlist', label: 'Wishlist', Icon: FiHeart },
  { to: '/refunds', label: 'Refunds', Icon: FiRotateCcw },
  { to: '/profile', label: 'Profile & addresses', Icon: FiSettings },
];

export default function AccountMenu() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const firstName = user.fullName?.split(' ')[0] || 'Account';
  const isStaff = user.role === 'admin' || user.role === 'super_admin';
  const isRider = user.role === 'rider';
  const items = isRider
    ? [
        { to: '/rider/deliveries', label: 'My deliveries', Icon: FiTruck },
        { to: '/profile', label: 'Profile', Icon: FiSettings },
      ]
    : CUSTOMER_ITEMS;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-ink/80 hover:text-primary px-2 py-1.5 rounded-md hover:bg-ink/[0.04] transition"
      >
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <FiUser className="text-sm" />
        </span>
        <span className="hidden md:inline">{firstName}</span>
        <FiChevronDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 card shadow-xl z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink/10">
            <p className="font-semibold text-sm truncate">{user.fullName}</p>
            <p className="text-xs text-ink/55 truncate">{user.phone || user.email}</p>
          </div>
          <ul className="py-1">
            {items.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-ink hover:bg-ink/[0.03] no-underline"
                >
                  <Icon className="text-ink/55" /> {label}
                </Link>
              </li>
            ))}
            {isStaff && (
              <li className="border-t border-ink/10 mt-1 pt-1">
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 no-underline"
                >
                  <FiSettings /> Admin dashboard
                </Link>
              </li>
            )}
          </ul>
          <button
            onClick={() => { setOpen(false); dispatch(logoutThunk()); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink/75 hover:bg-ink/[0.03] border-t border-ink/10"
          >
            <FiLogOut /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
