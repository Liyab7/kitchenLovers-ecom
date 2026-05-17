import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Payment, PAYMENT_STATUS } from '../models/Payment.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { verifyTransaction, verifyWebhookSignature } from '../services/paystack.service.js';
import { env } from '../config/env.js';
import { notifyUser, notifyAdmins } from '../services/notification.service.js';
import { sendSMS, SmsTemplates } from '../services/sms.service.js';
import { sendEmail, EmailTemplates } from '../services/email.service.js';
import { User } from '../models/User.js';
import { SavedCard } from '../models/SavedCard.js';

async function maybeSaveAuthorization(user, gatewayData) {
  const auth = gatewayData?.authorization;
  if (!user || !auth?.authorization_code || !auth?.reusable) return;
  try {
    await SavedCard.findOneAndUpdate(
      { user: user._id, signature: auth.signature || auth.authorization_code },
      {
        user: user._id,
        provider: 'paystack',
        authorizationCode: auth.authorization_code,
        signature: auth.signature || auth.authorization_code,
        cardType: auth.card_type,
        bin: auth.bin,
        last4: auth.last4,
        expMonth: auth.exp_month,
        expYear: auth.exp_year,
        bank: auth.bank,
        channel: auth.channel,
        countryCode: auth.country_code,
        reusable: auth.reusable !== false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch { /* best-effort */ }
}

async function settlePayment(payment, gatewayData) {
  if (payment.status === PAYMENT_STATUS.SUCCESS) return payment;

  payment.status = gatewayData.status === 'success' ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;
  payment.channel = gatewayData.channel;
  payment.gatewayResponse = gatewayData.gateway_response;
  payment.raw = gatewayData;
  payment.verifiedAt = new Date();
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order && payment.status === PAYMENT_STATUS.SUCCESS) {
    order.status = ORDER_STATUS.PAID;
    order.paidAt = new Date();
    order.history.push({ status: ORDER_STATUS.PAID, at: new Date() });
    await order.save();

    const user = await User.findById(order.user);
    if (user) await maybeSaveAuthorization(user, gatewayData);
    if (user?.phone) sendSMS(user.phone, SmsTemplates.orderPaid(order.orderNumber)).catch(() => {});
    if (user?.email) sendEmail(EmailTemplates.orderPaid({
      to: user.email, orderNumber: order.orderNumber, total: order.total,
    })).catch(() => {});
    notifyUser(order.user, {
      type: 'payment',
      title: 'Payment confirmed',
      body: `Your payment for order ${order.orderNumber} succeeded. Tap to view your receipt.`,
      data: { orderId: order._id, url: `/orders/${order._id}` },
    }).catch(() => {});
    notifyAdmins('order:paid', { orderId: order._id, orderNumber: order.orderNumber, total: order.total });
  }
  return payment;
}

export const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const payment = await Payment.findOne({ reference });
  if (!payment) throw ApiError.notFound('Payment not found');

  const data = await verifyTransaction(reference);
  await settlePayment(payment, data);

  res.json({ success: true, data: { status: payment.status, reference } });
});

export const paystackWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const raw = req.rawBody?.toString() || JSON.stringify(req.body);

  // In live mode (Paystack configured), a valid signature is mandatory. Stub mode skips
  // verification so local testing without webhook secrets stays usable.
  if (env.paystack.enabled && env.paystack.webhookSecret) {
    if (!signature || !verifyWebhookSignature(raw, signature)) {
      throw ApiError.unauthorized('Invalid or missing webhook signature');
    }
  }

  const event = req.body?.event;
  const data = req.body?.data;
  if (event === 'charge.success' && data?.reference) {
    const payment = await Payment.findOne({ reference: data.reference });
    if (payment) await settlePayment(payment, data);
  }
  res.json({ received: true });
});
