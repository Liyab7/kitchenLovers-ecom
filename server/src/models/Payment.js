import mongoose from 'mongoose';

export const PAYMENT_STATUS = Object.freeze({
  INITIATED: 'initiated',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, default: 'paystack' },
    reference: { type: String, required: true, unique: true, index: true },
    accessCode: String,
    authorizationUrl: String,
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GHS' },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.INITIATED,
      index: true,
    },
    channel: String,
    gatewayResponse: String,
    raw: { type: mongoose.Schema.Types.Mixed },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
