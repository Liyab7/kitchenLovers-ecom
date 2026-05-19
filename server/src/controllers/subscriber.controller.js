import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Subscriber } from '../models/Subscriber.js';
import { normalizePhone, looksLikeEmail } from '../utils/phone.js';

// Public — anyone can join the mailing list / SMS list from the storefront newsletter form.
export const subscribe = asyncHandler(async (req, res) => {
  const rawPhone = req.body?.phone ? String(req.body.phone).trim() : '';
  const rawEmail = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
  const fullName = req.body?.fullName ? String(req.body.fullName).trim().slice(0, 80) : undefined;

  let phone;
  if (rawPhone) {
    try {
      phone = normalizePhone(rawPhone);
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('bad');
    } catch {
      throw ApiError.badRequest('Enter a valid phone number');
    }
  }

  let email;
  if (rawEmail) {
    if (!looksLikeEmail(rawEmail)) throw ApiError.badRequest('Enter a valid email');
    email = rawEmail;
  }

  if (!phone && !email) throw ApiError.badRequest('Enter a phone number or email');

  // Find an existing record by either channel and merge — handles users who first gave
  // email, then later add their phone, or vice-versa.
  const or = [];
  if (phone) or.push({ phone });
  if (email) or.push({ email });
  let sub = await Subscriber.findOne({ $or: or });

  if (sub) {
    let changed = false;
    if (phone && !sub.phone) { sub.phone = phone; changed = true; }
    if (email && !sub.email) { sub.email = email; changed = true; }
    if (fullName && !sub.fullName) { sub.fullName = fullName; changed = true; }
    if (sub.isUnsubscribed) { sub.isUnsubscribed = false; changed = true; }
    if (changed) await sub.save();
  } else {
    sub = await Subscriber.create({ phone, email, fullName, source: 'newsletter' });
  }

  res.status(201).json({
    success: true,
    message: 'Subscribed. We\'ll keep you posted on deals and new arrivals.',
    data: { id: sub._id },
  });
});

// Admin — list subscribers (paginated, optional channel filter).
export const listSubscribers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const filter = { isUnsubscribed: { $ne: true } };
  if (req.query.channel === 'phone') filter.phone = { $exists: true, $ne: '' };
  if (req.query.channel === 'email') filter.email = { $exists: true, $ne: '' };
  if (req.query.q) {
    const q = String(req.query.q).trim();
    filter.$or = [
      { phone: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } },
    ];
  }

  const [data, total, withPhone, withEmail] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Subscriber.countDocuments(filter),
    Subscriber.countDocuments({ ...filter, phone: { $exists: true, $ne: '' } }),
    Subscriber.countDocuments({ ...filter, email: { $exists: true, $ne: '' } }),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    summary: { total, withPhone, withEmail },
  });
});

export const deleteSubscriber = asyncHandler(async (req, res) => {
  const removed = await Subscriber.findByIdAndDelete(req.params.id);
  if (!removed) throw ApiError.notFound('Subscriber not found');
  res.json({ success: true });
});
