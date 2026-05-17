import { env } from '../config/env.js';

const ARKESEL_SMS_URL = 'https://sms.arkesel.com/sms/api';
const ARKESEL_CONTACTS_URL = 'https://sms.arkesel.com/contacts/api';

function normalizeRecipient(phone) {
  if (!phone) return phone;
  let digits = String(phone).trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  // Ghana local format like 0244000000 → 233244000000
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = '233' + digits.slice(1);
  }
  return digits;
}

function buildUrl(base, params) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    search.append(k, String(v));
  }
  return `${base}?${search.toString()}`;
}

async function arkeselRequest(url) {
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  // v1 returns { code: 'ok', message: '...' } on success when response=json is set,
  // or { status: 'success' } on the newer endpoint. Treat both as success.
  const okCode = data?.code === 'ok' || data?.status === 'success';
  if (!res.ok || (!okCode && (data?.code || data?.status))) {
    const reason = data?.message || data?.raw || `HTTP ${res.status}`;
    throw new Error(`Arkesel error: ${reason}`);
  }
  return data;
}

export async function sendSMS(to, body, options = {}) {
  if (!env.arkesel.enabled) {
    console.log(`[sms-stub] -> ${to}: ${body}`);
    return { id: 'stub', stub: true };
  }

  const url = buildUrl(ARKESEL_SMS_URL, {
    action: 'send-sms',
    api_key: env.arkesel.apiKey,
    to: normalizeRecipient(to),
    from: env.arkesel.sender,
    sms: body,
    schedule: options.schedule, // optional: 'DD-MM-YYYY HH:mm AM/PM'
    response: 'json',
  });

  try {
    const data = await arkeselRequest(url);
    return { id: data?.message_id || data?.code || 'sent', stub: false, raw: data };
  } catch (err) {
    console.error('[sms] arkesel send failed:', err.message);
    throw err;
  }
}

export async function checkSmsBalance() {
  if (!env.arkesel.enabled) return { stub: true, balance: null };
  const url = buildUrl(ARKESEL_SMS_URL, {
    action: 'check-balance',
    api_key: env.arkesel.apiKey,
    response: 'json',
  });
  const data = await arkeselRequest(url);
  return { stub: false, balance: data?.balance ?? data?.data?.balance ?? null, raw: data };
}

export async function subscribeContact({ phone, phoneBook, firstName, lastName, email, company, userName }) {
  if (!env.arkesel.enabled) {
    console.log(`[sms-stub] subscribe ${phone} → ${phoneBook}`);
    return { stub: true };
  }
  const url = buildUrl(ARKESEL_CONTACTS_URL, {
    action: 'subscribe-us',
    api_key: env.arkesel.apiKey,
    phone_book: phoneBook,
    phone_number: normalizeRecipient(phone),
    first_name: firstName,
    last_name: lastName,
    email,
    company,
    user_name: userName,
    response: 'json',
  });
  const data = await arkeselRequest(url);
  return { stub: false, raw: data };
}

export const SmsTemplates = {
  otp: (code, minutes) => `Your verification code is ${code}. It expires in ${minutes} minutes.`,
  passwordReset: (code, minutes) =>
    `KitchenLovers password reset code: ${code}. Expires in ${minutes} minutes. If you did not request this, ignore.`,
  orderPaid: (orderNumber) => `Payment confirmed for order ${orderNumber}. We're preparing your items.`,
  orderStatus: (orderNumber, status) => `Order ${orderNumber} is now ${status}.`,
};
