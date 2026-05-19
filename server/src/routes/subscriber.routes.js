import { Router } from 'express';
import * as ctrl from '../controllers/subscriber.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/Role.js';
import { authLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

// Public — storefront newsletter form posts here.
router.post('/', authLimiter, ctrl.subscribe);

// Admin-only.
router.get('/', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.listSubscribers);
router.delete('/:id', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.deleteSubscriber);

export default router;
