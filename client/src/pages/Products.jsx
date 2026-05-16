import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiSearch, FiGrid, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { fetchProducts } from '../store/slices/productsSlice.js';
import ProductCard from '../components/common/ProductCard.jsx';
import Loader from '../components/common/Loader.jsx';
import Empty from '../components/common/Empty.jsx';
import { api } from '../services/api.js';
import { Chip, ChipRow } from '../components/common/Chips.jsx';
import SearchAutocomplete from '../components/common/SearchAutocomplete.jsx';
import { getTopLevelCategories } from '../utils/categories.js';
import { storeProductSearch } from '../utils/productSearchHistory.js';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'price', label: 'Price ↑' },
  { value: '-price', label: 'Price ↓' },
  { value: '-salesCount', label: 'Best selling' },
  { value: '-averageRating', label: 'Top rated' },
];

export default function Products() {
  const dispatch = useDispatch();
  const { list, pagination, status } = useSelector((s) => s.products);
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || '-createdAt';
  const page = Number(params.get('page') || 1);
  const topLevelCategories = getTopLevelCategories(categories);
  const selectedCategory = categories.find((c) => c._id === category);

  const TAG_TITLES = {
    deals: 'Deals',
    bulk: 'Bulk Orders',
  };
  const SORT_TITLES = {
    '-createdAt': 'New Arrivals',
    '-salesCount': 'Best Sellers',
  };
  let pageTitle = 'Shop';
  if (tag && TAG_TITLES[tag]) pageTitle = TAG_TITLES[tag];
  else if (params.has('sort') && SORT_TITLES[sort]) pageTitle = SORT_TITLES[sort];
  else if (selectedCategory) pageTitle = selectedCategory.name;
  else if (q) pageTitle = `Search: "${q}"`;

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.data)); }, []);

  useEffect(() => {
    dispatch(fetchProducts({
      q: q || undefined,
      category: category || undefined,
      tag: tag || undefined,
      sort,
      page,
      limit: 12,
    }));
  }, [dispatch, q, category, tag, sort, page]);

  useEffect(() => {
    if (!q.trim() || status === 'loading') return undefined;
    const timer = setTimeout(() => {
      storeProductSearch(q, {
        source: 'products',
        categoryId: category || undefined,
        categoryName: selectedCategory?.name,
        resultsCount: pagination?.total ?? list.length,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [q, category, selectedCategory?.name, status, pagination?.total, list.length]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, v);
    });
    if (patch.page === undefined) next.delete('page');
    setParams(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiGrid className="text-primary" /> {pageTitle}</h1>
        {(tag || q || params.has('sort') || category) && (
          <button
            type="button"
            className="btn-ghost text-sm py-1.5 px-3"
            onClick={() => setParams({})}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="card p-3 sm:p-4 space-y-3">
        <SearchAutocomplete
          placeholder="Search products..."
          value={q}
          onChange={(value) => update({ q: value })}
          onSelect={(suggestion) => {
            // Update search with selected suggestion
            update({ q: suggestion.name || suggestion });
          }}
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Category</p>
          <ChipRow>
            <Chip active={!category} onClick={() => update({ category: '' })}>All</Chip>
            {topLevelCategories.map((c) => (
              <Chip key={c._id} active={category === c._id} onClick={() => update({ category: c._id })}>
                {c.name}
              </Chip>
            ))}
          </ChipRow>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Sort by</p>
          <ChipRow>
            {SORT_OPTIONS.map((s) => (
              <Chip key={s.value} active={sort === s.value} onClick={() => update({ sort: s.value })}>
                {s.label}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </div>

      {status === 'loading' ? (
        <Loader />
      ) : list.length === 0 ? (
        <Empty title="No products found" hint="Try a different search or category." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {list.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button className="btn-outline inline-flex items-center gap-1" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                <FiArrowLeft /> Prev
              </button>
              <span className="px-3 py-2 text-sm">Page {page} of {pagination.pages}</span>
              <button className="btn-outline inline-flex items-center gap-1" disabled={page >= pagination.pages} onClick={() => update({ page: page + 1 })}>
                Next <FiArrowRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
