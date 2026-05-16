import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, setAuthTokens } from '../../services/api.js';

const hasStoredSession = () => !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
const hasInitialSession = hasStoredSession();

const storedUser = (() => {
  if (!hasInitialSession) {
    localStorage.removeItem('user');
    return null;
  }
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
})();

export const registerThunk = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Registration failed');
  }
});

export const verifyOtpThunk = createAsyncThunk('auth/verifyOtp', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/verify-otp', payload);
    setAuthTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data.user;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'OTP verification failed');
  }
});

export const resendOtpThunk = createAsyncThunk('auth/resendOtp', async (payload, { rejectWithValue }) => {
  try {
    await api.post('/auth/resend-otp', payload);
    return true;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to resend OTP');
  }
});

export const loginThunk = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    setAuthTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data.user;
  } catch (e) {
    const body = e.response?.data;
    if (body?.code === 'PHONE_NOT_VERIFIED') {
      return rejectWithValue({ code: 'PHONE_NOT_VERIFIED', phone: body.data?.phone });
    }
    return rejectWithValue(body?.message || 'Login failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
  setAuthTokens({ accessToken: null, refreshToken: null });
  localStorage.removeItem('user');
});

export const clearAuthSession = createAsyncThunk('auth/clearSession', async () => {
  setAuthTokens({ accessToken: null, refreshToken: null });
  localStorage.removeItem('user');
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(data.data));
    return data.data;
  } catch (e) {
    const status = e.response?.status;
    if (status === 401) {
      setAuthTokens({ accessToken: null, refreshToken: null });
      localStorage.removeItem('user');
    }
    return rejectWithValue({ status, message: e.response?.data?.message || 'Failed' });
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    status: hasInitialSession ? 'checking' : 'idle',
    error: null,
    pendingPhone: null,
  },
  reducers: {
    setPendingPhone: (s, a) => { s.pendingPhone = a.payload; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(registerThunk.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(registerThunk.fulfilled, (s, a) => { s.status = 'idle'; s.pendingPhone = a.payload.phone; })
      .addCase(registerThunk.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })
      .addCase(verifyOtpThunk.fulfilled, (s, a) => { s.user = a.payload; s.pendingPhone = null; })
      .addCase(loginThunk.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(loginThunk.fulfilled, (s, a) => { s.status = 'idle'; s.user = a.payload; })
      .addCase(loginThunk.rejected, (s, a) => {
        s.status = 'idle';
        if (a.payload?.code === 'PHONE_NOT_VERIFIED') s.pendingPhone = a.payload.phone;
        s.error = typeof a.payload === 'string' ? a.payload : a.payload?.code || 'Login failed';
      })
      .addCase(logoutThunk.fulfilled, (s) => { s.user = null; })
      .addCase(clearAuthSession.fulfilled, (s) => {
        s.user = null;
        s.status = 'idle';
        s.error = null;
      })
      .addCase(fetchMe.pending, (s) => {
        s.status = 'checking';
        s.error = null;
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.status = 'idle';
        s.user = a.payload;
      })
      .addCase(fetchMe.rejected, (s, a) => {
        s.status = 'idle';
        if (a.payload?.status === 401) s.user = null;
        s.error = a.payload?.message || 'Failed';
      });
  },
});

export const { setPendingPhone, clearError } = slice.actions;
export default slice.reducer;
