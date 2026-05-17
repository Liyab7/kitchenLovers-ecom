import { io } from 'socket.io-client';
import { getTokens } from './api.js';

const apiHost = import.meta.env.VITE_API_HOST;
const URL =
  import.meta.env.VITE_SOCKET_URL ||
  (apiHost ? `https://${apiHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '/');

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  const { accessToken } = getTokens();
  socket = io(URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
