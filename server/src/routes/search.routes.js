import { Router } from 'express';
import * as ctrl from '../controllers/search.controller.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

const router = Router();

// Soft auth — optional Bearer token; recent/log work without it but log will only persist for auth'd users
router.use(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user) req.user = user;
    } catch { /* ignore — anonymous fine */ }
  }
  next();
});

router.post('/log', ctrl.logSearch);
router.get('/trending', ctrl.trending);
router.get('/recent', ctrl.recent);

export default router;
