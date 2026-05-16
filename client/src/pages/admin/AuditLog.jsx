import { useEffect, useState } from 'react';
import { FiActivity, FiSearch } from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';

function relative(ts) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const ACTION_COLORS = {
  'product.create': 'bg-success/10 text-success',
  'product.update': 'bg-accent/10 text-accent',
  'product.delete': 'bg-danger/10 text-danger',
  'category.create': 'bg-success/10 text-success',
  'category.update': 'bg-accent/10 text-accent',
  'category.delete': 'bg-danger/10 text-danger',
  'order.status.update': 'bg-primary/10 text-primary',
  'admin.create': 'bg-success/10 text-success',
  'user.role.update': 'bg-primary/10 text-primary',
  'user.active.update': 'bg-ink/10 text-ink',
  'setting.update': 'bg-accent/10 text-accent',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/admin/audit-log', { params: { action: search || undefined } })
      .then((r) => setLogs(r.data.data))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl inline-flex items-center gap-2"><FiActivity className="text-primary" /> Audit log</h1>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          className="input pl-10"
          placeholder="Filter by action (e.g. product.update)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <Loader /> : logs.length === 0 ? (
        <p className="card p-6 text-ink/60 text-sm text-center">No activity yet.</p>
      ) : (
        <div className="card divide-y divide-ink/10">
          {logs.map((log) => (
            <div key={log._id} className="p-3 sm:p-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-3 items-start">
              <div className="min-w-0">
                <p className="font-medium truncate inline-flex items-center gap-2">
                  <span className={`badge ${ACTION_COLORS[log.action] || 'bg-ink/10 text-ink'}`}>{log.action}</span>
                  {log.target?.label && <span className="text-ink/80 text-sm truncate">{log.target.label}</span>}
                </p>
                <p className="text-xs text-ink/60 mt-1">
                  {log.actorName} <span className="text-ink/40">·</span> {log.actorRole}
                  {log.method && <> <span className="text-ink/40">·</span> {log.method} {log.path}</>}
                  {log.ip && <> <span className="text-ink/40">·</span> {log.ip}</>}
                </p>
              </div>
              <p className="text-xs text-ink/50 whitespace-nowrap" title={new Date(log.createdAt).toLocaleString()}>
                {relative(log.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
