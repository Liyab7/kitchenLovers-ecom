import { Router } from 'express';
import * as ctrl from '../controllers/product.controller.js';
import * as reviews from '../controllers/review.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { audit } from '../middlewares/audit.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../validators/product.schema.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.get('/', validate(productQuerySchema, 'query'), ctrl.listProducts);
router.get('/:id', ctrl.getProduct);
router.get('/:productId/reviews', reviews.listProductReviews);

const adminGuard = [requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

router.post('/', ...adminGuard, validate(createProductSchema), audit({ action: 'product.create', targetKind: 'Product', label: (r) => r.body?.name }), ctrl.createProduct);
router.post('/bulk', ...adminGuard, audit({ action: 'product.bulk_create', targetKind: 'Product' }), ctrl.bulkCreateProducts);
router.put('/:id', ...adminGuard, validate(updateProductSchema), audit({ action: 'product.update', targetKind: 'Product', label: (r) => r.body?.name }), ctrl.updateProduct);
router.delete('/:id', ...adminGuard, audit({ action: 'product.delete', targetKind: 'Product' }), ctrl.deleteProduct);

export default router;
