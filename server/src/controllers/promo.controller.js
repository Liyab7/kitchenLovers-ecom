import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Promo, PROMO_TYPES } from '../models/Promo.js';

// Admin: list
export const listPromos = asyncHandler(async (_req, res) => {
  const data = await Promo.find().sort({ createdAt: -1 });
  res.json({ success: true, data });
});

// Admin: create
export const createPromo = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.code) body.code = String(body.code).toUpperCase().trim();
  if (!body.code) throw ApiError.badRequest('Code is required');
  if (!Object.values(PROMO_TYPES).includes(body.type)) {
    throw ApiError.badRequest(`type must be one of ${Object.values(PROMO_TYPES).join(', ')}`);
  }
  body.createdBy = req.user._id;
  const promo = await Promo.create(body);
  res.status(201).json({ success: true, data: promo });
});

// Admin: update
export const updatePromo = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.code) body.code = String(body.code).toUpperCase().trim();
  const promo = await Promo.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!promo) throw ApiError.notFound();
  res.json({ success: true, data: promo });
});

// Admin: delete
export const deletePromo = asyncHandler(async (req, res) => {
  const promo = await Promo.findByIdAndDelete(req.params.id);
  if (!promo) throw ApiError.notFound();
  res.json({ success: true, message: 'Deleted' });
});

// Customer: validate against subtotal + shipping at checkout time
export const validatePromo = asyncHandler(async (req, res) => {
  const { code, subtotal, shippingFee = 0 } = req.body;
  if (!code) throw ApiError.badRequest('code required');
  const promo = await Promo.findOne({ code: String(code).toUpperCase().trim() });
  if (!promo) throw ApiError.notFound('Promo code not found');

  const evalRes = promo.evaluate({
    subtotal: Number(subtotal) || 0,
    shippingFee: Number(shippingFee) || 0,
    userId: req.user._id,
  });

  if (!evalRes.ok) throw ApiError.badRequest(evalRes.message);

  res.json({
    success: true,
    data: {
      code: promo.code,
      type: promo.type,
      discount: evalRes.discount,
      freeShipping: evalRes.freeShipping,
      message: evalRes.message,
    },
  });
});
