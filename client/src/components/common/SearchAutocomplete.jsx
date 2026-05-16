import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiTrendingUp, FiClock, FiX } from 'react-icons/fi';
import { api } from '../../services/api.js';

// Search input with a focus-triggered dropdown showing trending searches
// (last 24h) and the current user's recent queries. Calls `onSelect`
// (or `onSubmit`) when the user commits a search, and logs it for trending.
export default function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = 'Search products...',
  className = '',
}) {
  const [internal, setInternal] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => setInternal(value || ''), [value]);

  useEffect(() => {
    const onDocClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function loadSuggestions() {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all([
      api.get('/search/trending').catch(() => ({ data: { data: [] } })),
      api.get('/search/recent').catch(() => ({ data: { data: [] } })),
    ]).then(([t, r]) => {
      setTrending(t.data.data || []);
      setRecent(r.data.data || []);
    });
  }

  function commit(query) {
    const q = String(query || '').trim();
    setInternal(q);
    onChange?.(q);
    if (q.length >= 2) {
      api.post('/search/log', { query: q }).catch(() => {});
    }
    (onSelect || onSubmit)?.(q);
    setOpen(false);
  }

  const filtered = internal
    ? trending.filter((t) => t.query.includes(internal.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        className="input pl-10 pr-9"
        placeholder={placeholder}
        value={internal}
        onChange={(e) => { setInternal(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => { setOpen(true); loadSuggestions(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(internal); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {internal && (
        <button
          type="button"
          onClick={() => { setInternal(''); onChange?.(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
          aria-label="Clear search"
        >
          <FiX />
        </button>
      )}

      {open && (filtered.length > 0 || recent.length > 0 || trending.length > 0) && (
        <div className="absolute z-30 left-0 right-0 mt-2 card p-2 shadow-xl max-h-96 overflow-auto">
          {filtered.length > 0 && (
            <section className="mb-2">
              <p className="text-[11px] uppercase tracking-wider text-ink/50 px-2 py-1">Suggestions</p>
              {filtered.map((s) => (
                <button
                  key={s.query}
                  type="button"
                  onClick={() => commit(s.query)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-primary/5 text-sm inline-flex items-center gap-2"
                >
                  <FiSearch className="text-ink/40" /> {s.query}
                </button>
              ))}
            </section>
          )}
          {recent.length > 0 && !internal && (
            <section className="mb-2">
              <p className="text-[11px] uppercase tracking-wider text-ink/50 px-2 py-1 inline-flex items-center gap-1.5">
                <FiClock /> Recent
              </p>
              {recent.map((r) => (
                <button
                  key={r.query}
                  type="button"
                  onClick={() => commit(r.query)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-primary/5 text-sm inline-flex items-center gap-2"
                >
                  <FiClock className="text-ink/40" /> {r.query}
                </button>
              ))}
            </section>
          )}
          {trending.length > 0 && !internal && (
            <section>
              <p className="text-[11px] uppercase tracking-wider text-ink/50 px-2 py-1 inline-flex items-center gap-1.5">
                <FiTrendingUp /> Trending today
              </p>
              {trending.map((t) => (
                <button
                  key={t.query}
                  type="button"
                  onClick={() => commit(t.query)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-primary/5 text-sm inline-flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2"><FiTrendingUp className="text-primary" /> {t.query}</span>
                  <span className="text-xs text-ink/50">{t.count}</span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
