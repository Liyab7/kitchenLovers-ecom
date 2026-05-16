import { Notification } from '../models/Notification.js';
import { emitToUser, emitToAdmins } from './socket.service.js';

/**
 * Persist a notification for a user AND push it over Socket.IO in real time.
 */
export async function notifyUser(userId, { type, title, body, data }) {
  const notif = await Notification.create({ user: userId, type, title, body, data });
  emitToUser(userId, 'notification:new', notif);
  return notif;
}

/**
 * Push a real-time payload to a specific user without persisting a notification.
 * Use for live record updates (order:updated, refund:updated) where the customer
 * is on a detail page and we want it to refresh instantly.
 */
export function pushUserEvent(userId, event, payload) {
  emitToUser(userId, event, payload);
}

export async function notifyAdmins(event, payload) {
  emitToAdmins(event, payload);
}
