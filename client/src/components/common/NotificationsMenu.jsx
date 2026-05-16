import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiPackage, FiCreditCard, FiInfo, FiTag } from 'react-icons/fi';
import { api } from '../../services/api.js';
import { fetchNotifications, markNotificationRead } from '../../store/slices/notificationsSlice.js';

const TYPE_ICON = {
  order_update: FiPackage,
  payment: FiCreditCard,
  promo: FiTag,
  system: FiInfo,
};

function urlFor(n) {
  if (n?.data?.url) return n.data.url;
  if (n?.data?.orderId) return `/orders/${n.data.orderId}`;
  return null;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useSelector((s) => s.notifications.list);
  const unread = useSelector((s) => s.notifications.unread);
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchNotifications());
  }, [dispatch, user]);

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  function openItem(n) {
    if (!n.isRead) dispatch(markNotificationRead(n._id));
    const url = urlFor(n);
    setOpen(false);
    if (url) navigate(url);
  }

  async function markAll() {
    try {
      await api.post('/notifications/read-all');
      dispatch(fetchNotifications());
    } catch { /* swallow */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative w-9 h-9 rounded-full hover:bg-ink/5 text-ink/70 hover:text-ink flex items-center justify-center transition"
      >
        <FiBell className="text-lg" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] leading-none font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] card shadow-xl z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <FiCheck /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-ink/10">
            {list.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-ink/55">
                <FiBell className="mx-auto text-2xl mb-2 text-ink/30" />
                No notifications yet
              </li>
            ) : (
              list.slice(0, 20).map((n) => {
                const Icon = TYPE_ICON[n.type] || FiInfo;
                const clickable = !!urlFor(n);
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      disabled={!clickable && n.isRead}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-ink/[0.02] transition ${!n.isRead ? 'bg-primary/[0.04]' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'payment' ? 'bg-success/15 text-success'
                        : n.type === 'order_update' ? 'bg-primary/15 text-primary'
                        : 'bg-ink/10 text-ink/60'
                      }`}>
                        <Icon className="text-sm" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold' : 'font-medium'} text-ink`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-ink/65 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[11px] text-ink/40 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="unread" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
