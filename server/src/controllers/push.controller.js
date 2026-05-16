import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { getPublicVapidKey, isPushLive, sendPushToUser } from '../services/push.service.js';

// Anonymous: surface the public key so the browser can subscribe
export const publicKey = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { publicKey: getPublicVapidKey(), enabled: isPushLive() } });
});

// Customer: register a push subscription
export const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw ApiError.badRequest('Invalid subscription');

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: req.user._id,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: req.get('user-agent'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true });
});

// Customer: remove a subscription by endpoint
export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) throw ApiError.badRequest('endpoint required');
  await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  res.json({ success: true });
});

// Customer: send self a test notification (handy for debugging)
export const sendTest = asyncHandler(async (req, res) => {
  const result = await sendPushToUser(req.user._id, {
    title: 'KitchenLovers test 🔔',
    body: 'Push notifications are working for this device.',
    url: '/',
  });
  res.json({ success: true, data: result });
});
