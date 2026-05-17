import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiHeart } from 'react-icons/fi';
import { fetchWishlist } from '../store/slices/wishlistSlice.js';
import ProductCard from '../components/common/ProductCard.jsx';
import Loader from '../components/common/Loader.jsx';
import Empty from '../components/common/Empty.jsx';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.wishlist);

  useEffect(() => { dispatch(fetchWishlist()); }, [dispatch]);

  if (status === 'loading' && items.length === 0) return <Loader />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold inline-flex items-center gap-2">
        <FiHeart className="text-primary" /> My wishlist
      </h1>

      {items.length === 0 ? (
        <Empty title="Nothing saved yet" hint="Tap the heart on any product to save it for later." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
