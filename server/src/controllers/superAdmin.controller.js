import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/Role.js';
import { Setting } from '../models/Setting.js';

export const listAdmins = asyncHandler(async (_req, res) => {
  const admins = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } });
  res.json({ success: true, data: admins });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const { fullName, phone, email, password } = req.body;
  if (!fullName || !phone || !password) throw ApiError.badRequest('Missing fields');
  const existing = await User.findOne({ phone });
  if (existing) throw ApiError.conflict('Phone already used');
  const user = await User.create({
    fullName,
    phone,
    email,
    password,
    role: ROLES.ADMIN,
    isPhoneVerified: true,
  });
  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

export const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role');
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw ApiError.notFound();
  res.json({ success: true, data: user.toSafeJSON() });
});

export const setUserActive = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!req.body.isActive }, { new: true });
  if (!user) throw ApiError.notFound();
  res.json({ success: true, data: user.toSafeJSON() });
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Setting.find({});
  res.json({ success: true, data: settings });
});

export const upsertSetting = asyncHandler(async (req, res) => {
  const { key, value, description, isPublic } = req.body;
  if (!key) throw ApiError.badRequest('key required');
  const setting = await Setting.findOneAndUpdate(
    { key },
    { value, description, isPublic: !!isPublic, updatedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: setting });
});

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await Setting.find({ isPublic: true });
  const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  res.json({ success: true, data: map });
});
