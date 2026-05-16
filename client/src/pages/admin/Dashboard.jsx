import { useEffect, useState } from 'react';
import {
  FiDollarSign, FiShoppingBag, FiUsers, FiPackage, FiAlertTriangle, FiPieChart,
  FiClock, FiCheckCircle, FiTrendingUp,
} from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { fmt } from '../../utils/format.js';

function StatCard({ label, value, sub, Icon, accent = 'primary' }) {
  const bgMap = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', accent: 'bg-accent/10 text-accent', danger: 'bg-danger/10 text-danger', ink: 'bg-ink/[0.08] text-ink/70' };
  const tone = bgMap[accent] || bgMap.primary;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${tone}`}>
          <Icon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-ink/55 uppercase tracking-wider font-semibold">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold mt-1 truncate tabular-nums">{value}</p>
          {sub && <p className="text-xs text-ink/50 mt-1 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/admin/metrics').then((r) => setMetrics(r.data.data));
  }, []);

  if (!metrics) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
          <FiPieChart className="text-primary" /> Dashboard
        </h1>
        <p className="text-sm text-ink/55 mt-1">Performance snapshot of your store.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Revenue today" value={fmt(metrics.revenue.today, 'GHS')} sub={`Last 7d: ${fmt(metrics.revenue.last7Days, 'GHS')}`} Icon={FiDollarSign} accent="success" />
        <StatCard label="Revenue 30d" value={fmt(metrics.revenue.last30Days, 'GHS')} sub={`All time: ${fmt(metrics.revenue.total, 'GHS')}`} Icon={FiTrendingUp} accent="success" />
        <StatCard label="Pending orders" value={metrics.orders.pending} sub={`Total: ${metrics.orders.total}`} Icon={FiClock} accent="primary" />
        <StatCard label="Delivered" value={metrics.orders.delivered} sub={`${metrics.paidOrders} paid total`} Icon={FiCheckCircle} accent="success" />
        <StatCard label="Customers" value={metrics.customers} sub={`${metrics.activeCustomers} active in 30d`} Icon={FiUsers} accent="accent" />
        <StatCard label="Products" value={metrics.products} sub={`${metrics.outOfStockCount} out of stock`} Icon={FiPackage} accent="ink" />
        <StatCard label="Low stock" value={metrics.lowStock.length} sub="Items needing restock" Icon={FiAlertTriangle} accent="danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="card p-5">
          <h2 className="font-semibold text-base mb-4">Top selling products</h2>
          {metrics.topSelling.length === 0 ? (
            <p className="text-sm text-ink/55">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {metrics.topSelling.map((p, i) => (
                <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="truncate font-medium">{p.name || 'Untitled'}</span>
                  </span>
                  <span className="text-ink/55 shrink-0 text-xs tabular-nums">{p.quantity} sold · {fmt(p.revenue, 'GHS')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-base mb-4">Order status breakdown</h2>
          {metrics.statusBreakdown.length === 0 ? (
            <p className="text-sm text-ink/55">No orders yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {metrics.statusBreakdown.map((s) => (
                <li key={s._id} className="flex justify-between items-center">
                  <span className="capitalize text-ink/70">{s._id.replace('_', ' ')}</span>
                  <span className="badge-muted tabular-nums">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {metrics.lowStock.length > 0 && (
        <section className="card p-5 border-danger/20">
          <h2 className="font-semibold text-base mb-3 inline-flex items-center gap-2">
            <FiAlertTriangle className="text-danger" /> Low stock alerts
          </h2>
          <ul className="divide-y divide-ink/10">
            {metrics.lowStock.map((p) => (
              <li key={p._id} className="py-2 flex justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-danger tabular-nums">
                  {p.stock} left <span className="text-ink/40">/ threshold {p.lowStockThreshold}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
