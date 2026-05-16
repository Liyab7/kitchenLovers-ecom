import { Router } from 'express';
import { upload, uploadAudio } from '../middlewares/upload.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/Role.js';
import { env } from '../config/env.js';

const router = Router();

// Always store a relative `/uploads/<file>` path so the URL stays portable across
// dev (Vite proxy) and prod (any domain). If frontend and backend live on different
// origins, set PUBLIC_URL (e.g. https://api.example.com) — it'll be prefixed here.
function fileUrl(_req, filename) {
  const relative = `/uploads/${filename}`;
  return env.publicUrl ? `${env.publicUrl}${relative}` : relative;
}

// Image upload — admins only (product photos, etc.)
router.post('/', requireAuth, requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.status(201).json({ success: true, url: fileUrl(req, req.file.filename) });
});

// Audio upload — any authenticated user (e.g. voice-note reviews)
router.post('/audio', requireAuth, uploadAudio.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.status(201).json({ success: true, url: fileUrl(req, req.file.filename) });
});

export default router;
