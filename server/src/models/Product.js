import mongoose from 'mongoose';

export const PRODUCT_STATUS = Object.freeze({
  PUBLISHED: 'published',
  DRAFT: 'draft',
  HIDDEN: 'hidden',
  OUT_OF_STOCK: 'out_of_stock',
});

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, alt: String, isPrimary: { type: Boolean, default: false } },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  { url: { type: String, required: true }, title: String, poster: String },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Color", "Size", "Capacity"
    options: [{ type: String, required: true }], // e.g. ["Red","Black"] or ["3L","5L"]
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '', index: 'text' },
    shortDescription: String,
    brand: { type: String, trim: true, index: true },
    sku: { type: String, unique: true, sparse: true, index: true },

    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 }, // optional sale price; storefront still hides comparison
    compareAtPrice: { type: Number, min: 0 }, // legacy field — kept for back-compat
    currency: { type: String, default: 'GHS' },

    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    trackInventory: { type: Boolean, default: true },
    deliveryWeight: { type: Number, default: 0, min: 0 }, // kg

    images: [imageSchema],
    videos: [videoSchema],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],
    tags: [{ type: String, index: true }],

    variants: [variantSchema],
    attributes: { type: Map, of: String, default: {} },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.PUBLISHED,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true }, // legacy — derived from status
    isFeatured: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Keep isActive in sync with status so existing storefront queries still work.
productSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isActive = this.status === PRODUCT_STATUS.PUBLISHED || this.status === PRODUCT_STATUS.OUT_OF_STOCK;
  }
  if (this.isModified('stock') && this.trackInventory) {
    if (this.stock <= 0 && this.status === PRODUCT_STATUS.PUBLISHED) this.status = PRODUCT_STATUS.OUT_OF_STOCK;
    if (this.stock > 0 && this.status === PRODUCT_STATUS.OUT_OF_STOCK) this.status = PRODUCT_STATUS.PUBLISHED;
  }
  next();
});

productSchema.virtual('inStock').get(function () {
  return !this.trackInventory || this.stock > 0;
});

productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice && this.discountPrice > 0 ? this.discountPrice : this.price;
});

productSchema.set('toJSON', { virtuals: true });

export const Product = mongoose.model('Product', productSchema);
