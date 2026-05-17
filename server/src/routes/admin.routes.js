import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { audit } from '../middlewares/audit.js';
import { ROLES } from '../models/Role.js';

const router = Router();

router.use(requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/metrics', ctrl.dashboardMetrics);
router.get('/customers', ctrl.listCustomers);
router.patch('/customers/:id', audit({ action: 'customer.update', targetKind: 'User', label: (r) => r.body?.fullName }), ctrl.updateCustomer);
router.delete('/customers/:id', audit({ action: 'customer.delete', targetKind: 'User' }), ctrl.deleteCustomer);
router.get('/reports/sales', ctrl.salesReport);
router.get('/sms-broadcast/preview', ctrl.previewSmsBroadcast);
router.post('/sms-broadcast', ctrl.sendSmsBroadcast);
router.get('/audit-log', ctrl.auditLog);

export default router;
