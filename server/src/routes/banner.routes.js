import { Router } from 'express';
import * as ctrl from '../controllers/banner.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.get('/', ctrl.listBanners);
router.post('/', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.createBanner);
router.put('/:id', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.updateBanner);
router.delete('/:id', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.deleteBanner);

export default router;
