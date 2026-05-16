import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Payment, PAYMENT_STATUS } from '../models/Payment.js';
import { ROLES } from '../models/Role.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { SavedCard } from '../models/SavedCard.js';
import { SearchQuery } from '../models/SearchQuery.js';

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeOptionalEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return value || undefined;
}

export const dashboardMetrics = asyncHandler(async (_req, res) => {
  const today = startOfDay();
  const last7 = daysAgo(7);
  const last30 = daysAgo(30);
  const REVENUE_STATUSES = [
    ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.PACKED,
    ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DELIVERED,
  ];

  const [
    revenueAgg, todayRevenue, week, month,
    ordersCount, pendingCount, deliveredCount,
    customersCount, activeCustomers, productsCount,
    lowStock, outOfStock,
    revenueByDay, statusBreakdown, topSelling,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: last7 } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: last30 } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments({}),
    Order.countDocuments({ status: ORDER_STATUS.PENDING }),
    Order.countDocuments({ status: ORDER_STATUS.DELIVERED }),
    User.countDocuments({ role: ROLES.CLIENT }),
    User.countDocuments({ role: ROLES.CLIENT, lastLoginAt: { $gte: last30 } }),
    Product.countDocuments({ isActive: true }),
    Product.find({ trackInventory: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] }, stock: { $gt: 0 } })
      .select('name stock lowStockThreshold')
      .limit(10),
    Product.countDocuments({ trackInventory: true, stock: { $lte: 0 } }),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCESS, createdAt: { $gte: last30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
      { $sort: { quantity: -1 } },
      { $limit: 8 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      revenue: {
        total: revenueAgg[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
        last7Days: week[0]?.total || 0,
        last30Days: month[0]?.total || 0,
      },
      paidOrders: revenueAgg[0]?.count || 0,
      orders: {
        total: ordersCount,
        pending: pendingCount,
        delivered: deliveredCount,
      },
      customers: customersCount,
      activeCustomers,
      products: productsCount,
      outOfStockCount: outOfStock,
      lowStock,
      revenueByDay,
      statusBreakdown,
      topSelling,
    },
  });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter = { role: ROLES.CLIENT };
  if (req.query.q) {
    const search = new RegExp(escapeRegExp(req.query.q), 'i');
    filter.$or = [
      { fullName: search },
      { phone: search },
      { email: search },
    ];
  }
  const [data, total] = await Promise.all([
    User.find(filter)
      .select('fullName phone email isPhoneVerified isEmailVerified isActive lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT });
  if (!customer) throw ApiError.notFound('Customer not found');

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, 'fullName')) {
    const fullName = String(req.body.fullName || '').trim();
    if (!fullName) throw ApiError.badRequest('Full name is required');
    updates.fullName = fullName;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
    const phone = String(req.body.phone || '').trim();
    if (!phone) throw ApiError.badRequest('Phone is required');
    updates.phone = phone;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
    updates.email = normalizeOptionalEmail(req.body.email);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'isPhoneVerified')) {
    updates.isPhoneVerified = !!req.body.isPhoneVerified;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
    updates.isActive = !!req.body.isActive;
  }

  if (updates.phone && updates.phone !== customer.phone) {
    const exists = await User.exists({ _id: { $ne: customer._id }, phone: updates.phone });
    if (exists) throw ApiError.conflict('Phone is already in use');
  }

  if (updates.email && updates.email !== customer.email) {
    const exists = await User.exists({ _id: { $ne: customer._id }, email: updates.email });
    if (exists) throw ApiError.conflict('Email is already in use');
  }

  Object.entries(updates).forEach(([key, value]) => {
    customer.set(key, value);
  });
  if (Object.prototype.hasOwnProperty.call(updates, 'email') && !updates.email) {
    customer.set('email', undefined);
  }

  await customer.save();
  res.json({ success: true, data: customer.toSafeJSON() });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT });
  if (!customer) throw ApiError.notFound('Customer not found');

  await Promise.all([
    Notification.deleteMany({ user: customer._id }),
    PushSubscription.deleteMany({ user: customer._id }),
    SavedCard.deleteMany({ user: customer._id }),
    SearchQuery.deleteMany({ user: customer._id }),
    User.deleteOne({ _id: customer._id, role: ROLES.CLIENT }),
  ]);

  res.json({ success: true, message: 'Deleted' });
});

export const salesReport = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : daysAgo(30);
  const to = req.query.to ? new Date(req.query.to) : new Date();

  const REVENUE_STATUSES = [
    ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.PACKED,
    ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DELIVERED,
  ];

  const rows = await Order.aggregate([
    { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: { from, to, rows } });
});

export const auditLog = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const filter = {};
  if (req.query.action) filter.action = new RegExp(req.query.action, 'i');
  if (req.query.actor) filter.actor = req.query.actor;

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
