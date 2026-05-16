import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);

const shippingAddressSchema = z.object({
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  line1: z.string().trim().optional(),
  line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
}).optional();

function requireAddressField(data, ctx, field, label, min = 1) {
  const value = data.shippingAddress?.[field];
  if (!value || value.length < min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingAddress', field],
      message: `${label} is required`,
    });
  }
}

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product: objectId,
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  shippingAddress: shippingAddressSchema,
  notes: z.string().max(500).optional(),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).optional(),
  promoCode: z.string().max(40).optional(),
}).superRefine((data, ctx) => {
  if (data.deliveryMethod === 'pickup') return;

  requireAddressField(data, ctx, 'fullName', 'Full name', 2);
  requireAddressField(data, ctx, 'phone', 'Phone', 7);
  requireAddressField(data, ctx, 'line1', 'Street address', 2);
  requireAddressField(data, ctx, 'city', 'City');
  requireAddressField(data, ctx, 'country', 'Country', 2);
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending', 'paid', 'processing', 'packed', 'dispatched', 'in_transit',
    'delivered', 'cancelled', 'returned', 'refunded',
  ]),
  note: z.string().max(500).optional(),
});
