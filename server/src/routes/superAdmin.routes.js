import { Router } from 'express';
import * as ctrl from '../controllers/superAdmin.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.get('/settings/public', ctrl.getPublicSettings);

router.use(requireAuth, requireRoles(ROLES.SUPER_ADMIN));
router.get('/admins', ctrl.listAdmins);
router.post('/admins', audit({ action: 'admin.create', targetKind: 'User', label: (r) => r.body?.fullName }), ctrl.createAdmin);
router.patch('/users/:id/role', audit({ action: 'user.role.update', targetKind: 'User', label: (r) => r.body?.role }), ctrl.setUserRole);
router.patch('/users/:id/active', audit({ action: 'user.active.update', targetKind: 'User' }), ctrl.setUserActive);
router.get('/settings', ctrl.getSettings);
router.put('/settings', audit({ action: 'setting.update', targetKind: 'Setting', label: (r) => r.body?.key }), ctrl.upsertSetting);

export default router;
