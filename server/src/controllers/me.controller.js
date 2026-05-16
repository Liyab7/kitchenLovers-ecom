import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

// ============== Profile ==============

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, avatarUrl } = req.body;
  if (fullName !== undefined) req.user.fullName = String(fullName).trim();
  if (email !== undefined) req.user.email = email ? String(email).toLowerCase().trim() : undefined;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl || undefined;
  await req.user.save();
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// ============== Addresses ==============

export const listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, country, postalCode, isDefault } = req.body;
  if (!line1 || !city || !country) throw ApiError.badRequest('line1, city, country are required');

  // If marking new address as default, clear default on others
  if (isDefault) req.user.addresses.forEach((a) => { a.isDefault = false; });

  req.user.addresses.push({ label, line1, line2, city, state, country, postalCode, isDefault: !!isDefault });
  await req.user.save();
  res.status(201).json({ success: true, data: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.addressId);
  if (!addr) throw ApiError.notFound('Address not found');

  const { label, line1, line2, city, state, country, postalCode, isDefault } = req.body;
  if (isDefault) req.user.addresses.forEach((a) => { a.isDefault = false; });

  Object.assign(addr, {
    ...(label !== undefined && { label }),
    ...(line1 !== undefined && { line1 }),
    ...(line2 !== undefined && { line2 }),
    ...(city !== undefined && { city }),
    ...(state !== undefined && { state }),
    ...(country !== undefined && { country }),
    ...(postalCode !== undefined && { postalCode }),
    ...(isDefault !== undefined && { isDefault: !!isDefault }),
  });

  await req.user.save();
  res.json({ success: true, data: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.addressId);
  if (!addr) throw ApiError.notFound('Address not found');
  addr.deleteOne();
  await req.user.save();
  res.json({ success: true, data: req.user.addresses });
});

// ============== Wishlist ==============

export const listWishlist = asyncHandler(async (req, res) => {
  const populated = await User.findById(req.user._id)
    .populate({
      path: 'wishlist',
      select: 'name slug price discountPrice currency images stock trackInventory averageRating reviewsCount status',
    });
  res.json({ success: true, data: populated.wishlist });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw ApiError.badRequest('productId required');
  if (!req.user.wishlist.some((id) => id.toString() === productId)) {
    req.user.wishlist.push(productId);
    await req.user.save();
  }
  res.json({ success: true, data: { wishlist: req.user.wishlist } });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  req.user.wishlist = req.user.wishlist.filter((id) => id.toString() !== req.params.productId);
  await req.user.save();
  res.json({ success: true, data: { wishlist: req.user.wishlist } });
});
