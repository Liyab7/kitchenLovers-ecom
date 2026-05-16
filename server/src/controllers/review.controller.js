import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Review } from '../models/Review.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { Product } from '../models/Product.js';

export const createReview = asyncHandler(async (req, res) => {
  const { product, order, rating, title, comment, voiceNoteUrl, photos } = req.body;
  const orderDoc = await Order.findById(order);
  if (!orderDoc || orderDoc.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only review products from your own orders');
  }
  if (orderDoc.status !== ORDER_STATUS.DELIVERED) {
    throw ApiError.badRequest('Order must be delivered before reviewing');
  }
  const purchased = orderDoc.items.some((i) => i.product.toString() === product);
  if (!purchased) throw ApiError.badRequest('Product not in this order');

  const review = await Review.create({
    product,
    user: req.user._id,
    order,
    rating,
    title,
    comment,
    voiceNoteUrl: voiceNoteUrl || undefined,
    photos: Array.isArray(photos) ? photos.map((url) => ({ url })) : [],
  });

  const agg = await Review.aggregate([
    { $match: { product: review.product, isApproved: true } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (agg[0]) {
    await Product.findByIdAndUpdate(review.product, {
      averageRating: +agg[0].avg.toFixed(2),
      reviewsCount: agg[0].count,
    });
  }

  res.status(201).json({ success: true, data: review });
});

export const listProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'fullName')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: reviews });
});
