import { Router } from 'express';
import express from 'express';
import * as ctrl from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/verify/:reference', requireAuth, ctrl.verifyPayment);

// Webhook needs raw body for signature verification; mount with raw parser
router.post(
  '/webhook/paystack',
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  ctrl.paystackWebhook
);

export default router;
