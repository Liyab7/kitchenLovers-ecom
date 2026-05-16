import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api.js';

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/me/wishlist');
    return data.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed');
  }
});

export const addToWishlistThunk = createAsyncThunk('wishlist/add', async (product, { rejectWithValue }) => {
  try {
    await api.post('/me/wishlist', { productId: product._id });
    return product;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed');
  }
});

export const removeFromWishlistThunk = createAsyncThunk('wishlist/remove', async (productId, { rejectWithValue }) => {
  try {
    await api.delete(`/me/wishlist/${productId}`);
    return productId;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed');
  }
});

const slice = createSlice({
  name: 'wishlist',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {
    clearWishlist: (s) => { s.items = []; },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchWishlist.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchWishlist.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload || []; })
      .addCase(fetchWishlist.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })
      .addCase(addToWishlistThunk.fulfilled, (s, a) => {
        if (!s.items.some((i) => i._id === a.payload._id)) s.items.unshift(a.payload);
      })
      .addCase(removeFromWishlistThunk.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i._id !== a.payload);
      });
  },
});

export const selectWishlistIds = (s) => s.wishlist.items.map((i) => i._id);
export const selectInWishlist = (productId) => (s) => s.wishlist.items.some((i) => i._id === productId);
export const { clearWishlist } = slice.actions;
export default slice.reducer;
