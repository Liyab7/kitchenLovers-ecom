// Email service with stub mode — mirrors sms/paystack stub pattern.
// If SMTP env vars are missing, sends are logged to the console instead of
// actually delivering email. Drop nodemailer config into server/.env to go live.
//
// SMTP_HOST=
// SMTP_PORT=587
// SMTP_USER=
// SMTP_PASS=
// SMTP_FROM=KitchenLovers <hello@kitchenlovers.local>

import { env } from '../config/env.js';

const SMTP_ENABLED = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporterPromise = null;
async function getTransporter() {
  if (!SMTP_ENABLED) return null;
  if (transporterPromise) return transporterPromise;
  transporterPromise = import('nodemailer').then((mod) =>
    mod.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  ).catch((err) => {
    console.warn('[email] nodemailer not installed; emails will stub. Run npm i nodemailer in server/');
    transporterPromise = null;
    throw err;
  });
  return transporterPromise;
}

export async function sendEmail({ to, subject, text, html, from }) {
  const sender = from || process.env.SMTP_FROM || 'KitchenLovers <no-reply@kitchenlovers.local>';
  if (!SMTP_ENABLED) {
    console.log(`[email-stub] to=${to} subject="${subject}"\n${text || (html && html.replace(/<[^>]+>/g, ''))}`);
    return { stub: true, messageId: 'stub' };
  }
  try {
    const transport = await getTransporter();
    if (!transport) {
      console.log(`[email-stub] (nodemailer unavailable) to=${to} subject="${subject}"`);
      return { stub: true, messageId: 'stub' };
    }
    const info = await transport.sendMail({ from: sender, to, subject, text, html });
    return { messageId: info.messageId, stub: false };
  } catch (err) {
    console.error('[email] send failed', err.message);
    throw err;
  }
}

const brand = 'KitchenLovers Cookwares';
const wrap = (body) => `${body}\n\n— ${brand}`;

export const EmailTemplates = {
  orderConfirmation: ({ to, orderNumber, total, currencySymbol = '₵' }) => ({
    to,
    subject: `Order ${orderNumber} confirmed`,
    text: wrap(
      `Thanks for your order!\n\n` +
      `Order: ${orderNumber}\nTotal: ${currencySymbol}${Number(total).toLocaleString()}\n\n` +
      `We're getting it ready for shipping. We'll email you again when it's on the way.`
    ),
  }),
  orderPaid: ({ to, orderNumber, total, currencySymbol = '₵' }) => ({
    to,
    subject: `Payment received for order ${orderNumber}`,
    text: wrap(
      `We've received your payment of ${currencySymbol}${Number(total).toLocaleString()} for order ${orderNumber}.\n\n` +
      `We'll start preparing your items right away.`
    ),
  }),
  orderStatus: ({ to, orderNumber, status }) => ({
    to,
    subject: `Order ${orderNumber} update: ${status}`,
    text: wrap(`Your order ${orderNumber} is now ${status.replace('_', ' ')}.`),
  }),
  refundRequested: ({ to, orderNumber }) => ({
    to,
    subject: `Refund request received for ${orderNumber}`,
    text: wrap(
      `We've received your refund request for order ${orderNumber}.\n\n` +
      `Our team will review and get back to you within 1–2 business days.`
    ),
  }),
  refundResolved: ({ to, orderNumber, status, adminNote }) => ({
    to,
    subject: `Refund ${status} for order ${orderNumber}`,
    text: wrap(
      `Your refund request for ${orderNumber} has been ${status}.\n` +
      (adminNote ? `\nNote from our team: ${adminNote}\n` : '') +
      `\nIf you have any questions, reply to this email or message us on WhatsApp.`
    ),
  }),
};

// Convenience predicate for callers that want to know whether email is live
export const isEmailLive = () => SMTP_ENABLED;
