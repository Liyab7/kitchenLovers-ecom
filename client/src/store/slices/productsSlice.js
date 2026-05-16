import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api.js';

export const fetchProducts = createAsyncThunk('products/fetch', async (params = {}) => {
  const { data } = await api.get('/products', { params });
  return data;
});

export const fetchProduct = createAsyncThunk('products/fetchOne', async (idOrSlug) => {
  const { data } = await api.get(`/products/${idOrSlug}`);
  return data.data;
});

const slice = createSlice({
  name: 'products',
  initialState: { list: [], pagination: null, current: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchProducts.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.status = 'idle';
        s.list = a.payload.data;
        s.pagination = a.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (s, a) => { s.status = 'idle'; s.error = a.error.message; })
      .addCase(fetchProduct.fulfilled, (s, a) => { s.current = a.payload; });
  },
});

export default slice.reducer;
