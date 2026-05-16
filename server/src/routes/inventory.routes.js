import { Router } from 'express';
import * as ctrl from '../controllers/inventory.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.use(requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/levels', ctrl.listStockLevels);
router.get('/movements', ctrl.listMovements);
router.get('/movements/:productId', ctrl.productMovements);
router.post(
  '/adjust/:productId',
  audit({ action: 'inventory.adjust', targetKind: 'Product', label: (r) => `${r.body?.delta} (${r.body?.reason})` }),
  ctrl.adjustStock
);

export default router;
