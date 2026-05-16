import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFolder, FiChevronRight, FiSearch } from 'react-icons/fi';
import { api } from '../services/api.js';
import Loader from '../components/common/Loader.jsx';

export default function Categories() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setList(r.data.data)).finally(() => setLoading(false));
  }, []);

  const tree = useMemo(() => {
    const parents = list.filter((c) => !c.parent).sort((a, b) => a.sortOrder - b.sortOrder);
    const byParent = list.reduce((acc, c) => {
      if (c.parent) {
        const pid = c.parent._id || c.parent;
        (acc[pid] = acc[pid] || []).push(c);
      }
      return acc;
    }, {});
    return parents
      .map((p) => ({
        ...p,
        children: (byParent[p._id] || []).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((p) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.children.some((c) => c.name.toLowerCase().includes(s));
      });
  }, [list, search]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiFolder className="text-primary" /> All categories</h1>
        <div className="relative max-w-xs w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="card p-6 text-ink/60 text-sm text-center">No categories match.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tree.map((parent) => (
            <section key={parent._id} className="card p-5">
              <Link
                to={`/products?category=${parent._id}`}
                className="font-semibold inline-flex items-center gap-2 no-underline text-ink hover:text-primary"
              >
                <FiFolder className="text-primary" /> {parent.name}
              </Link>
              {parent.children.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {parent.children.map((c) => (
                    <li key={c._id}>
                      <Link
                        to={`/products?category=${c._id}`}
                        className="inline-flex items-center gap-1 text-ink/75 no-underline hover:text-primary"
                      >
                        <FiChevronRight className="text-ink/30" /> {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink/50 mt-2">No subcategories yet.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
