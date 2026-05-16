import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/Role.js';
import { streamOrderReceipt } from '../services/receipt.service.js';

export const downloadOrderReceipt = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.SUPER_ADMIN
  ) {
    throw ApiError.forbidden();
  }

  const eligible = ['paid', 'processing', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned', 'refunded'];
  if (!eligible.includes(order.status)) {
    throw ApiError.badRequest('Receipt is available after payment is received');
  }

  const [customer, payment] = await Promise.all([
    User.findById(order.user).select('fullName phone email'),
    order.payment
      ? Payment.findById(order.payment).select('reference provider channel status amount currency verifiedAt')
      : Payment.findOne({ order: order._id }).sort({ createdAt: -1 }),
  ]);

  await streamOrderReceipt({ order, customer, payment, res });
});
