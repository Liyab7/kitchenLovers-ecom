import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiSearch, FiChevronDown, FiMenu, FiX,
  FiShoppingCart, FiUser, FiLogIn, FiUserPlus,
  FiHeart, FiDownload, FiTruck, FiHeadphones,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { selectCartCount } from '../../store/slices/cartSlice.js';
import { api } from '../../services/api.js';
import { getTopLevelCategories } from '../../utils/categories.js';
import Brand from '../common/Brand.jsx';
import InstallPrompt from '../common/InstallPrompt.jsx';
import NotificationsMenu from '../common/NotificationsMenu.jsx';
import AccountMenu from '../common/AccountMenu.jsx';
import { subscribeInstall, triggerInstall } from '../../services/pwaInstall.js';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

const PRIMARY_NAV = [
  { to: '/', label: 'Home', end: true, match: { pathname: '/' } },
  { to: '/products', label: 'Shop', match: { pathname: '/products', requireNoParams: true } },
  { to: '/categories', label: 'Categories', hasCaret: true, match: { pathname: '/categories' } },
  { to: '/products?tag=deals', label: 'Deals', match: { pathname: '/products', params: { tag: 'deals' } } },
  { to: '/products?sort=-createdAt', label: 'New Arrivals', match: { pathname: '/products', params: { sort: '-createdAt' } } },
  { to: '/products?sort=-salesCount', label: 'Best Sellers', match: { pathname: '/products', params: { sort: '-salesCount' } } },
  { to: '/products?tag=bulk', label: 'Bulk Orders', match: { pathname: '/products', params: { tag: 'bulk' } } },
  { to: '/contact', label: 'Contact', match: { pathname: '/contact' } },
];

function isNavActive(pathname, search, item) {
  if (!item.match) return false;
  if (item.match.pathname !== pathname) return false;
  const sp = new URLSearchParams(search);
  if (item.match.requireNoParams) {
    // Shop is "active" only on bare /products (no tag/sort/category filters set)
    return !sp.has('tag') && !sp.has('sort') && !sp.has('category') && !sp.has('q');
  }
  if (item.match.params) {
    return Object.entries(item.match.params).every(([k, v]) => sp.get(k) === v);
  }
  return true;
}

