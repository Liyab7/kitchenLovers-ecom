import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/Role.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateOtp, hashOtp, otpExpiry } from '../utils/otp.js';
import { sendSMS, SmsTemplates } from '../services/sms.service.js';
import { env } from '../config/env.js';

function tokensFor(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function issueOtp(user) {
  const code = generateOtp();
  user.otpHash = hashOtp(code);
  user.otpExpiresAt = otpExpiry();
  user.otpAttempts = 0;
  await user.save();

  // Always print the OTP to server console — invaluable in dev when SMS is slow or
  // the Arkesel sender ID hasn't been approved yet. Strip this log if you ever publish
  // server stdout to a shared place in production.
  console.log(`[otp] ${user.phone} -> ${code} (expires in ${env.otp.expiresMinutes}m)`);

  try {
    const result = await sendSMS(user.phone, SmsTemplates.otp(code, env.otp.expiresMinutes));
    console.log(`[otp] arkesel response:`, result?.raw || result);
  } catch (err) {
    // Don't kill the registration over an SMS failure — the OTP is saved, user can
    // request a resend or be helped manually. Log loudly so ops can see it.
    console.error(`[otp] SMS dispatch failed for ${user.phone}:`, err.message);
  }
  return code;
}

// Only these roles can be claimed at self-registration. Admin/super_admin must be
// created by an existing super_admin through the super-admin panel.
const PUBLIC_REGISTERABLE_ROLES = new Set([ROLES.CLIENT, ROLES.RIDER]);

export const register = asyncHandler(async (req, res) => {
  const { fullName, phone, email, password, role: requestedRole } = req.body;

  const role = PUBLIC_REGISTERABLE_ROLES.has(requestedRole) ? requestedRole : ROLES.CLIENT;

  const existing = await User.findOne({ phone });
  if (existing && existing.isPhoneVerified) {
    throw ApiError.conflict('Phone already registered');
  }

  let user = existing;
  if (user) {
    user.fullName = fullName;
    user.password = password;
    if (email) user.email = email;
    // Only allow role change on an unverified existing record; verified accounts keep their role.
    if (!user.isPhoneVerified) user.role = role;
  } else {
    user = new User({ fullName, phone, email, password, role });
  }
  await user.save();
  await issueOtp(user);

  res.status(201).json({
    success: true,
    message: 'Registered. OTP sent to phone.',
    data: { userId: user._id, phone: user.phone, role: user.role },
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  const user = await User.findOne({ phone }).select('+otpHash +otpExpiresAt +otpAttempts');
  if (!user) throw ApiError.notFound('User not found');

  if (!user.otpHash || !user.otpExpiresAt) throw ApiError.badRequest('No OTP pending');
  if (user.otpExpiresAt < new Date()) throw ApiError.badRequest('OTP expired');
  if (user.otpAttempts >= 5) throw ApiError.badRequest('Too many attempts. Request a new OTP.');

  if (hashOtp(code) !== user.otpHash) {
    user.otpAttempts += 1;
    await user.save();
    throw ApiError.badRequest('Invalid OTP');
  }

  user.isPhoneVerified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  const { accessToken, refreshToken } = tokensFor(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone }).select('+otpHash +otpExpiresAt +otpAttempts');
  if (!user) throw ApiError.notFound('User not found');
  await issueOtp(user);
  res.json({ success: true, message: 'OTP sent' });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  // The zod schema has already normalized: emails are lowercased, phones are E.164 (+233…).
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier } : { phone: identifier };
  const user = await User.findOne(query).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  if (!user.isPhoneVerified) {
    await issueOtp(user);
    return res.status(403).json({
      success: false,
      code: 'PHONE_NOT_VERIFIED',
      message: 'Phone not verified. OTP re-sent.',
      data: { phone: user.phone },
    });
  }

  const { accessToken, refreshToken } = tokensFor(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) throw ApiError.unauthorized();

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) throw ApiError.unauthorized('Refresh token revoked');

  const tokens = tokensFor(user);
  user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await user.save();

  res.json({ success: true, data: tokens });
});

export const logout = asyncHandler(async (req, res) => {
  req.user.refreshTokenHash = undefined;
  await req.user.save();
  res.json({ success: true, message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});
