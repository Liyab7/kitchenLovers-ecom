import dotenv from 'dotenv';
dotenv.config();

const required = (key, fallback) => {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env var: ${key}`);
    }
    return undefined;
  }
  return v;
};

// Accept bare hostnames (from Render fromService.host) or full URLs. In production we
// upgrade to https://; in dev we leave http:// untouched.
const normalizeOrigin = (raw) => {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v.replace(/\/$/, '');
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${scheme}://${v}`.replace(/\/$/, '');
};

// CLIENT_URL can be a comma-separated list of allowed origins (e.g. the static-site URL
// plus a custom domain). The first entry is treated as the canonical client URL for
// payment redirects. Entries may be bare hostnames — they'll get the right scheme attached.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

// PUBLIC_URL prefixes uploaded asset URLs when frontend and backend live on different origins.
// Falls back to Render's auto-injected RENDER_EXTERNAL_URL so the API discovers its own host.
const publicUrlRaw = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: allowedOrigins[0],
  allowedOrigins,
  publicUrl: normalizeOrigin(publicUrlRaw),
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/kitchen_ecom'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  arkesel: {
    apiKey: process.env.ARKESEL_API_KEY,
    sender: process.env.ARKESEL_SENDER_ID || 'KitchenLuv',
    sandbox: String(process.env.ARKESEL_SANDBOX || '').toLowerCase() === 'true',
    enabled: Boolean(process.env.ARKESEL_API_KEY),
  },
  paystack: {
    secret: process.env.PAYSTACK_SECRET_KEY,
    public: process.env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    enabled: Boolean(process.env.PAYSTACK_SECRET_KEY),
  },
  otp: {
    length: Number(process.env.OTP_LENGTH || 6),
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  },
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
};
