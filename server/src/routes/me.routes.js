import { Router } from 'express';
import * as ctrl from '../controllers/me.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.patch('/profile', ctrl.updateProfile);

router.get('/addresses', ctrl.listAddresses);
router.post('/addresses', ctrl.addAddress);
router.put('/addresses/:addressId', ctrl.updateAddress);
router.delete('/addresses/:addressId', ctrl.deleteAddress);

router.get('/wishlist', ctrl.listWishlist);
router.post('/wishlist', ctrl.addToWishlist);
router.delete('/wishlist/:productId', ctrl.removeFromWishlist);

export default router;
