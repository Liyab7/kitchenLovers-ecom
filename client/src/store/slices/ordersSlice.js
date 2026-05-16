import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api.js';
import { clearCart } from './cartSlice.js';

function getErrorMessage(error, fallback) {
  const body = error.response?.data;
  if (Array.isArray(body?.details) && body.details.length > 0) {
    return body.details.map((d) => d.message).join(', ');
  }
  return body?.message || fallback;
}

export const placeOrder = createAsyncThunk('orders/place', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders', payload);
    dispatch(clearCart());
    return data.data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, 'Failed to place order'));
  }
});

export const fetchMyOrders = createAsyncThunk('orders/mine', async (params = {}) => {
  const { data } = await api.get('/orders/mine', { params });
  return data;
});

export const fetchOrder = createAsyncThunk('orders/one', async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data.data;
});

export const verifyPayment = createAsyncThunk('orders/verifyPayment', async (reference) => {
  const { data } = await api.get(`/payments/verify/${reference}`);
  return data.data;
});

const slice = createSlice({
  name: 'orders',
  initialState: { mine: [], current: null, lastPlaced: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(placeOrder.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(placeOrder.fulfilled, (s, a) => { s.status = 'idle'; s.lastPlaced = a.payload; })
      .addCase(placeOrder.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })
      .addCase(fetchMyOrders.fulfilled, (s, a) => { s.mine = a.payload.data; })
      .addCase(fetchOrder.fulfilled, (s, a) => { s.current = a.payload; });
  },
});

export default slice.reducer;
