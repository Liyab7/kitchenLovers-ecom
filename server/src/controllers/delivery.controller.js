import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/Role.js';
import { notifyUser, notifyAdmins, pushUserEvent } from '../services/notification.service.js';

const LIVE_DELIVERY_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.DISPATCHED,
  ORDER_STATUS.IN_TRANSIT,
];

/** Admin: list every user registered as a rider. */
export const listRiders = asyncHandler(async (_req, res) => {
  const data = await User.find({ role: ROLES.RIDER, isActive: true })
    .select('fullName phone email avatarUrl lastLoginAt');
  res.json({ success: true, data });
});

/** Admin: list active deliveries (orders that need or are being delivered). */
export const listActiveDeliveries = asyncHandler(async (_req, res) => {
  const data = await Order.find({ status: { $in: LIVE_DELIVERY_STATUSES } })
    .sort({ createdAt: -1 })
    .populate('user', 'fullName phone email')
    .populate('assignedRider', 'fullName phone');
  res.json({ success: true, data });
});

/** Rider: list orders assigned to me. */
export const listMyDeliveries = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.RIDER && req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden();
  }
  const filter = { assignedRider: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const data = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'fullName phone email')
    .limit(50);
  res.json({ success: true, data });
});

/** Admin: assign a rider to an order. */
export const assignRider = asyncHandler(async (req, res) => {
  const { riderId, estimatedArrival } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  let rider = null;
  if (riderId) {
    rider = await User.findById(riderId);
    if (!rider || rider.role !== ROLES.RIDER) throw ApiError.badRequest('Selected user is not a rider');
  }

  order.assignedRider = rider ? rider._id : null;
  order.assignedRiderAt = rider ? new Date() : undefined;
  if (estimatedArrival) order.estimatedArrival = new Date(estimatedArrival);

  // Auto-bump status to "dispatched" when assigning a rider on a packed order
  if (rider && order.status === ORDER_STATUS.PACKED) {
    order.status = ORDER_STATUS.DISPATCHED;
    order.dispatchedAt = new Date();
    order.history.push({
      status: ORDER_STATUS.DISPATCHED,
      at: new Date(),
      by: req.user._id,
      note: `Dispatched with rider ${rider.fullName}`,
    });
  }
  await order.save();
  await order.populate('assignedRider', 'fullName phone');

  // Live updates
  pushUserEvent(order.user.toString(), 'order:updated', {
    orderId: order._id.toString(),
    status: order.status,
    history: order.history,
    assignedRider: rider ? { _id: rider._id, fullName: rider.fullName, phone: rider.phone } : null,
    estimatedArrival: order.estimatedArrival || null,
    dispatchedAt: order.dispatchedAt || null,
  });
  notifyAdmins('delivery:assigned', { orderId: order._id, riderId: rider?._id, orderNumber: order.orderNumber });

  if (rider) {
    notifyUser(order.user, {
      type: 'order_update',
      title: `${rider.fullName} is your rider`,
      body: `Your order ${order.orderNumber} is on the way.${order.estimatedArrival ? ` ETA ${new Date(order.estimatedArrival).toLocaleString()}.` : ''}`,
      data: { orderId: order._id, riderId: rider._id, url: `/orders/${order._id}` },
    }).catch(() => {});
  }

  res.json({ success: true, data: order });
});

/** Admin or assigned rider: push a location/ETA update. */
export const updateDeliveryLocation = asyncHandler(async (req, res) => {
  const { lat, lng, note, estimatedArrival, status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUPER_ADMIN;
  const isAssignedRider =
    req.user.role === ROLES.RIDER &&
    order.assignedRider &&
    order.assignedRider.toString() === req.user._id.toString();
  if (!isAdmin && !isAssignedRider) throw ApiError.forbidden();

  if (typeof lat === 'number' && typeof lng === 'number') {
    order.lastLocation = { lat, lng, at: new Date(), note: note || undefined };
  }
  if (estimatedArrival) order.estimatedArrival = new Date(estimatedArrival);

  if (status && Object.values(ORDER_STATUS).includes(status) && status !== order.status) {
    order.status = status;
    if (status === ORDER_STATUS.DISPATCHED && !order.dispatchedAt) order.dispatchedAt = new Date();
    if (status === ORDER_STATUS.DELIVERED) order.deliveredAt = new Date();
    order.history.push({
      status,
      at: new Date(),
      by: req.user._id,
      note: note || 'Location update',
    });
  }
  await order.save();

  pushUserEvent(order.user.toString(), 'order:updated', {
    orderId: order._id.toString(),
    status: order.status,
    history: order.history,
    lastLocation: order.lastLocation,
    estimatedArrival: order.estimatedArrival || null,
    dispatchedAt: order.dispatchedAt || null,
  });
  notifyAdmins('delivery:location', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    location: order.lastLocation,
  });

  res.json({ success: true, data: order });
});

/** Customer: get just the live delivery state for an order (light payload). */
export const getDeliveryState = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .select('orderNumber status dispatchedAt estimatedArrival lastLocation assignedRider user shippingAddress history')
    .populate('assignedRider', 'fullName phone');
  if (!order) throw ApiError.notFound();
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.SUPER_ADMIN
  ) {
    throw ApiError.forbidden();
  }
  res.json({ success: true, data: order });
});
