import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Banner } from '../models/Banner.js';

export const listBanners = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.placement) filter.placement = req.query.placement;
  const now = new Date();
  const data = (await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 })).filter((b) => {
    if (b.startsAt && b.startsAt > now) return false;
    if (b.endsAt && b.endsAt < now) return false;
    return true;
  });
  res.json({ success: true, data });
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, data: banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!banner) throw ApiError.notFound();
  res.json({ success: true, data: banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw ApiError.notFound();
  res.json({ success: true, message: 'Deleted' });
});
