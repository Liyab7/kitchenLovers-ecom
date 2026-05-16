import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiPackage, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import { fetchMyOrders } from '../store/slices/ordersSlice.js';
import Empty from '../components/common/Empty.jsx';
import { fmt } from '../utils/format.js';

function statusBadge(status) {
  const map = {
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    refunded: 'badge-danger',
    paid: 'badge bg-accent/10 text-accent',
    processing: 'badge bg-accent/10 text-accent',
    shipped: 'badge bg-accent/10 text-accent',
  };
  return map[status] || 'badge-muted';
}

export default function MyOrders() {
  const dispatch = useDispatch();
  const orders = useSelector((s) => s.orders.mine);

  useEffect(() => { dispatch(fetchMyOrders()); }, [dispatch]);

  if (!orders.length) {
    return (
      <Empty
        icon={FiPackage}
        title="No orders yet"
        hint="Once you place an order it'll appear here so you can track delivery and re-order favourites."
        action={(
          <Link to="/products" className="btn-primary inline-flex items-center gap-2 no-underline">
            <FiShoppingBag /> Browse the shop
          </Link>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
        <FiPackage className="text-primary" /> My orders
      </h1>
      <div className="card divide-y divide-ink/10">
        {orders.map((o) => (
          <Link
            key={o._id}
            to={`/orders/${o._id}`}
            className="p-4 flex justify-between items-center gap-4 no-underline text-ink hover:bg-ink/[0.015] transition"
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">{o.orderNumber}</p>
              <p className="text-xs text-ink/55 mt-0.5">
                {new Date(o.createdAt).toLocaleDateString()} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="text-right flex items-center gap-4 shrink-0">
              <div>
                <span className={statusBadge(o.status)}>{o.status}</span>
                <p className="text-sm font-semibold mt-1 tabular-nums">{fmt(o.total, o.currency)}</p>
              </div>
              <FiArrowRight className="text-ink/35" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
