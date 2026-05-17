import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiBarChart2, FiPackage, FiShoppingBag, FiUsers, FiSettings, FiLogOut, FiHome, FiMenu, FiX,
  FiFolder, FiBox, FiTag, FiRotateCcw, FiImage, FiTruck, FiFileText, FiMessageSquare,
} from 'react-icons/fi';
import { logoutThunk } from '../store/slices/authSlice.js';
import Brand from '../components/common/Brand.jsx';

const adminItems = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: FiBarChart2 },
  { to: '/admin/products', label: 'Products', Icon: FiPackage },
  { to: '/admin/categories', label: 'Categories', Icon: FiFolder },
  { to: '/admin/banners', label: 'Banners', Icon: FiImage },
  { to: '/admin/inventory', label: 'Inventory', Icon: FiBox },
  { to: '/admin/orders', label: 'Orders', Icon: FiShoppingBag },
  { to: '/admin/deliveries', label: 'Deliveries', Icon: FiTruck },
  { to: '/admin/refunds', label: 'Refunds', Icon: FiRotateCcw },
  { to: '/admin/promos', label: 'Promos', Icon: FiTag },
  { to: '/admin/customers', label: 'Customers', Icon: FiUsers },
  { to: '/admin/sms-broadcast', label: 'SMS Broadcast', Icon: FiMessageSquare },
  { to: '/admin/audit-log', label: 'Audit log', Icon: FiFileText },
];

export default function AdminLayout() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-ink/10 flex items-center px-3">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open admin menu" className="btn-ghost p-2">
          <FiMenu className="text-2xl" />
        </button>
        <Link to="/" className="no-underline ml-2"><Brand size="h-10" /></Link>
        <span className="ml-auto text-xs text-ink/60 capitalize">
          {user?.role === 'super_admin' ? 'Super admin' : 'Admin'}
        </span>
      </header>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
      />

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-50 w-64 md:w-60 bg-white border-r border-ink/10 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="px-4 py-4 border-b border-ink/10 flex items-start justify-between">
          <div>
            <Link to="/" className="no-underline" onClick={close}><Brand size="h-9" /></Link>
            <span className="badge-primary mt-2 inline-block capitalize">
              {user?.role === 'super_admin' ? 'Super admin' : 'Admin'}
            </span>
          </div>
          <button onClick={close} aria-label="Close menu" className="btn-ghost p-1 md:hidden">
            <FiX />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-ink/40 font-semibold">Manage</p>
          {adminItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-ink/75 hover:bg-ink/[0.04] hover:text-ink'
                }`
              }
            >
              <Icon className="text-base shrink-0" /> {label}
            </NavLink>
          ))}
          {user?.role === 'super_admin' && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-ink/40 font-semibold">System</p>
              <NavLink
                to="/super-admin"
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-ink/75 hover:bg-ink/[0.04] hover:text-ink'
                  }`
                }
              >
                <FiSettings className="text-base shrink-0" /> Super Admin
              </NavLink>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-ink/10 space-y-1.5">
          {user && (
            <div className="px-2 pb-2 text-xs text-ink/55">
              <p className="truncate font-medium text-ink">{user.fullName}</p>
              <p className="truncate text-[11px]">{user.phone || user.email}</p>
            </div>
          )}
          <Link to="/" className="btn-ghost w-full inline-flex items-center justify-center gap-2 no-underline" onClick={close}>
            <FiHome /> Visit storefront
          </Link>
          <button className="btn-outline w-full inline-flex items-center justify-center gap-2" onClick={() => dispatch(logoutThunk())}>
            <FiLogOut /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 overflow-auto pt-20 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
