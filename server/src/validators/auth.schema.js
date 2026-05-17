import { z } from 'zod';
import { normalizePhone, looksLikeEmail } from '../utils/phone.js';

// Final canonical form: +233244000000 (E.164). The transform above normalizes any
// common input shape — Ghana local "0244...", "244...", "233...", or "+233..." — into this.
const phoneRegex = /^\+[1-9]\d{7,14}$/;

const phoneField = z.string()
  .min(7)
  .transform((v) => normalizePhone(v))
  .pipe(z.string().regex(phoneRegex, 'Enter a valid phone number'));

export const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: phoneField,
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(8).max(128),
  // Only customer and rider are self-registerable; the controller hard-enforces this too.
  role: z.enum(['client', 'rider']).optional(),
});

// identifier may be a phone OR an email. Normalize phones; leave emails alone.
export const loginSchema = z.object({
  identifier: z.string().min(3).max(120).transform((v) => {
    const t = v.trim();
    return looksLikeEmail(t) ? t.toLowerCase() : normalizePhone(t);
  }),
  password: z.string().min(1),
});

export const otpVerifySchema = z.object({
  phone: phoneField,
  code: z.string().min(4).max(8),
});

export const otpResendSchema = z.object({
  phone: phoneField,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  phone: phoneField,
});

export const resetPasswordSchema = z.object({
  phone: phoneField,
  code: z.string().min(4).max(8),
  newPassword: z.string().min(8).max(128),
});
