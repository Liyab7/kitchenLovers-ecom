// Web-push notification service with stub mode — mirrors email/sms/paystack stubs.
//
// To go live, install web-push and set VAPID env vars in server/.env:
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   VAPID_SUBJECT=mailto:hello@kitchenlovers.local
//
// Generate keys once: npx web-push generate-vapid-keys
//
// Without those, sends are logged to the console and no browser notification is delivered.

import { PushSubscription } from '../models/PushSubscription.js';

const PUSH_ENABLED = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let webPushPromise = null;
async function getWebPush() {
  if (!PUSH_ENABLED) return null;
  if (webPushPromise) return webPushPromise;
  webPushPromise = import('web-push').then((mod) => {
    const webPush = mod.default;
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:no-reply@kitchenlovers.local',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    return webPush;
  }).catch((err) => {
    console.warn('[push] web-push not installed — sends will stub. Run: npm i web-push in server/');
    webPushPromise = null;
    throw err;
  });
  return webPushPromise;
}

export const isPushLive = () => PUSH_ENABLED;
export const getPublicVapidKey = () => process.env.VAPID_PUBLIC_KEY || '';

/**
 * Send a push notification to one user's subscriptions.
 * payload: { title, body, url? }
 */
export async function sendPushToUser(userId, payload) {
  const subs = await PushSubscription.find({ user: userId });
  if (subs.length === 0) return { sent: 0 };

  if (!PUSH_ENABLED) {
    console.log(`[push-stub] user=${userId} subs=${subs.length} payload=${JSON.stringify(payload)}`);
    return { stub: true, sent: subs.length };
  }

  let webPush;
  try { webPush = await getWebPush(); }
  catch { return { stub: true, sent: 0 }; }
  if (!webPush) return { stub: true, sent: 0 };

  const body = JSON.stringify(payload);
  let success = 0;
  const expired = [];
  await Promise.all(subs.map(async (sub) => {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        body
      );
      success += 1;
      sub.lastSentAt = new Date();
      sub.save().catch(() => {});
    } catch (err) {
      // 404/410 = expired subscription, prune
      if (err.statusCode === 404 || err.statusCode === 410) expired.push(sub._id);
    }
  }));
  if (expired.length) await PushSubscription.deleteMany({ _id: { $in: expired } });

  return { sent: success, removed: expired.length };
}
