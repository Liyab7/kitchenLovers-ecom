import crypto from 'crypto';
import { env } from '../config/env.js';

const BASE = 'https://api.paystack.co';

async function paystackFetch(path, options = {}) {
  if (!env.paystack.enabled) throw new Error('Paystack not configured');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.paystack.secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    const msg = json.message || `Paystack request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json.data;
}

export async function initializeTransaction({ email, amount, reference, metadata }) {
  if (!env.paystack.enabled) {
    return {
      authorization_url: `${env.clientUrl}/checkout/stub-pay?reference=${reference}`,
      access_code: 'stub_access',
      reference,
      stub: true,
    };
  }
  return paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      reference,
      metadata,
      callback_url: `${env.clientUrl}/checkout/callback`,
    }),
  });
}

export async function verifyTransaction(reference) {
  if (!env.paystack.enabled) {
    return {
      status: 'success',
      reference,
      amount: 0,
      channel: 'stub',
      gateway_response: 'Approved (stub)',
      stub: true,
    };
  }
  return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// Charge a previously saved authorization (Paystack tokenized card).
export async function chargeAuthorization({ email, amount, authorizationCode, reference, metadata }) {
  if (!env.paystack.enabled) {
    return {
      status: 'success',
      reference,
      amount: Math.round(amount * 100),
      channel: 'card',
      gateway_response: 'Approved (stub)',
      stub: true,
    };
  }
  return paystackFetch('/transaction/charge_authorization', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      authorization_code: authorizationCode,
      reference,
      metadata,
    }),
  });
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.paystack.enabled || !env.paystack.webhookSecret) return false;
  const hash = crypto
    .createHmac('sha512', env.paystack.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return hash === signatureHeader;
}
