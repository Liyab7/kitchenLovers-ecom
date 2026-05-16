import mongoose from 'mongoose';

export const STOCK_REASONS = Object.freeze({
  ORDER: 'order',
  RESTOCK: 'restock',
  ADJUSTMENT: 'adjustment',
  RETURN: 'return',
  DAMAGE: 'damage',
  CANCELLATION: 'cancellation',
});

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: String, // denormalized for fast history viewing
    delta: { type: Number, required: true }, // negative = stock out, positive = stock in
    reason: { type: String, enum: Object.values(STOCK_REASONS), required: true, index: true },
    note: String,
    reference: {
      kind: String, // e.g. 'Order', 'RefundRequest'
      id: mongoose.Schema.Types.ObjectId,
      label: String, // e.g. order number
    },
    beforeStock: { type: Number, required: true },
    afterStock: { type: Number, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = system
    actorName: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

/**
 * Apply a stock change atomically and log it. Use inside a transaction when possible.
 *
 * @param {object} args
 * @param {object} args.product Mongoose Product doc (will be mutated)
 * @param {number} args.delta   Negative for stock-out, positive for stock-in
 * @param {string} args.reason  One of STOCK_REASONS
 * @param {object} [args.session] Mongoose session
 * @param {object} [args.actor]   { _id, fullName }
 * @param {object} [args.reference] { kind, id, label }
 * @param {string} [args.note]
 */
export async function applyStockMovement({ product, delta, reason, session, actor, reference, note }) {
  const before = product.stock;
  const after = Math.max(0, before + delta);
  product.stock = after;
  await product.save({ session });

  await StockMovement.create(
    [
      {
        product: product._id,
        productName: product.name,
        delta,
        reason,
        note,
        reference,
        beforeStock: before,
        afterStock: after,
        actor: actor?._id,
        actorName: actor?.fullName,
      },
    ],
    { session }
  );

  return { before, after };
}