export default function Header() {
  const user = useSelector((s) => s.auth.user);
  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector((s) => s.wishlist.items.length);
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installState, setInstallState] = useState({ canInstall: false, installed: false });
  const catMenuRef = useRef(null);

  useEffect(() => subscribeInstall(setInstallState), []);

  useEffect(() => {
    let active = true;
    api.get('/categories').then((r) => { if (active) setCategories(r.data.data || []); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (!catMenuRef.current?.contains(e.target)) setCatMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (categoryId) params.set('category', categoryId);
    navigate(`/products?${params.toString()}`);
  }

  async function handleInstallClick() {
    if (installState.installed) {
      toast('App is already installed.');
      return;
    }
    if (installState.canInstall) {
      const { outcome } = await triggerInstall();
      if (outcome === 'accepted') toast.success('Installing KitchenLovers…');
      else if (outcome === 'dismissed') toast('Install cancelled.');
      else if (outcome === 'unavailable') setShowInstallPrompt(true);
      return;
    }
    if (isIos()) {
      toast('To install: tap Share, then "Add to Home Screen".', { duration: 5000 });
      return;
    }
    setShowInstallPrompt(true);
    toast('Open this site in Chrome/Edge to install, or use your browser menu → "Install app".', { duration: 5000 });
  }

  const topLevelCategories = getTopLevelCategories(categories);
  const selectedCategoryName =
    categoryId === '' ? 'All categories' : (categories.find((c) => c._id === categoryId)?.name || 'All categories');

  return (
    <header className="bg-white border-b border-ink/10 sticky top-0 z-30 shadow-sm">
      {/* Utility top bar */}
      <div className="bg-primary/5 border-b border-primary/10 text-[12px] text-ink/75">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <FiTruck className="text-primary" />
            Free shipping on orders over $50
          </span>
          <span className="hidden sm:inline text-ink/60">
            Welcome to KitchenLovers.store <span className="text-primary">♥</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-3 text-ink/60">
            <Link to="/orders" className="no-underline hover:text-primary inline-flex items-center gap-1">
              <FiTruck /> Track Order
            </Link>
            <span className="text-ink/30">|</span>
            <Link to="/contact" className="no-underline hover:text-primary inline-flex items-center gap-1">
              <FiHeadphones /> Help &amp; Support
            </Link>
          </span>
        </div>
      </div>

      {/* Logo + search + auth row */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 lg:gap-6">
        <button
          type="button"
          className="lg:hidden btn-ghost p-2"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
        </button>

        <Link to="/" className="no-underline shrink-0">
          <Brand size="h-12" />
        </Link>

        {/* Search */}
        <form
          onSubmit={submitSearch}
          className="hidden md:flex flex-1 max-w-2xl mx-auto items-stretch border border-ink/15 rounded-lg overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition"
        >
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, categories, brands..."
              className="w-full pl-9 pr-3 py-2.5 outline-none text-sm bg-transparent"
              aria-label="Search products"
            />
          </div>
          <div className="hidden lg:flex items-center border-l border-ink/10 px-1">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-transparent pl-2 pr-6 py-2 text-sm text-ink/80 outline-none appearance-none cursor-pointer"
              aria-label="Search within category"
            >
              <option value="">All categories</option>
              {topLevelCategories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <FiChevronDown className="text-ink/40 -ml-5 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-600 text-white px-5 inline-flex items-center justify-center"
            aria-label="Search"
          >
            <FiSearch className="text-lg" />
          </button>
        </form>

        {/* Right side auth & cart */}
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          {user && (
            <Link to="/wishlist" className="hidden sm:inline-flex items-center gap-2 text-ink hover:text-primary no-underline relative">
              {wishlistCount > 0 ? <FaHeart className="text-danger text-xl" /> : <FiHeart className="text-xl" />}
              <span className="hidden lg:inline text-sm">Wishlist</span>
            </Link>
          )}
          <Link to="/cart" className="relative inline-flex items-center gap-2 text-ink hover:text-primary no-underline">
            <span className="relative">
              <FiShoppingCart className="text-xl" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] leading-none font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            <span className="hidden lg:inline text-sm">Cart</span>
          </Link>

          {user && <NotificationsMenu />}

          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex items-center gap-2 text-ink hover:text-primary no-underline text-sm">
                <FiUser /> Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm py-2 px-4 sm:px-5 no-underline inline-flex items-center gap-1.5 rounded-full"
              >
                <FiUserPlus className="sm:hidden" />
                <span>Sign up</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Nav bar with All Categories + Install App */}
      <div className="hidden lg:block border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
          <div ref={catMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setCatMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 py-3 pr-6 text-sm font-medium text-ink hover:text-primary"
            >
              <FiMenu /> All Categories <FiChevronDown className={`transition-transform ${catMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {catMenuOpen && (
              <div className="absolute left-0 top-full mt-0 w-72 card p-2 shadow-xl z-40 max-h-[480px] overflow-auto">
                <Link
                  to="/categories"
                  onClick={() => setCatMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm text-ink hover:bg-primary/5 no-underline font-medium"
                >
                  Browse all categories →
                </Link>
                <div className="my-1 h-px bg-ink/10" />
                {topLevelCategories.length === 0 ? (
                  <p className="text-sm text-ink/50 px-3 py-2">No categories yet.</p>
                ) : (
                  topLevelCategories.map((c) => (
                    <Link
                      key={c._id}
                      to={`/products?category=${c._id}`}
                      onClick={() => setCatMenuOpen(false)}
                      className="block px-3 py-2 rounded text-sm text-ink hover:bg-primary/5 no-underline"
                    >
                      {c.name}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <nav className="flex-1 flex items-center gap-6 text-sm overflow-x-auto">
            {PRIMARY_NAV.map((item) => {
              const active = isNavActive(location.pathname, location.search, item);
              return (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  className={`inline-flex items-center gap-1 no-underline whitespace-nowrap py-3 border-b-2 transition-colors ${
                    active
                      ? 'text-primary border-primary font-semibold'
                      : 'text-ink/80 border-transparent hover:text-primary'
                  }`}
                >
                  {item.label}{item.hasCaret && <FiChevronDown className="text-xs" />}
                </Link>
              );
            })}
          </nav>

          {!installState.installed && (
            <button
              onClick={handleInstallClick}
              className="btn-primary inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg shrink-0"
            >
              <FiDownload /> Install App
            </button>
          )}
        </div>
      </div>

      {/* Mobile expanded menu (below md) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-ink/10 px-4 py-3 bg-white">
          <form onSubmit={submitSearch} className="flex items-stretch border border-ink/15 rounded-lg overflow-hidden mb-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-primary text-white px-4" aria-label="Search">
              <FiSearch />
            </button>
          </form>
          <nav className="flex flex-col">
            {PRIMARY_NAV.map((item) => {
              const active = isNavActive(location.pathname, location.search, item);
              return (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2.5 text-sm no-underline border-b border-ink/5 ${
                    active ? 'text-primary font-semibold' : 'text-ink/80 hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!installState.installed && (
              <button
                onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }}
                className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 mt-3 w-full"
              >
                <FiDownload /> Install App
              </button>
            )}
          </nav>
        </div>
      )}

      {showInstallPrompt && (
        <InstallPrompt autoHideMs={0} onClose={() => setShowInstallPrompt(false)} />
      )}
    </header>
  );
}
