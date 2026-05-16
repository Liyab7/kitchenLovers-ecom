import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { parsePagination, parseSort, paginatedResponse } from '../utils/paginate.js';

function makeSlug(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'price', 'name', 'salesCount', 'averageRating']);

  const filter = { isActive: true };
  if (req.query.q) {
    // Case-insensitive substring search across name, brand, description, tags
    const safe = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [
      { name: rx },
      { brand: rx },
      { description: rx },
      { shortDescription: rx },
      { tags: rx },
    ];
  }
  if (req.query.category) {
    const category = await Category.findById(req.query.category).select('parent');
    if (category && !category.parent) {
      const childIds = await Category.find({ parent: category._id, isActive: true }).distinct('_id');
      filter.categories = { $in: [category._id, ...childIds] };
    } else {
      filter.categories = req.query.category;
    }
  }
  if (req.query.tag) {
    const tags = String(req.query.tag).split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }
  if (req.query.featured !== undefined) filter.isFeatured = req.query.featured;
  if (req.query.inStock) filter.stock = { $gt: 0 };
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    filter.price = {};
    if (req.query.minPrice !== undefined) filter.price.$gte = req.query.minPrice;
    if (req.query.maxPrice !== undefined) filter.price.$lte = req.query.maxPrice;
  }

  const [data, total] = await Promise.all([
    Product.find(filter).populate('categories', 'name slug').sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse({ data, page, limit, total }) });
});

export const getProduct = asyncHandler(async (req, res) => {
  const query = req.params.id.match(/^[a-fA-F0-9]{24}$/)
    ? { _id: req.params.id }
    : { slug: req.params.id };
  const product = await Product.findOne(query).populate('categories', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = data.slug || makeSlug(data.name);
  data.createdBy = req.user._id;
  const product = await Product.create(data);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.name && !data.slug) data.slug = makeSlug(data.name);
  const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, message: 'Deleted' });
});

export const bulkCreateProducts = asyncHandler(async (req, res) => {
  const items = req.body.products;
  if (!Array.isArray(items) || items.length === 0) throw ApiError.badRequest('products[] required');
  const docs = items.map((p) => ({ ...p, slug: p.slug || makeSlug(p.name), createdBy: req.user._id }));
  const created = await Product.insertMany(docs, { ordered: false });
  res.status(201).json({ success: true, data: { inserted: created.length } });
});
