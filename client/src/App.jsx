import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import RiderLayout from './layouts/RiderLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Welcome from './components/common/Welcome.jsx';

import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import CheckoutCallback from './pages/CheckoutCallback.jsx';
import StubPay from './pages/StubPay.jsx';
import MyOrders from './pages/MyOrders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Categories from './pages/Categories.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Profile from './pages/Profile.jsx';
import MyRefunds from './pages/MyRefunds.jsx';
import NotFound from './pages/NotFound.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/Products.jsx';
import AdminCategories from './pages/admin/Categories.jsx';
import AdminBanners from './pages/admin/Banners.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import AdminDeliveries from './pages/admin/Deliveries.jsx';
import AdminCustomers from './pages/admin/Customers.jsx';
import AdminSmsBroadcast from './pages/admin/SmsBroadcast.jsx';
import AdminAuditLog from './pages/admin/AuditLog.jsx';
import RiderDeliveries from './pages/rider/Deliveries.jsx';
import AdminInventory from './pages/admin/Inventory.jsx';
import AdminPromos from './pages/admin/Promos.jsx';
import AdminRefunds from './pages/admin/Refunds.jsx';
import SuperAdminPanel from './pages/super-admin/Panel.jsx';

import { clearAuthSession, fetchMe } from './store/slices/authSlice.js';
import { fetchWishlist, clearWishlist } from './store/slices/wishlistSlice.js';
import { connectSocket, disconnectSocket } from './services/socket.js';
import { pushRealtime, fetchNotifications } from './store/slices/notificationsSlice.js';
import { getTokens } from './services/api.js';
import toast from 'react-hot-toast';

function notificationUrl(n) {
  if (n?.data?.url) return n.data.url;
  if (n?.data?.orderId) return `/orders/${n.data.orderId}`;
  return null;
}

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const authStatus = useSelector((s) => s.auth.status);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const { accessToken, refreshToken } = getTokens();
    if (accessToken || refreshToken) {
      dispatch(fetchMe());
    } else {
      dispatch(clearAuthSession());
    }
  }, [dispatch]);

  useEffect(() => {
    if (authStatus === 'checking') return undefined;
    const { accessToken, refreshToken } = getTokens();
    const hasSession = !!(accessToken || refreshToken);
    if (!hasSession) { disconnectSocket(); dispatch(clearWishlist()); return undefined; }
    if (!user) { disconnectSocket(); dispatch(clearWishlist()); return; }
    dispatch(fetchWishlist());
    dispatch(fetchNotifications());
    const socket = connectSocket();
    socket.on('notification:new', (n) => {
      dispatch(pushRealtime(n));
      const url = notificationUrl(n);
      toast.custom((t) => (
        <div
          onClick={() => {
            if (url) navigate(url);
            toast.dismiss(t.id);
          }}
          className={`bg-white card px-4 py-3 max-w-sm cursor-pointer hover:shadow-lg transition ${t.visible ? 'animate-fade-in' : 'opacity-0'}`}
          role="button"
        >
          <p className="font-semibold text-sm text-ink">{n.title}</p>
          {n.body && <p className="text-xs text-ink/65 mt-0.5">{n.body}</p>}
          {url && <p className="text-[11px] text-primary mt-1">Tap to view →</p>}
        </div>
      ), { duration: 6000 });
    });
    socket.on('order:paid', (o) => toast.success(`Order ${o.orderNumber} paid`));
    socket.on('order:new', (o) => toast(`New order: ${o.orderNumber}`));
    return () => {
      socket.off('notification:new');
      socket.off('order:paid');
      socket.off('order:new');
    };
  }, [user, authStatus, dispatch, navigate]);

  return (
    <>
      {showWelcome && <Welcome onDismiss={() => setShowWelcome(false)} />}
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:idOrSlug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/checkout/callback" element={<ProtectedRoute><CheckoutCallback /></ProtectedRoute>} />
          <Route path="/checkout/stub-pay" element={<ProtectedRoute><StubPay /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/refunds" element={<ProtectedRoute><MyRefunds /></ProtectedRoute>} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/categories" element={<Categories />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
        </Route>

        <Route element={<ProtectedRoute roles={['rider', 'admin', 'super_admin']}><RiderLayout /></ProtectedRoute>}>
          <Route path="/rider" element={<Navigate to="/rider/deliveries" replace />} />
          <Route path="/rider/deliveries" element={<RiderDeliveries />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin', 'super_admin']}><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/deliveries" element={<AdminDeliveries />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/sms-broadcast" element={<AdminSmsBroadcast />} />
          <Route path="/admin/promos" element={<AdminPromos />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route path="/admin/audit-log" element={<AdminAuditLog />} />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <SuperAdminPanel />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
