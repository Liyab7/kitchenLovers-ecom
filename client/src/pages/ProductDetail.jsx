import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiShoppingCart, FiStar, FiTruck, FiShield, FiRefreshCw,
  FiCheckCircle, FiAlertTriangle, FiZap, FiPlus, FiMinus, FiHome, FiChevronRight,
} from 'react-icons/fi';
import { fetchProduct } from '../store/slices/productsSlice.js';
import { addItem } from '../store/slices/cartSlice.js';
import Loader from '../components/common/Loader.jsx';
import ReviewForm from '../components/common/ReviewForm.jsx';
import VoicePlayer from '../components/common/VoicePlayer.jsx';
import { api } from '../services/api.js';
import { fmt } from '../utils/format.js';
import toast from 'react-hot-toast';

const TAB_DETAILS = 'details';
const TAB_REVIEWS = 'reviews';

function StockBadge({ product }) {
  if (!product.trackInventory) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success font-medium text-sm">
        <FiCheckCircle /> In stock
      </span>
    );
  }
  if (product.stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger font-medium text-sm">
        <FiAlertTriangle /> Out of stock
      </span>
    );
  }
  if (product.stock <= product.lowStockThreshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger font-medium text-sm">
        <FiAlertTriangle /> Only {product.stock} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-success font-medium text-sm">
      <FiCheckCircle /> In stock
    </span>
  );
}

