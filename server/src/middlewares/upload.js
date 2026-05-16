import multer from 'multer';
import path from 'path';
import { UPLOADS_DIR } from '../config/paths.js';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images are allowed'), false);
};

const audioFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') cb(null, true);
  else cb(new Error('Only audio files are allowed'), false);
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for images
  fileFilter: imageFilter,
});

export const uploadAudio = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB for voice notes
  fileFilter: audioFilter,
});
