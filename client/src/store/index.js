import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import cartReducer, { hydrateCart } from './slices/cartSlice.js';
import productsReducer from './slices/productsSlice.js';
import ordersReducer from './slices/ordersSlice.js';
import uiReducer from './slices/uiSlice.js';
import notificationsReducer from './slices/notificationsSlice.js';
import wishlistReducer from './slices/wishlistSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productsReducer,
    orders: ordersReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
    wishlist: wishlistReducer,
  },
});

store.dispatch(hydrateCart());

store.subscribe(() => {
  const { cart } = store.getState();
  localStorage.setItem('cart', JSON.stringify(cart.items));
});
