import { Router } from 'express';
import * as ctrl from '../controllers/review.controller.js';
import { requireAuth, requireVerifiedPhone } from '../middlewares/auth.js';

const router = Router();

router.post('/', requireAuth, requireVerifiedPhone, ctrl.createReview);

export default router;
