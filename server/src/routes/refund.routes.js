import { Router } from 'express';
import * as ctrl from '../controllers/refund.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();
router.use(requireAuth);

// Customer
router.post('/', ctrl.createRefund);
router.get('/mine', ctrl.listMyRefunds);

// Admin
const adminGuard = [requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
router.get('/', ...adminGuard, ctrl.listAllRefunds);
router.patch(
  '/:id/status',
  ...adminGuard,
  audit({ action: 'refund.status.update', targetKind: 'RefundRequest', label: (r) => r.body?.status }),
  ctrl.updateRefundStatus
);

export default router;
