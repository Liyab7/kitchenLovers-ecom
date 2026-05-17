import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../public/brand/logo.jpg');
const OUT_DIR = path.resolve(__dirname, '../public/brand');

const TARGETS = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 512, file: 'icon-maskable-512.png', pad: 0.18 },
];

await fs.mkdir(OUT_DIR, { recursive: true });

for (const { size, file, pad = 0 } of TARGETS) {
  const inner = Math.round(size * (1 - pad * 2));
  const buf = await sharp(SRC)
    .resize(inner, inner, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 248, b: 243, alpha: 1 },
    },
  })
    .composite([{ input: buf, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, file));

  console.log(`generated ${file} (${size}x${size})`);
}
