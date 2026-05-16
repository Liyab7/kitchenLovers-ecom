import { Router } from 'express';
import * as ctrl from '../controllers/delivery.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();
router.use(requireAuth);

const adminOnly = [requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

// Admin scope
router.get('/riders', ...adminOnly, ctrl.listRiders);
router.get('/active', ...adminOnly, ctrl.listActiveDeliveries);

// Rider scope (admins can also use it for inspection)
router.get('/mine', ctrl.listMyDeliveries);
router.patch(
  '/:id/assign',
  ...adminOnly,
  audit({ action: 'delivery.assign', targetKind: 'Order', label: (r) => r.body?.riderId }),
  ctrl.assignRider
);

// Rider or admin scope
router.post(
  '/:id/location',
  audit({ action: 'delivery.location.update', targetKind: 'Order' }),
  ctrl.updateDeliveryLocation
);

// Customer-light fetch
router.get('/:id', ctrl.getDeliveryState);

export default router;
