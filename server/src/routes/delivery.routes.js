import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.js';

// Static config — safe to expose publicly so the checkout page can render options.
const router = Router();
router.get('/', ctrl.listDeliveryMethods);
export default router;
