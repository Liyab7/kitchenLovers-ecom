import { Router } from 'express';
import * as ctrl from '../controllers/push.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/public-key', ctrl.publicKey);

router.use(requireAuth);
router.post('/subscribe', ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.post('/test', ctrl.sendTest);

export default router;
