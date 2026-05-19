import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import reviewRoutes from './review.routes.js';
import bannerRoutes from './banner.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import inventoryRoutes from './inventory.routes.js';
import meRoutes from './me.routes.js';
import promoRoutes from './promo.routes.js';
import refundRoutes from './refund.routes.js';
import deliveryRoutes from './delivery.routes.js';
import deliveriesRoutes from './deliveries.routes.js';
import searchRoutes from './search.routes.js';
import pushRoutes from './push.routes.js';
import subscriberRoutes from './subscriber.routes.js';

import uploadRoutes from './upload.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/banners', bannerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/inventory', inventoryRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/upload', uploadRoutes);
router.use('/me', meRoutes);
router.use('/promos', promoRoutes);
router.use('/refunds', refundRoutes);
router.use('/delivery-methods', deliveryRoutes);
router.use('/deliveries', deliveriesRoutes);
router.use('/search', searchRoutes);
router.use('/push', pushRoutes);
router.use('/subscribers', subscriberRoutes);

export default router;
