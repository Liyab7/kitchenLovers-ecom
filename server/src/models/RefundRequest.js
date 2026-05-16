import mongoose from 'mongoose';

export const REFUND_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSED: 'processed',
});

export const REFUND_REASONS = Object.freeze({
  DAMAGED: 'damaged',
  WRONG_ITEM: 'wrong_item',
  MISSING_ITEM: 'missing_item',
  DELAYED: 'delayed',
  OTHER: 'other',
});

const refundRequestSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: String, // denormalized for fast admin listing
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, enum: Object.values(REFUND_REASONS), required: true },
    description: { type: String, default: '' },
    attachments: [{ url: String }], // optional proof images
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true,
    },
    adminNote: String,
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
  },
  { timestamps: true }
);

refundRequestSchema.index({ user: 1, order: 1 });

export const RefundRequest = mongoose.model('RefundRequest', refundRequestSchema);
