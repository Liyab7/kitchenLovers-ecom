import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { UPLOADS_DIR } from '../config/paths.js';

// Lazily import Cloudinary storage so the server still boots without Cloudinary credentials
// (local disk fallback is used in that case).
async function getStorages() {
  if (env.cloudinary.enabled) {
    const { cloudinaryImageStorage, cloudinaryAudioStorage } = await import('../config/cloudinary.js');
    return { imageStorage: cloudinaryImageStorage, audioStorage: cloudinaryAudioStorage };
  }
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    },
  });
  return { imageStorage: diskStorage, audioStorage: diskStorage };
}

const { imageStorage, audioStorage } = await getStorages();

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images are allowed'), false);
};

const audioFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') cb(null, true);
  else cb(new Error('Only audio files are allowed'), false);
};

export const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: audioFilter,
});
