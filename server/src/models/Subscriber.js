import mongoose from 'mongoose';

// Newsletter subscribers — people who entered their phone/email on the storefront's
// "Stay Updated" form. Used by the admin SMS broadcast (phone) and email campaigns (email).
// Anyone can subscribe without an account; deduped on phone (or email if no phone).
const subscriberSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    fullName: { type: String, trim: true },
    source: { type: String, default: 'newsletter' }, // newsletter | popup | checkout | manual
    isUnsubscribed: { type: Boolean, default: false, index: true },
    // Tracks whether this subscriber also corresponds to a registered user (for future merging).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  },
  { timestamps: true }
);

// At least one contact channel is required.
subscriberSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    return next(new Error('Either phone or email is required'));
  }
  next();
});

// Unique-but-sparse: same phone OR same email can't be subscribed twice,
// but a row without one of them is fine.
subscriberSchema.index({ phone: 1 }, { unique: true, sparse: true });
subscriberSchema.index({ email: 1 }, { unique: true, sparse: true });

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
