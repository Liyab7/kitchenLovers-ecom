import { Router } from 'express';
import { upload, uploadAudio } from '../middlewares/upload.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/Role.js';
import { env } from '../config/env.js';

const router = Router();

// When Cloudinary is active, req.file.path is the full CDN URL.
// When using local disk, we build a relative /uploads/<file> path.
function fileUrl(req, file) {
  if (env.cloudinary.enabled) return file.path;
  const relative = `/uploads/${file.filename}`;
  return env.publicUrl ? `${env.publicUrl}${relative}` : relative;
}

router.post('/', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.status(201).json({ success: true, url: fileUrl(req, req.file) });
});

router.post('/audio', requireAuth, uploadAudio.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.status(201).json({ success: true, url: fileUrl(req, req.file) });
});

export default router;
