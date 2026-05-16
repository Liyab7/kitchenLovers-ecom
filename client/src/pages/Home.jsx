import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTruck, FiShield, FiRefreshCw, FiHeadphones, FiArrowRight, FiGrid, FiChevronRight, FiChevronLeft, FiTag,
} from 'react-icons/fi';
import { api } from '../services/api.js';
import ProductCard from '../components/common/ProductCard.jsx';
import Loader from '../components/common/Loader.jsx';
import { getTopLevelCategories } from '../utils/categories.js';

const TRUST = [
  { Icon: FiTruck, title: 'Free Delivery', body: 'On orders over GHS 500' },
  { Icon: FiShield, title: 'Secure Payments', body: '100% secure checkout' },
  { Icon: FiRefreshCw, title: 'Easy Returns', body: '30 days return policy' },
  { Icon: FiHeadphones, title: '24/7 Support', body: 'Dedicated support' },
];

function HeroBanner({ banners }) {
  const list = banners && banners.length > 0 ? banners : [null];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (list.length <= 1 || paused) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), 2000);
    return () => clearInterval(id);
  }, [list.length, paused]);

  useEffect(() => {
    if (index >= list.length) setIndex(0);
  }, [list.length, index]);

  const active = list[index] || {};
  // Admin can type literal "\n" in the input to request a line break — convert to real newline.
  const title = (active.title || 'Cook Better.\nLive Better.').replace(/\\n/g, '\n');
  const subtitle = active.subtitle || 'Discover premium kitchen essentials for every home chef.';
  const eyebrow = active.subtitle ? null : 'Top Quality Kitchenware';
  const cta = active.ctaLabel || 'Shop Now';
  const link = active.linkUrl || '/products';

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-canvas shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid md:grid-cols-2 min-h-[240px] sm:min-h-[360px] lg:min-h-[420px]">
        <div className="p-5 sm:p-10 lg:p-14 flex flex-col justify-center gap-3 sm:gap-4 z-10">
          {eyebrow && (
            <p className="text-primary text-[10px] sm:text-sm font-semibold uppercase tracking-widest">{eyebrow}</p>
          )}
          {active.subtitle && (
            <p className="text-primary text-[10px] sm:text-sm font-semibold uppercase tracking-widest">{active.subtitle}</p>
          )}
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-extrabold text-ink leading-[1.05] whitespace-pre-line">
            {title}
          </h1>
          <div className="w-10 sm:w-12 h-1 bg-primary rounded-full" />
          {!active.subtitle && (
            <p className="text-ink/70 text-xs sm:text-base max-w-md">{subtitle}</p>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Link to={link} className="btn-primary inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base no-underline">
              {cta} <FiArrowRight />
            </Link>
            <Link to="/products?tag=deals" className="btn-outline inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base no-underline">
              Explore Deals
            </Link>
          </div>
        </div>
        <div className="relative hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15" />
          {list.map((b, i) => {
            const src = b?.imageUrl || (i === 0 ? '/brand/hero.jpg' : null);
            if (!src) return null;
            return (
              <img
                key={(b?._id || 'fallback') + i}
                src={src}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            );
          })}
        </div>
      </div>
      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-ink/25 hover:bg-ink/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryTile({ category }) {
  return (
    <Link
      to={`/products?category=${category._id}`}
      className="card overflow-hidden no-underline text-ink hover:shadow-md transition-shadow group"
    >
      <div className="aspect-square bg-canvas overflow-hidden">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/30">
            <FiGrid className="text-3xl" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm sm:text-base">{category.name}</p>
        <p className="text-primary text-xs mt-1 inline-flex items-center gap-1">
          Shop now <FiArrowRight />
        </p>
      </div>
    </Link>
  );
}

function CategoryCarousel({ categories }) {
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const start = page * PAGE_SIZE;
  const slice = categories.slice(start, start + PAGE_SIZE);

  // Pad the slice so the grid always renders 6 columns even on the last page
  const padded = [...slice];
  while (padded.length < PAGE_SIZE) padded.push(null);

  return (
    <section>
      <div className="text-center mb-5 sm:mb-6 flex flex-col sm:block">
        <p className="text-primary text-[11px] uppercase tracking-widest font-semibold">Browse Categories</p>
        <h2 className="text-xl sm:text-3xl font-extrabold mt-1">Shop by Category</h2>
        <p className="text-ink/60 text-xs sm:text-sm mt-1">Everything you need for your kitchen</p>
      </div>
      <div className="relative">
        {totalPages > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
              aria-label="Previous categories"
              className="absolute left-1 sm:-left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-md border border-ink/10 text-ink hover:text-primary hover:border-primary flex items-center justify-center"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => (p + 1) % totalPages)}
              aria-label="More categories"
              className="absolute right-1 sm:-right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-md border border-ink/10 text-ink hover:text-primary hover:border-primary flex items-center justify-center"
            >
              <FiChevronRight />
            </button>
          </>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 px-2 sm:px-0">
          {padded.map((c, i) => c ? (
            <CategoryTile key={c._id} category={c} />
          ) : (
            <div key={`placeholder-${i}`} className="invisible" aria-hidden="true" />
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Categories page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-primary' : 'w-1.5 bg-ink/25 hover:bg-ink/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PromoCard({ tone = 'green', eyebrow, title, body, ctaLabel, ctaLink, image }) {
  const palette = {
    green: 'bg-emerald-50',
    orange: 'bg-primary/5',
    cream: 'bg-amber-50',
  }[tone] || 'bg-canvas';

  return (
    <Link
      to={ctaLink || '/products'}
      className={`relative overflow-hidden rounded-2xl ${palette} shadow-card no-underline text-ink block`}
    >
      <div className="grid grid-cols-[1.1fr_1fr] min-h-[160px] sm:min-h-[180px]">
        <div className="p-4 sm:p-6 flex flex-col justify-center gap-1.5 sm:gap-2">
          {eyebrow && <p className="text-primary text-[10px] sm:text-[11px] uppercase tracking-widest font-semibold">{eyebrow}</p>}
          <h3 className="text-base sm:text-2xl font-bold leading-tight">{title}</h3>
          {body && <p className="text-[11px] sm:text-sm text-ink/70">{body}</p>}
          <span className="btn-primary inline-flex items-center gap-1.5 w-fit mt-1.5 sm:mt-2 text-xs sm:text-sm py-2 sm:py-2 px-3 sm:px-4">
            {ctaLabel || 'Shop Now'} <FiArrowRight />
          </span>
        </div>
        <div className="relative">
          {image ? (
            <img src={image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink/20">
              <FiTag className="text-4xl" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [dealBanners, setDealBanners] = useState([]);
  const [newArrivalsBanners, setNewArrivalsBanners] = useState([]);
  const [secondaryBanners, setSecondaryBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/products', { params: { limit: 24, sort: '-createdAt' } }),
      api.get('/products', { params: { limit: 6, sort: '-salesCount' } }).catch(() => ({ data: { data: [] } })),
      api.get('/categories'),
      api.get('/banners', { params: { placement: 'home_hero' } }).catch(() => ({ data: { data: [] } })),
      api.get('/banners', { params: { placement: 'home_deal' } }).catch(() => ({ data: { data: [] } })),
      api.get('/banners', { params: { placement: 'home_new_arrivals' } }).catch(() => ({ data: { data: [] } })),
      api.get('/banners', { params: { placement: 'home_secondary' } }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([p, bs, c, hb, db, nb, sb]) => {
        if (!active) return;
        setProducts(p.data.data);
        setBestSellers(bs.data.data || []);
        setCategories(c.data.data);
        setHeroBanners(hb.data.data || []);
        setDealBanners(db.data.data || []);
        setNewArrivalsBanners(nb.data.data || []);
        setSecondaryBanners(sb.data.data || []);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const topLevelCategories = getTopLevelCategories(categories);

  // Best Sellers: only items that have actually sold. Hides the section entirely if no sales exist yet.
  const bestSellerList = useMemo(
    () => bestSellers.filter((p) => (p.salesCount || 0) > 0).slice(0, 8),
    [bestSellers]
  );

  // New Arrivals: newest products, excluding anything already shown as a best seller so the two rails don't overlap.
  const newArrivals = useMemo(() => {
    const bestIds = new Set(bestSellerList.map((p) => p._id));
    return products.filter((p) => !bestIds.has(p._id)).slice(0, 8);
  }, [products, bestSellerList]);

  const dealPromo = dealBanners[0] || secondaryBanners[0];
  const newPromo = newArrivalsBanners[0] || secondaryBanners[1];

  if (loading) return <Loader />;

  return (
    <div className="space-y-10 sm:space-y-12">
      <HeroBanner banners={heroBanners} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TRUST.map(({ Icon, title, body }) => (
          <div key={title} className="card p-4 flex items-center gap-3">
            <div className="text-primary text-2xl shrink-0 bg-primary/5 rounded-xl w-11 h-11 flex items-center justify-center">
              <Icon />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-ink/60 truncate">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {topLevelCategories.length > 0 && (
        <CategoryCarousel categories={topLevelCategories} />
      )}

      {(dealPromo || newPromo || products.length > 0) && (
        <section className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <PromoCard
            tone="green"
            eyebrow={dealPromo?.eyebrow || 'Deal of the Day'}
            title={dealPromo?.title || 'Up to 40% Off'}
            body={dealPromo?.subtitle || 'On selected items'}
            ctaLabel={dealPromo?.ctaLabel || 'Shop the Deal'}
            ctaLink={dealPromo?.linkUrl || '/products?tag=deals'}
            image={dealPromo?.imageUrl}
          />
          <PromoCard
            tone="orange"
            eyebrow={newPromo?.eyebrow || 'New Arrivals'}
            title={newPromo?.title || 'Check out the latest kitchen essentials'}
            body={newPromo?.subtitle}
            ctaLabel={newPromo?.ctaLabel || 'Shop Now'}
            ctaLink={newPromo?.linkUrl || '/products?sort=-createdAt'}
            image={newPromo?.imageUrl}
          />
        </section>
      )}

      {bestSellerList.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold">Best Sellers</h2>
            <Link to="/products?sort=-salesCount" className="text-primary text-sm no-underline inline-flex items-center gap-1">
              View all <FiChevronRight />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {bestSellerList.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold">New Arrivals</h2>
            <Link to="/products?sort=-createdAt" className="text-primary text-sm no-underline inline-flex items-center gap-1">
              View all <FiChevronRight />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {newArrivals.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      <section className="card p-6 sm:p-8 bg-gradient-to-r from-primary/5 via-white to-primary/5 text-center">
        <p className="text-primary text-[11px] uppercase tracking-widest font-semibold">Stay Updated</p>
        <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Join our newsletter</h2>
        <p className="text-ink/60 text-sm mt-1 max-w-md mx-auto">
          Subscribe to get special offers, free recipes and new product updates.
        </p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="input flex-1"
            aria-label="Email address"
          />
          <button type="submit" className="btn-primary px-6">Subscribe</button>
        </form>
      </section>
    </div>
  );
}
