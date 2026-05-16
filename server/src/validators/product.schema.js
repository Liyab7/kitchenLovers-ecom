import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

const PRODUCT_STATUSES = ['published', 'draft', 'hidden', 'out_of_stock'];

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(220).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  brand: z.string().max(120).optional(),
  sku: z.string().max(80).optional(),

  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().optional(),
  compareAtPrice: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),

  stock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  trackInventory: z.boolean().optional(),
  deliveryWeight: z.number().nonnegative().optional(),

  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().optional(), isPrimary: z.boolean().optional() }))
    .optional(),
  videos: z
    .array(z.object({ url: z.string().url(), title: z.string().optional(), poster: z.string().url().optional() }))
    .optional(),

  categories: z.array(objectId).optional(),
  tags: z.array(z.string().min(1).max(60)).optional(),

  variants: z
    .array(z.object({
      name: z.string().min(1).max(60),
      options: z.array(z.string().min(1).max(60)).min(1),
    }))
    .optional(),

  attributes: z.record(z.string(), z.string()).optional(),

  status: z.enum(PRODUCT_STATUSES).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  q: z.string().optional(),
  category: objectId.optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});
