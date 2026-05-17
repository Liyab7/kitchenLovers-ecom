import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiStar, FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { addItem } from '../../store/slices/cartSlice.js';
import { addToWishlistThunk, removeFromWishlistThunk } from '../../store/slices/wishlistSlice.js';
import { fmt } from '../../utils/format.js';

export default function ProductCard({ product, hideNewBadge = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const inWishlist = useSelector((s) => s.wishlist.items.some((i) => i._id === product._id));

  const img = product.images?.[0]?.url;
  const isNew = product.createdAt && Date.now() - new Date(product.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;
  const out = product.trackInventory && product.stock <= 0;

  function quickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addItem({ product, quantity: 1 }));
    toast.success('Added to cart');
  }

  async function toggleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Sign in to save items', { icon: '💛' });
      navigate('/login');
      return;
    }
    if (inWishlist) {
      const res = await dispatch(removeFromWishlistThunk(product._id));
      if (removeFromWishlistThunk.fulfilled.match(res)) toast.success('Removed from wishlist');
    } else {
      const res = await dispatch(addToWishlistThunk(product));
      if (addToWishlistThunk.fulfilled.match(res)) toast.success('Saved to wishlist');
    }
  }

  return (
    <Link
      to={`/products/${product.slug || product._id}`}
      className="card overflow-hidden flex flex-col group relative no-underline text-ink hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isNew && !hideNewBadge && <span className="badge-success">New</span>}
        {out && <span className="badge-muted">Sold out</span>}
      </div>

      <button
        type="button"
        onClick={toggleWishlist}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-base hover:bg-white hover:scale-110 transition"
      >
        {inWishlist ? <FaHeart className="text-danger" /> : <FiHeart className="text-ink/50" />}
      </button>

      <div className="aspect-square bg-canvas overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/25 text-xs uppercase tracking-wider">No image</div>
        )}
      </div>

      <div className="p-3 sm:p-3.5 flex flex-col flex-1 gap-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.4rem]">
          {product.name}
        </h3>

        {product.averageRating > 0 && (
          <span className="text-[11px] text-ink/55 inline-flex items-center gap-1">
            <FiStar className="text-primary" /> {product.averageRating.toFixed(1)}
            <span className="text-ink/35">({product.reviewsCount})</span>
          </span>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-primary text-base sm:text-lg font-bold tracking-tight">{fmt(product.price, product.currency)}</span>
          <button
            type="button"
            onClick={quickAdd}
            disabled={out}
            aria-label={out ? 'Out of stock' : 'Add to cart'}
            className="w-8 h-8 rounded-md bg-primary text-white inline-flex items-center justify-center hover:bg-primary-600 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <FiShoppingCart className="text-sm" />
          </button>
        </div>

        {product.trackInventory && product.stock > 0 && product.stock <= 5 && (
          <p className="text-[10px] text-danger font-medium">Only {product.stock} left</p>
        )}
      </div>
    </Link>
  );
}
