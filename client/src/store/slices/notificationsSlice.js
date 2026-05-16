import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api.js';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const { data } = await api.get('/notifications');
  return data.data;
});

export const markNotificationRead = createAsyncThunk('notifications/read', async (id) => {
  await api.patch(`/notifications/${id}/read`);
  return id;
});

const slice = createSlice({
  name: 'notifications',
  initialState: { list: [], unread: 0 },
  reducers: {
    pushRealtime: (s, a) => {
      s.list.unshift(a.payload);
      s.unread += 1;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.list = a.payload;
        s.unread = a.payload.filter((n) => !n.isRead).length;
      })
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        const n = s.list.find((x) => x._id === a.payload);
        if (n && !n.isRead) { n.isRead = true; s.unread = Math.max(0, s.unread - 1); }
      });
  },
});

export const { pushRealtime } = slice.actions;
export default slice.reducer;
