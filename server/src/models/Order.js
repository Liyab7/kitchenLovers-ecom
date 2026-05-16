import mongoose from 'mongoose';

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
});

// The natural happy path. Useful for "next action" buttons on the admin.
export const ORDER_FLOW = ['pending', 'paid', 'processing', 'packed', 'dispatched', 'in_transit', 'delivered'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: String,
    sku: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    postalCode: String,
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    note: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },

    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GHS' },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    history: [statusEventSchema],

    deliveryMethod: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard',
    },
    deliveryEtaDays: { type: [Number], default: [3, 5] }, // [min, max]
    promoCode: String,

    shippingAddress: { type: shippingAddressSchema, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: Date,
    deliveredAt: Date,
    notes: String,

    // ── Delivery / rider tracking ─────────────────────────────────────
    assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedRiderAt: Date,
    dispatchedAt: Date,
    estimatedArrival: Date,
    lastLocation: {
      lat: Number,
      lng: Number,
      at: Date,
      note: String,
    },
  },
  { timestamps: true }
);

// Mongoose runs validation BEFORE pre('save') hooks, so generating `orderNumber`
// inside pre('save') trips the required-field check. Generate it during pre('validate')
// so the value exists before the required-field gate runs.
orderSchema.pre('validate', function (next) {
  if (this.isNew && !this.orderNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.orderNumber = `ORD-${stamp}-${rand}`;
  }
  if (this.isNew && (!this.history || this.history.length === 0)) {
    this.history = [{ status: this.status || ORDER_STATUS.PENDING, at: new Date() }];
  }
  next();
});

export const Order = mongoose.model('Order', orderSchema);
