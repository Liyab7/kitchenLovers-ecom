import crypto from 'crypto';
import { env } from '../config/env.js';

export function generateOtp(length = env.otp.length) {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(length, '0');
}

export function otpExpiry(minutes = env.otp.expiresMinutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}
