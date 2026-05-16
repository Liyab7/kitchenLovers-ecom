import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiters.js';
import {
  registerSchema,
  loginSchema,
  otpVerifySchema,
  otpResendSchema,
  refreshSchema,
} from '../validators/auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/verify-otp', authLimiter, validate(otpVerifySchema), ctrl.verifyOtp);
router.post('/resend-otp', otpLimiter, validate(otpResendSchema), ctrl.resendOtp);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

export default router;
