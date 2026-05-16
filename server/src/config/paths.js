import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server/src/config -> server/
export const SERVER_ROOT = path.resolve(__dirname, '../..');

// UPLOADS_DIR can be overridden via env (e.g. Render persistent disk at /var/data/uploads).
// Defaults to ./server/uploads for local dev.
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(SERVER_ROOT, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
