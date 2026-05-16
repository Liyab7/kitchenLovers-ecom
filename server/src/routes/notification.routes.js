import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', ctrl.listMine);
router.patch('/:id/read', ctrl.markRead);
router.post('/read-all', ctrl.markAllRead);

export default router;
