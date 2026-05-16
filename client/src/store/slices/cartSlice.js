import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    hydrateCart: (state) => {
      try {
        const raw = localStorage.getItem('cart');
        state.items = raw ? JSON.parse(raw) : [];
      } catch {
        state.items = [];
      }
    },
    addItem: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.product._id === product._id);
      if (existing) existing.quantity += quantity;
      else state.items.push({ product, quantity });
    },
    setQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const it = state.items.find((i) => i.product._id === productId);
      if (!it) return;
      if (quantity <= 0) state.items = state.items.filter((i) => i.product._id !== productId);
      else it.quantity = quantity;
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.product._id !== action.payload);
    },
    clearCart: (state) => { state.items = []; },
  },
});

export const { hydrateCart, addItem, setQuantity, removeItem, clearCart } = slice.actions;

export const selectCartCount = (s) => s.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

export default slice.reducer;
