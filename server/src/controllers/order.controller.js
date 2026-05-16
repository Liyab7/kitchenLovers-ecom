import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Payment, PAYMENT_STATUS } from '../models/Payment.js';
import { Promo } from '../models/Promo.js';
import { applyStockMovement, STOCK_REASONS } from '../models/StockMovement.js';
import { parsePagination, parseSort, paginatedResponse } from '../utils/paginate.js';
import { initializeTransaction } from '../services/paystack.service.js';
import { notifyUser, notifyAdmins, pushUserEvent } from '../services/notification.service.js';
import { sendSMS, SmsTemplates } from '../services/sms.service.js';
import { sendEmail, EmailTemplates } from '../services/email.service.js';
import { sendPushToUser } from '../services/push.service.js';
import { ROLES } from '../models/Role.js';
import { DELIVERY_METHODS, getDeliveryMethod } from '../config/delivery.js';

export const listDeliveryMethods = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: DELIVERY_METHODS });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, notes, deliveryMethod, promoCode } = req.body;
  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });

  if (products.length !== productIds.length) throw ApiError.badRequest('One or more products unavailable');

  const method = getDeliveryMethod(deliveryMethod);
  const orderShippingAddress = method.id === 'pickup'
    ? {
        fullName: shippingAddress?.fullName || req.user.fullName,
        phone: shippingAddress?.phone || req.user.phone,
        line1: 'Store pickup',
        line2: '',
        city: 'Accra',
        state: '',
        country: 'Ghana',
        postalCode: '',
      }
    : shippingAddress;
  let promo = null;
  if (promoCode) {
    promo = await Promo.findOne({ code: String(promoCode).toUpperCase().trim() });
    if (!promo) throw ApiError.badRequest('Promo code not found');
  }

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const orderItems = items.map((line) => {
        const p = products.find((x) => x._id.toString() === line.product);
        if (p.trackInventory && p.stock < line.quantity) {
          throw ApiError.badRequest(`Insufficient stock for ${p.name}`);
        }
        const subtotal = +(p.price * line.quantity).toFixed(2);
        return {
          product: p._id,
          name: p.name,
          image: p.images?.[0]?.url,
          sku: p.sku,
          price: p.price,
          quantity: line.quantity,
          subtotal,
        };
      });

      const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
      let shippingFee = method.fee;
      let discount = 0;
      let appliedCode;

      if (promo) {
        const result = promo.evaluate({ subtotal, shippingFee, userId: req.user._id });
        if (!result.ok) throw ApiError.badRequest(result.message);
        discount = result.discount;
        appliedCode = promo.code;
        if (result.freeShipping) shippingFee = 0; // free_shipping zeroes out shipping
        await promo.recordUse(req.user._id);
      }

      const tax = 0;
      const total = +Math.max(0, subtotal + shippingFee + tax - (promo?.type === 'free_shipping' ? 0 : discount)).toFixed(2);
      // For free_shipping the "discount" equals the original shipping fee that we zeroed out, so it's already baked in.

      [order] = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            subtotal,
            shippingFee,
            tax,
            discount: promo?.type === 'free_shipping' ? 0 : discount,
            total,
            shippingAddress: orderShippingAddress,
            notes,
            deliveryMethod: method.id,
            deliveryEtaDays: method.etaDays,
            promoCode: appliedCode,
          },
        ],
        { session }
      );

      for (const line of orderItems) {
        const productDoc = products.find((x) => x._id.toString() === line.product.toString());
        if (productDoc.trackInventory) {
          await applyStockMovement({
            product: productDoc,
            delta: -line.quantity,
            reason: STOCK_REASONS.ORDER,
            session,
            actor: req.user,
            reference: { kind: 'Order', id: order._id, label: order.orderNumber },
          });
        }
      }
    });
  } finally {
    session.endSession();
  }

  const reference = `PSK-${order.orderNumber}-${Date.now().toString(36)}`;
  const init = await initializeTransaction({
    email: req.user.email || `${req.user.phone}@noemail.local`,
    amount: order.total,
    reference,
    metadata: { orderId: order._id.toString(), userId: req.user._id.toString() },
  });

  const payment = await Payment.create({
    order: order._id,
    user: req.user._id,
    reference,
    accessCode: init.access_code,
    authorizationUrl: init.authorization_url,
    amount: order.total,
    currency: order.currency,
    status: PAYMENT_STATUS.PENDING,
  });

  order.payment = payment._id;
  await order.save();

  notifyAdmins('order:new', { orderId: order._id, orderNumber: order.orderNumber, total: order.total });

  if (req.user.email) {
    sendEmail(EmailTemplates.orderConfirmation({
      to: req.user.email, orderNumber: order.orderNumber, total: order.total,
    })).catch(() => { /* best-effort */ });
  }

  res.status(201).json({
    success: true,
    data: { order, payment: { reference, authorizationUrl: init.authorization_url } },
  });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'total', 'status']);
  const filter = { user: req.user._id };
  const [data, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('payment')
    .populate('assignedRider', 'fullName phone email');
  if (!order) throw ApiError.notFound();
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.SUPER_ADMIN &&
    !(req.user.role === ROLES.RIDER && order.assignedRider && order.assignedRider._id.toString() === req.user._id.toString())
  ) {
    throw ApiError.forbidden();
  }
  res.json({ success: true, data: order });
});

export const listAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'total', 'status']);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Order.find(filter).populate('user', 'fullName phone').sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();

  order.status = status;
  order.history.push({ status, note, at: new Date(), by: req.user._id });
  if (status === ORDER_STATUS.DELIVERED) order.deliveredAt = new Date();
  await order.save();

  notifyUser(order.user, {
    type: 'order_update',
    title: `Order ${order.orderNumber} ${status}`,
    body: note || `Your order is now ${status}.`,
    data: { orderId: order._id, status, url: `/orders/${order._id}` },
  }).catch(() => {});

  // Real-time payload so any open OrderDetail page can update without refresh.
  pushUserEvent(order.user.toString(), 'order:updated', {
    orderId: order._id.toString(),
    status: order.status,
    history: order.history,
    deliveredAt: order.deliveredAt || null,
  });
  notifyAdmins('order:status', { orderId: order._id, orderNumber: order.orderNumber, status });

  const populated = await order.populate('user', 'phone email');
  const customer = populated.user;
  if (customer?.phone) {
    sendSMS(customer.phone, SmsTemplates.orderStatus(order.orderNumber, status)).catch(() => {});
  }
  if (customer?.email) {
    sendEmail(EmailTemplates.orderStatus({
      to: customer.email, orderNumber: order.orderNumber, status,
    })).catch(() => {});
  }
  sendPushToUser(order.user, {
    title: `Order ${order.orderNumber}`,
    body: `Status: ${status.replace('_', ' ')}`,
    url: `/orders/${order._id}`,
  }).catch(() => {});

  res.json({ success: true, data: order });
});
