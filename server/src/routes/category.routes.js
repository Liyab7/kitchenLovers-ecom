import { Router } from 'express';
import * as ctrl from '../controllers/category.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();
const adminGuard = [requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

router.get('/', ctrl.listCategories);
router.get('/admin/all', ...adminGuard, ctrl.listAllCategories);
router.post('/', ...adminGuard, audit({ action: 'category.create', targetKind: 'Category', label: (r) => r.body?.name }), ctrl.createCategory);
router.put('/:id', ...adminGuard, audit({ action: 'category.update', targetKind: 'Category', label: (r) => r.body?.name }), ctrl.updateCategory);
router.delete('/:id', ...adminGuard, audit({ action: 'category.delete', targetKind: 'Category' }), ctrl.deleteCategory);

export default router;
