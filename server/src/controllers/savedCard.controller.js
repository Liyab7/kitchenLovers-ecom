import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { SavedCard } from '../models/SavedCard.js';
import { Order } from '../models/Order.js';
import { Payment, PAYMENT_STATUS } from '../models/Payment.js';
import { chargeAuthorization } from '../services/paystack.service.js';

// GET /api/me/payment-methods
export const listMyCards = asyncHandler(async (req, res) => {
  const cards = await SavedCard.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, data: cards.map((c) => c.toSafeJSON()) });
});

// PATCH /api/me/payment-methods/:id  { label?, isDefault? }
export const updateMyCard = asyncHandler(async (req, res) => {
  const card = await SavedCard.findOne({ _id: req.params.id, user: req.user._id });
  if (!card) throw ApiError.notFound();
  if (req.body.label !== undefined) card.label = req.body.label;
  if (req.body.isDefault) {
    await SavedCard.updateMany({ user: req.user._id }, { isDefault: false });
    card.isDefault = true;
  }
  await card.save();
  res.json({ success: true, data: card.toSafeJSON() });
});

// DELETE /api/me/payment-methods/:id
export const deleteMyCard = asyncHandler(async (req, res) => {
  const r = await SavedCard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw ApiError.notFound();
  res.json({ success: true });
});

// POST /api/orders/:orderId/charge-saved-card  { cardId }
// Used when the customer wants to pay an existing pending order with a saved card.
export const chargeSavedCard = asyncHandler(async (req, res) => {
  const { cardId } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== req.user._id.toString()) throw ApiError.forbidden();

  const card = await SavedCard.findOne({ _id: cardId, user: req.user._id }).select('+authorizationCode');
  if (!card) throw ApiError.notFound('Card not found');

  const reference = `PSK-${order.orderNumber}-${Date.now().toString(36)}`;
  const data = await chargeAuthorization({
    email: req.user.email || `${req.user.phone}@noemail.local`,
    amount: order.total,
    authorizationCode: card.authorizationCode,
    reference,
    metadata: { orderId: order._id.toString(), userId: req.user._id.toString(), savedCardId: card._id.toString() },
  });

  const payment = await Payment.create({
    order: order._id,
    user: req.user._id,
    reference,
    amount: order.total,
    currency: order.currency,
    status: data.status === 'success' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED,
    channel: data.channel,
    gatewayResponse: data.gateway_response,
    raw: data,
    verifiedAt: new Date(),
  });

  order.payment = payment._id;
  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    order.status = 'paid';
    order.paidAt = new Date();
    order.history.push({ status: 'paid', at: new Date() });
  }
  await order.save();

  res.json({ success: true, data: { paymentStatus: payment.status, reference } });
});
