import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    subtitle: String,
    imageUrl: { type: String, required: true },
    linkUrl: String,
    ctaLabel: String,
    placement: {
      type: String,
      enum: ['home_hero', 'home_deal', 'home_new_arrivals', 'home_secondary', 'welcome', 'category_top', 'promo_strip'],
      default: 'home_hero',
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: Date,
    endsAt: Date,
  },
  { timestamps: true }
);

export const Banner = mongoose.model('Banner', bannerSchema);
