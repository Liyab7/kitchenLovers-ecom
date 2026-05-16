import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiTrash2, FiShoppingCart, FiArrowRight, FiPlus, FiMinus, FiArrowLeft } from 'react-icons/fi';
import { setQuantity, removeItem, selectCartSubtotal } from '../store/slices/cartSlice.js';
import Empty from '../components/common/Empty.jsx';
import { fmt } from '../utils/format.js';

export default function Cart() {
  const items = useSelector((s) => s.cart.items);
  const subtotal = useSelector(selectCartSubtotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Empty
        icon={FiShoppingCart}
        title="Your cart is empty"
        hint="Browse our products and add something delicious to get started."
        action={(
          <Link to="/products" className="btn-primary inline-flex items-center gap-2 no-underline">
            Start shopping <FiArrowRight />
          </Link>
        )}
      />
    );
  }

  const currency = items[0]?.product.currency || 'GHS';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold inline-flex items-center gap-2">
          <FiShoppingCart className="text-primary" /> Your cart
          <span className="badge-muted ml-1">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </h1>
        <Link to="/products" className="text-sm text-ink/60 hover:text-primary inline-flex items-center gap-1 no-underline">
          <FiArrowLeft /> Continue shopping
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card divide-y divide-ink/10">
          {items.map(({ product, quantity }) => {
            const lineTotal = product.price * quantity;
            return (
              <div key={product._id} className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                <Link to={`/products/${product.slug || product._id}`} className="shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-canvas overflow-hidden rounded-lg border border-ink/10">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink/25 text-[10px]">No image</div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${product.slug || product._id}`}
                        className="font-semibold text-ink no-underline text-sm sm:text-base line-clamp-2"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-ink/55 mt-0.5">{fmt(product.price, product.currency)} each</p>
                    </div>
                    <p className="font-semibold text-primary tabular-nums text-sm sm:text-base whitespace-nowrap shrink-0">
                      {fmt(lineTotal, currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center border border-ink/12 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => dispatch(setQuantity({ productId: product._id, quantity: Math.max(1, quantity - 1) }))}
                        className="w-7 h-7 flex items-center justify-center text-ink/70 hover:bg-ink/5"
                        aria-label="Decrease"
                      >
                        <FiMinus className="text-xs" />
                      </button>
                      <span className="px-3 text-sm font-medium tabular-nums">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => dispatch(setQuantity({ productId: product._id, quantity: quantity + 1 }))}
                        className="w-7 h-7 flex items-center justify-center text-ink/70 hover:bg-ink/5"
                        aria-label="Increase"
                      >
                        <FiPlus className="text-xs" />
                      </button>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(product._id))}
                      className="text-xs text-ink/45 hover:text-danger inline-flex items-center gap-1"
                    >
                      <FiTrash2 className="text-xs" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="card p-4 sm:p-5 h-fit space-y-3 lg:sticky lg:top-24">
          <h3 className="font-semibold text-base">Order summary</h3>
          <div className="flex justify-between text-sm">
            <span className="text-ink/65">Subtotal</span>
            <span className="font-medium tabular-nums">{fmt(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/65">Shipping</span>
            <span className="text-ink/55">Calculated at checkout</span>
          </div>
          <div className="border-t border-ink/10 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary tabular-nums">{fmt(subtotal, currency)}</span>
          </div>
          <button className="btn-primary w-full mt-1" onClick={() => navigate('/checkout')}>
            Proceed to checkout <FiArrowRight />
          </button>
          <p className="text-[11px] text-ink/45 text-center pt-1">
            Secure encrypted checkout · 7-day returns
          </p>
        </aside>
      </div>
    </div>
  );
}
