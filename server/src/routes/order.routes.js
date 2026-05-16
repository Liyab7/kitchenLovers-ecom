import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.js';
import * as receipt from '../controllers/receipt.controller.js';
import { requireAuth, requireRoles, requireVerifiedPhone } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { audit } from '../middlewares/audit.js';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.schema.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.use(requireAuth);
router.post('/', requireVerifiedPhone, validate(createOrderSchema), ctrl.createOrder);
router.get('/mine', ctrl.listMyOrders);
router.get('/all', requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.listAllOrders);
router.get('/:id', ctrl.getOrder);
router.get('/:id/receipt', receipt.downloadOrderReceipt);
router.patch(
  '/:id/status',
  requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateOrderStatusSchema),
  audit({ action: 'order.status.update', targetKind: 'Order', label: (r) => r.body?.status }),
  ctrl.updateOrderStatus
);

export default router;
