import { AuditLog } from '../models/AuditLog.js';
import { ROLES } from '../models/Role.js';

/**
 * Records a successful admin/super-admin mutation. Mount AFTER auth middleware
 * (req.user must exist) and AFTER the response is finalized — we only log 2xx.
 *
 *   router.post('/products', requireAuth, requireRoles(...),
 *     audit({ action: 'product.create', targetKind: 'Product' }),
 *     ctrl.createProduct);
 */
export function audit({ action, targetKind, label } = {}) {
  return function auditMiddleware(req, res, next) {
    res.on('finish', () => {
      try {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        if (!req.user) return;
        if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) return;

        AuditLog.create({
          actor: req.user._id,
          actorName: req.user.fullName,
          actorRole: req.user.role,
          action: action || `${req.method.toLowerCase()}.${req.baseUrl}${req.route?.path || ''}`,
          target: {
            kind: targetKind,
            id: req.params?.id || undefined,
            label: typeof label === 'function' ? label(req) : label,
          },
          method: req.method,
          path: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(() => { /* best-effort logging */ });
      } catch { /* swallow */ }
    });
    next();
  };
}
