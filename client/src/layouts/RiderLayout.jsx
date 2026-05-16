import { Outlet, Link, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiTruck, FiLogOut, FiHome, FiUser, FiPackage, FiBell } from 'react-icons/fi';
import { logoutThunk } from '../store/slices/authSlice.js';
import Brand from '../components/common/Brand.jsx';
import NotificationsMenu from '../components/common/NotificationsMenu.jsx';

const NAV = [
  { to: '/rider/deliveries', label: 'Deliveries', Icon: FiPackage },
];

export default function RiderLayout() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="bg-white border-b border-ink/10 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/rider/deliveries" className="no-underline">
            <Brand size="h-9" />
          </Link>
          <span className="badge-primary hidden sm:inline-flex">Rider</span>
          <nav className="ml-2 sm:ml-6 flex items-center gap-2 sm:gap-4 text-sm">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 no-underline py-1.5 ${isActive ? 'text-primary font-semibold' : 'text-ink/75 hover:text-primary'}`
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsMenu />
            <Link
              to="/"
              className="hidden sm:inline-flex btn-ghost text-sm py-1.5 px-2 no-underline items-center gap-1.5"
            >
              <FiHome /> Storefront
            </Link>
            <button
              onClick={() => dispatch(logoutThunk())}
              className="btn-ghost text-sm py-1.5 px-2 inline-flex items-center gap-1.5"
            >
              <FiLogOut /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-ink/10 py-3 text-center text-xs text-ink/55">
        Signed in as <span className="font-medium text-ink/75">{user?.fullName}</span> · {user?.phone}
      </footer>
    </div>
  );
}
