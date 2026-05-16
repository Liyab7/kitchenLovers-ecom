import { Router } from 'express';
import * as ctrl from '../controllers/promo.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();

// Customer: validate a code (auth required so we can enforce per-user limit)
router.post('/validate', requireAuth, ctrl.validatePromo);

const adminGuard = [requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

router.get('/', ...adminGuard, ctrl.listPromos);
router.post('/', ...adminGuard, audit({ action: 'promo.create', targetKind: 'Promo', label: (r) => r.body?.code }), ctrl.createPromo);
router.put('/:id', ...adminGuard, audit({ action: 'promo.update', targetKind: 'Promo', label: (r) => r.body?.code }), ctrl.updatePromo);
router.delete('/:id', ...adminGuard, audit({ action: 'promo.delete', targetKind: 'Promo' }), ctrl.deletePromo);

export default router;
