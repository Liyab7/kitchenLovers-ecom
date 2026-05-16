import mongoose from 'mongoose';

const savedCardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, default: 'paystack' },
    authorizationCode: { type: String, required: true, select: false }, // sensitive — never expose
    signature: String, // useful for de-dup
    cardType: String, // 'visa', 'mastercard', etc.
    bin: String,
    last4: String,
    expMonth: String,
    expYear: String,
    bank: String,
    channel: String,
    countryCode: String,
    reusable: { type: Boolean, default: true },
    label: String, // optional human-friendly nickname
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

savedCardSchema.index({ user: 1, signature: 1 }, { unique: true, sparse: true });

savedCardSchema.methods.toSafeJSON = function () {
  const o = this.toObject();
  delete o.authorizationCode;
  return o;
};

export const SavedCard = mongoose.model('SavedCard', savedCardSchema);
