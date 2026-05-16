import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/Product.js';
import { StockMovement, STOCK_REASONS, applyStockMovement } from '../models/StockMovement.js';
import { parsePagination, paginatedResponse } from '../utils/paginate.js';

const ADJUSTMENT_REASONS = [
  STOCK_REASONS.RESTOCK,
  STOCK_REASONS.ADJUSTMENT,
  STOCK_REASONS.DAMAGE,
  STOCK_REASONS.RETURN,
  STOCK_REASONS.CANCELLATION,
];

// Admin: recent stock movements across the whole catalog
export const listMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.product) filter.product = req.query.product;
  if (req.query.reason) filter.reason = req.query.reason;

  const [data, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

// Admin: current stock levels with optional low-stock filter
export const listStockLevels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) filter.name = new RegExp(req.query.q, 'i');
  if (req.query.lowOnly === 'true') {
    filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    filter.trackInventory = true;
  }
  if (req.query.outOnly === 'true') {
    filter.trackInventory = true;
    filter.stock = { $lte: 0 };
  }

  const [data, total] = await Promise.all([
    Product.find(filter)
      .select('name slug images price currency stock lowStockThreshold trackInventory status brand sku')
      .sort({ stock: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

// Admin: manually adjust stock with reason + note. Logs a StockMovement.
export const adjustStock = asyncHandler(async (req, res) => {
  const { delta, reason, note } = req.body;
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) {
    throw ApiError.badRequest('delta must be a non-zero number');
  }
  if (!ADJUSTMENT_REASONS.includes(reason)) {
    throw ApiError.badRequest(`Invalid reason. Allowed: ${ADJUSTMENT_REASONS.join(', ')}`);
  }

  const product = await Product.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.trackInventory) throw ApiError.badRequest('Product does not track inventory');

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await applyStockMovement({
        product,
        delta: numericDelta,
        reason,
        note,
        session,
        actor: req.user,
      });
    });
  } finally {
    session.endSession();
  }

  res.json({
    success: true,
    data: {
      product: { _id: product._id, name: product.name, stock: product.stock },
      movement: result,
    },
  });
});

// Admin: full movement history for one product
export const productMovements = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).select('name stock lowStockThreshold');
  if (!product) throw ApiError.notFound();

  const movements = await StockMovement.find({ product: product._id })
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({
    success: true,
    data: { product, movements },
  });
});
