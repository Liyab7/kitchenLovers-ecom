import { asyncHandler } from '../utils/asyncHandler.js';
import { SearchQuery } from '../models/SearchQuery.js';

// POST /api/search/log
export const logSearch = asyncHandler(async (req, res) => {
  const q = String(req.body?.query || '').trim().toLowerCase();
  if (!q || q.length < 2 || q.length > 80) return res.json({ success: true, skipped: true });
  await SearchQuery.create({ query: q, user: req.user?._id });
  res.json({ success: true });
});

// GET /api/search/trending — top queries in the last 24h
export const trending = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const limit = Math.min(20, Number(req.query.limit) || 8);
  const rows = await SearchQuery.aggregate([
    { $match: { createdAt: { $gte: since }, query: { $ne: '' } } },
    { $group: { _id: '$query', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  res.json({ success: true, data: rows.map((r) => ({ query: r._id, count: r.count })) });
});

// GET /api/search/recent — current user's recent searches (deduped)
export const recent = asyncHandler(async (req, res) => {
  if (!req.user) return res.json({ success: true, data: [] });
  const rows = await SearchQuery.aggregate([
    { $match: { user: req.user._id } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$query', lastAt: { $first: '$createdAt' } } },
    { $sort: { lastAt: -1 } },
    { $limit: 8 },
  ]);
  res.json({ success: true, data: rows.map((r) => ({ query: r._id, lastAt: r.lastAt })) });
});
