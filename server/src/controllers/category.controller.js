import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Category } from '../models/Category.js';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const listCategories = asyncHandler(async (_req, res) => {
  const data = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data });
});

export const listAllCategories = asyncHandler(async (_req, res) => {
  const data = await Category.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data });
});

export const createCategory = asyncHandler(async (req, res) => {
  const body = {
    ...req.body,
    slug: req.body.slug || slug(req.body.name),
    parent: req.body.parent || null,
  };
  if (body.parent) {
    const parent = await Category.findById(body.parent);
    if (!parent) throw ApiError.badRequest('Parent category not found');
    if (parent.parent) throw ApiError.badRequest('Subcategories can only be added under top-level categories');
  }
  const cat = await Category.create(body);
  res.status(201).json({ success: true, data: cat });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (Object.prototype.hasOwnProperty.call(body, 'parent')) {
    body.parent = body.parent || null;
    if (body.parent) {
      if (body.parent === req.params.id) throw ApiError.badRequest('A category cannot be its own parent');
      const parent = await Category.findById(body.parent);
      if (!parent) throw ApiError.badRequest('Parent category not found');
      if (parent.parent) throw ApiError.badRequest('Subcategories can only be added under top-level categories');
    }
  }
  const cat = await Category.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!cat) throw ApiError.notFound();
  res.json({ success: true, data: cat });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw ApiError.notFound();
  await Category.updateMany({ parent: cat._id }, { $set: { parent: null } });
  res.json({ success: true, message: 'Deleted' });
});
