import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { RefundRequest, REFUND_STATUS, REFUND_REASONS } from '../models/RefundRequest.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { ROLES } from '../models/Role.js';
import { parsePagination, paginatedResponse } from '../utils/paginate.js';
import { sendEmail, EmailTemplates } from '../services/email.service.js';
import { notifyAdmins, notifyUser, pushUserEvent } from '../services/notification.service.js';

const REFUNDABLE_STATUSES = [
  ORDER_STATUS.DELIVERED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DISPATCHED,
];

// Customer: create a refund request for one of their orders
export const createRefund = asyncHandler(async (req, res) => {
  const { orderId, reason, description, attachments } = req.body;
  if (!orderId || !reason) throw ApiError.badRequest('orderId and reason required');
  if (!Object.values(REFUND_REASONS).includes(reason)) {
    throw ApiError.badRequest(`reason must be one of ${Object.values(REFUND_REASONS).join(', ')}`);
  }

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.user.toString() !== req.user._id.toString()) throw ApiError.forbidden();
  if (!REFUNDABLE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest('This order is not eligible for refund yet');
  }

  const existing = await RefundRequest.findOne({
    order: order._id,
    status: { $in: [REFUND_STATUS.PENDING, REFUND_STATUS.APPROVED] },
  });
  if (existing) throw ApiError.conflict('A refund request is already open for this order');

  const refund = await RefundRequest.create({
    order: order._id,
    orderNumber: order.orderNumber,
    user: req.user._id,
    reason,
    description: description || '',
    attachments: Array.isArray(attachments) ? attachments.map((url) => ({ url })) : [],
  });

  notifyAdmins('refund:requested', {
    refundId: refund._id,
    orderNumber: order.orderNumber,
    reason,
  });

  if (req.user.email) {
    sendEmail(EmailTemplates.refundRequested({ to: req.user.email, orderNumber: order.orderNumber }))
      .catch(() => { /* email is best-effort */ });
  }

  res.status(201).json({ success: true, data: refund });
});

// Customer: list my refunds
export const listMyRefunds = asyncHandler(async (req, res) => {
  const data = await RefundRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data });
});

// Admin: list all refunds with optional status filter
export const listAllRefunds = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    RefundRequest.find(filter)
      .populate('user', 'fullName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RefundRequest.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

// Admin: update refund status (approve / reject / processed)
export const updateRefundStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (!Object.values(REFUND_STATUS).includes(status)) {
    throw ApiError.badRequest(`status must be one of ${Object.values(REFUND_STATUS).join(', ')}`);
  }

  const refund = await RefundRequest.findById(req.params.id).populate('user', 'fullName email phone');
  if (!refund) throw ApiError.notFound();

  refund.status = status;
  if (adminNote !== undefined) refund.adminNote = adminNote;
  refund.handledBy = req.user._id;
  refund.handledAt = new Date();
  await refund.save();

  // If processed, mark the order as refunded too
  if (status === REFUND_STATUS.PROCESSED) {
    await Order.findByIdAndUpdate(refund.order, {
      status: ORDER_STATUS.REFUNDED,
      $push: { history: { status: ORDER_STATUS.REFUNDED, at: new Date(), by: req.user._id, note: 'Refund processed' } },
    });
  }

  notifyUser(refund.user._id, {
    type: 'order_update',
    title: `Refund ${status}`,
    body: adminNote || `Your refund request for ${refund.orderNumber} is now ${status}.`,
    data: { refundId: refund._id, orderId: refund.order, status, url: `/orders/${refund.order}` },
  }).catch(() => { /* best-effort */ });

  // Real-time updates so any open refund/order screen reflects the change instantly.
  pushUserEvent(refund.user._id.toString(), 'refund:updated', {
    refundId: refund._id.toString(),
    orderId: refund.order.toString(),
    status: refund.status,
    adminNote: refund.adminNote,
    handledAt: refund.handledAt,
  });

  if (refund.user.email) {
    sendEmail(EmailTemplates.refundResolved({
      to: refund.user.email,
      orderNumber: refund.orderNumber,
      status,
      adminNote,
    })).catch(() => { /* */ });
  }

  res.json({ success: true, data: refund });
});