function Thumbs({ images, activeIdx, onPick }) {
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin pb-1">
      {images.map((img, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 shrink-0 transition ${
            i === activeIdx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
          }`}
        >
          <img src={img.url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const product = useSelector((s) => s.products.current);
  const user = useSelector((s) => s.auth.user);

  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState(TAB_DETAILS);
  const [eligibleOrderId, setEligibleOrderId] = useState(null);

  useEffect(() => {
    setQty(1);
    setActiveImg(0);
    setTab(TAB_DETAILS);
    dispatch(fetchProduct(idOrSlug));
  }, [dispatch, idOrSlug]);

  useEffect(() => {
    if (!product?._id) return;
    api.get(`/products/${product._id}/reviews`).then((r) => setReviews(r.data.data));
    const cat = product.categories?.[0];
    const catId = cat?._id || cat;
    if (catId) {
      api.get('/products', { params: { category: catId, limit: 6 } }).then((r) => {
        setRelated((r.data.data || []).filter((p) => p._id !== product._id).slice(0, 4));
      });
    } else {
      setRelated([]);
    }
  }, [product?._id]);

  // Eligibility: any delivered order from this user that contains this product → can leave one review.
  useEffect(() => {
    if (!product?._id || !user) { setEligibleOrderId(null); return; }
    api.get('/orders/mine').then(({ data }) => {
      const orders = data.data || [];
      const already = reviews.some((r) => r.user?._id === user._id || r.user === user._id);
      if (already) { setEligibleOrderId(null); return; }
      const candidate = orders.find((o) =>
        o.status === 'delivered' && o.items.some((i) => (i.product?._id || i.product) === product._id)
      );
      setEligibleOrderId(candidate?._id || null);
    }).catch(() => setEligibleOrderId(null));
  }, [product?._id, user, reviews.length]);

  const images = useMemo(() => (product?.images?.length ? product.images : []), [product]);
  const out = product?.trackInventory && product?.stock <= 0;
  const maxQty = product?.trackInventory ? Math.max(1, product.stock || 1) : 99;

  if (!product) return <Loader />;

  function add() {
    dispatch(addItem({ product, quantity: qty }));
    toast.success('Added to cart');
  }

  function buyNow() {
    if (out) return;
    dispatch(addItem({ product, quantity: qty }));
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-ink/60 inline-flex items-center gap-1 flex-wrap">
        <Link to="/" className="inline-flex items-center gap-1 no-underline hover:text-primary"><FiHome /> Home</Link>
        <FiChevronRight className="opacity-60" />
        <Link to="/products" className="no-underline hover:text-primary">Shop</Link>
        {product.categories?.[0]?.name && (
          <>
            <FiChevronRight className="opacity-60" />
            <Link to={`/products?category=${product.categories[0]._id}`} className="no-underline hover:text-primary">
              {product.categories[0].name}
            </Link>
          </>
        )}
        <FiChevronRight className="opacity-60" />
        <span className="text-ink/80 truncate max-w-[40ch]">{product.name}</span>
      </nav>

      {/* Main: image + buy box */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="card overflow-hidden bg-canvas">
            {images[activeImg]?.url ? (
              <img
                src={images[activeImg].url}
                alt={product.name}
                className="w-full aspect-square object-contain bg-white"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center text-ink/30">No image</div>
            )}
          </div>
          <Thumbs images={images} activeIdx={activeImg} onPick={setActiveImg} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="card p-5 sm:p-6 space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold leading-tight">{product.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-ink/70">
                {product.averageRating > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <FiStar className="text-primary" /> {product.averageRating.toFixed(1)} ({product.reviewsCount} review{product.reviewsCount === 1 ? '' : 's'})
                  </span>
                ) : (
                  <span className="text-ink/50">No reviews yet</span>
                )}
                {product.salesCount > 0 && <span className="text-ink/50">• {product.salesCount} sold</span>}
              </div>
            </div>

            <div className="border-t border-ink/5 pt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary">{fmt(product.price, product.currency)}</div>
              <div className="mt-2"><StockBadge product={product} /></div>
            </div>

            <div className="border-t border-ink/5 pt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Quantity</p>
                <div className="inline-flex items-stretch border border-ink/15 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="px-3 hover:bg-ink/5 disabled:opacity-40"
                    aria-label="Decrease"
                  >
                    <FiMinus />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                    className="w-14 text-center outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    className="px-3 hover:bg-ink/5 disabled:opacity-40"
                    aria-label="Increase"
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={add}
                  disabled={out}
                  className="btn-outline py-3 inline-flex items-center justify-center gap-2 border-primary text-primary hover:bg-primary/5"
                >
                  <FiShoppingCart /> Add to cart
                </button>
                <button
                  onClick={buyNow}
                  disabled={out}
                  className="btn-primary py-3 inline-flex items-center justify-center gap-2"
                >
                  <FiZap /> Buy now
                </button>
              </div>
            </div>
          </div>

          <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink/70">
            <div className="inline-flex items-center gap-2"><FiTruck className="text-primary text-lg" /> Fast delivery</div>
            <div className="inline-flex items-center gap-2"><FiShield className="text-primary text-lg" /> Secure payment</div>
            <div className="inline-flex items-center gap-2"><FiRefreshCw className="text-primary text-lg" /> 7-day returns</div>
          </div>
        </div>
      </div>

      {/* Tabs: Details / Reviews */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-ink/10">
          <button
            onClick={() => setTab(TAB_DETAILS)}
            className={`px-5 py-3 text-sm font-medium ${tab === TAB_DETAILS ? 'text-primary border-b-2 border-primary' : 'text-ink/60 hover:text-ink'}`}
          >
            Product details
          </button>
          <button
            onClick={() => setTab(TAB_REVIEWS)}
            className={`px-5 py-3 text-sm font-medium ${tab === TAB_REVIEWS ? 'text-primary border-b-2 border-primary' : 'text-ink/60 hover:text-ink'}`}
          >
            Reviews ({reviews.length})
          </button>
        </div>
        <div className="p-5 sm:p-6">
          {tab === TAB_DETAILS ? (
            product.description ? (
              <div className="prose max-w-none text-ink/80 whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
            ) : (
              <p className="text-ink/50">No description provided.</p>
            )
          ) : (
            <div className="space-y-5">
              {eligibleOrderId && (
                <ReviewForm
                  productId={product._id}
                  orderId={eligibleOrderId}
                  onSubmitted={(r) => { setReviews((prev) => [r, ...prev]); setEligibleOrderId(null); }}
                />
              )}
              {reviews.length === 0 ? (
                <p className="text-ink/60">No reviews yet. Buy and receive this product to leave the first review.</p>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((r) => (
                    <li key={r._id} className="border border-ink/10 rounded-md p-4">
                      <p className="font-medium inline-flex items-center gap-2">
                        {r.user?.fullName || 'Customer'}
                        <span className="inline-flex items-center gap-1 text-primary"><FiStar /> {r.rating}</span>
                        {r.isFeatured && <span className="badge bg-success/10 text-success">Featured</span>}
                      </p>
                      {r.title && <p className="text-sm font-medium mt-1">{r.title}</p>}
                      {r.comment && <p className="text-sm text-ink/80 mt-1 whitespace-pre-line">{r.comment}</p>}
                      {r.voiceNoteUrl && (
                        <div className="mt-3"><VoicePlayer src={r.voiceNoteUrl} /></div>
                      )}
                      {r.photos?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.photos.map((p, i) => (
                            <a key={i} href={p.url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-md overflow-hidden border border-ink/10 block">
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-ink/50 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section>
          <h2 className="text-lg mb-3">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => (
              <Link key={p._id} to={`/products/${p.slug || p._id}`} className="card overflow-hidden no-underline text-ink hover:shadow-md transition">
                <div className="aspect-square bg-canvas overflow-hidden">
                  {p.images?.[0]?.url && (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm line-clamp-2">{p.name}</p>
                  <p className="text-primary font-semibold mt-1">{fmt(p.price, p.currency)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
