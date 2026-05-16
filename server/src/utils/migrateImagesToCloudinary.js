/**
 * One-shot migration: upload every local /uploads/* image to Cloudinary,
 * then rewrite the DB URL from /uploads/filename.jpg → Cloudinary CDN URL.
 *
 * Run from the server/ directory:
 *   node src/utils/migrateImagesToCloudinary.js
 *
 * Safe to re-run — already-migrated URLs (starting with https://res.cloudinary.com)
 * are skipped.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import { Banner } from '../models/Banner.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { UPLOADS_DIR } from '../config/paths.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extract just the filename from a relative /uploads/foo.jpg path
function localPath(url) {
  if (!url || url.startsWith('https://')) return null;
  const filename = path.basename(url);
  return path.join(UPLOADS_DIR, filename);
}

async function uploadToCloudinary(filePath, folder = 'kitchenlovers/products') {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
}

async function migrate() {
  await connectDB();
  console.log('[migrate] connected to DB');
  console.log('[migrate] uploads dir:', UPLOADS_DIR);

  let total = 0;
  let skipped = 0;
  let failed = 0;

  // ── Banners ──────────────────────────────────────────────────────────────
  const banners = await Banner.find({});
  for (const b of banners) {
    const fp = localPath(b.imageUrl);
    if (!fp) { skipped++; continue; }
    if (!fs.existsSync(fp)) {
      console.warn(`  [banner ${b._id}] file not found: ${fp}`);
      failed++;
      continue;
    }
    try {
      b.imageUrl = await uploadToCloudinary(fp, 'kitchenlovers/banners');
      await b.save();
      console.log(`  [banner ${b._id}] → ${b.imageUrl}`);
      total++;
    } catch (err) {
      console.error(`  [banner ${b._id}] upload failed:`, err.message);
      failed++;
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await Category.find({ image: { $exists: true, $ne: null } });
  for (const c of categories) {
    const fp = localPath(c.image);
    if (!fp) { skipped++; continue; }
    if (!fs.existsSync(fp)) {
      console.warn(`  [category ${c._id}] file not found: ${fp}`);
      failed++;
      continue;
    }
    try {
      c.image = await uploadToCloudinary(fp, 'kitchenlovers/categories');
      await c.save();
      console.log(`  [category ${c._id}] → ${c.image}`);
      total++;
    } catch (err) {
      console.error(`  [category ${c._id}] upload failed:`, err.message);
      failed++;
    }
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await Product.find({});
  for (const p of products) {
    let changed = false;
    const newImages = [];
    for (const img of p.images || []) {
      const fp = localPath(img.url);
      if (!fp) { newImages.push(img); skipped++; continue; }
      if (!fs.existsSync(fp)) {
        console.warn(`  [product ${p._id}] file not found: ${fp}`);
        newImages.push(img);
        failed++;
        continue;
      }
      try {
        const cdnUrl = await uploadToCloudinary(fp, 'kitchenlovers/products');
        newImages.push({ ...(img.toObject ? img.toObject() : img), url: cdnUrl });
        console.log(`  [product ${p._id}] image → ${cdnUrl}`);
        changed = true;
        total++;
      } catch (err) {
        console.error(`  [product ${p._id}] upload failed:`, err.message);
        newImages.push(img);
        failed++;
      }
    }
    if (changed) {
      p.images = newImages;
      await p.save();
    }
  }

  console.log(`\n[migrate] done — uploaded: ${total}, already on CDN (skipped): ${skipped}, failed: ${failed}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
