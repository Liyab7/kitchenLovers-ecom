import mongoose from 'mongoose';

export const PROMO_TYPES = Object.freeze({
  PERCENT: 'percent',       // value = 0..100
  FIXED: 'fixed',           // value = currency amount
  FREE_SHIPPING: 'free_shipping',
});

const promoSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    type: { type: String, enum: Object.values(PROMO_TYPES), default: PROMO_TYPES.PERCENT },
    value: { type: Number, default: 0, min: 0 }, // % or amount; ignored for free_shipping
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 }, // cap for percent type (0 = no cap)
    startsAt: Date,
    endsAt: Date,
    maxUses: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usesCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usersUsed: { type: Map, of: Number, default: {} }, // userId → count
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/**
 * Compute a discount for the given subtotal and shipping fee.
 * Returns { ok, discount, freeShipping, message }
 */
promoSchema.methods.evaluate = function ({ subtotal, shippingFee = 0, userId }) {
  const now = new Date();
  if (!this.isActive) return { ok: false, message: 'Promo is not active' };
  if (this.startsAt && this.startsAt > now) return { ok: false, message: 'Promo is not yet active' };
  if (this.endsAt && this.endsAt < now) return { ok: false, message: 'Promo has expired' };
  if (this.maxUses && this.usesCount >= this.maxUses) return { ok: false, message: 'Promo limit reached' };
  if (subtotal < this.minOrderAmount) {
    return { ok: false, message: `Minimum order amount is ${this.minOrderAmount.toFixed(2)}` };
  }
  if (this.perUserLimit && userId) {
    const used = this.usersUsed.get(userId.toString()) || 0;
    if (used >= this.perUserLimit) return { ok: false, message: 'You have already used this promo' };
  }

  let discount = 0;
  let freeShipping = false;
  if (this.type === PROMO_TYPES.PERCENT) {
    discount = (subtotal * this.value) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) discount = this.maxDiscount;
  } else if (this.type === PROMO_TYPES.FIXED) {
    discount = Math.min(this.value, subtotal);
  } else if (this.type === PROMO_TYPES.FREE_SHIPPING) {
    freeShipping = true;
    discount = shippingFee;
  }

  return { ok: true, discount: +discount.toFixed(2), freeShipping, message: 'Promo applied' };
};

promoSchema.methods.recordUse = async function (userId) {
  this.usesCount += 1;
  if (userId) {
    const key = userId.toString();
    const used = this.usersUsed.get(key) || 0;
    this.usersUsed.set(key, used + 1);
  }
  await this.save();
};

export const Promo = mongoose.model('Promo', promoSchema);
