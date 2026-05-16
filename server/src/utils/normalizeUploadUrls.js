/**
 * One-shot migration: rewrite any absolute upload URL stored in the DB
 * (e.g. http://localhost:5000/uploads/foo.jpg or http://localhost:5173/uploads/foo.jpg)
 * to a portable relative path (/uploads/foo.jpg).
 *
 * Safe to run multiple times — relative paths are left untouched.
 *
 * Run:
 *   node src/utils/normalizeUploadUrls.js
 */

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Banner } from '../models/Banner.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

function toRelative(url) {
  if (!url || typeof url !== 'string') return url;
  // Match an /uploads/... segment buried in any absolute URL and keep only that tail
  const m = url.match(/(\/uploads\/[^?#]+)/);
  return m ? m[1] : url;
}

async function main() {
  await connectDB();
  console.log('[migrate] connected');

  let totalUpdated = 0;

  // ----- Banners -----
  const banners = await Banner.find({ imageUrl: { $regex: '^https?://' } });
  for (const b of banners) {
    const next = toRelative(b.imageUrl);
    if (next !== b.imageUrl) {
      b.imageUrl = next;
      await b.save();
      totalUpdated++;
      console.log(`  banner ${b._id}: ${next}`);
    }
  }
  console.log(`[migrate] banners updated: ${banners.length}`);

  // ----- Categories -----
  const categories = await Category.find({ image: { $regex: '^https?://' } });
  for (const c of categories) {
    const next = toRelative(c.image);
    if (next !== c.image) {
      c.image = next;
      await c.save();
      totalUpdated++;
      console.log(`  category ${c._id}: ${next}`);
    }
  }
  console.log(`[migrate] categories updated: ${categories.length}`);

  // ----- Products (images is an array of { url, alt, isPrimary }) -----
  const products = await Product.find({ 'images.url': { $regex: '^https?://' } });
  for (const p of products) {
    let changed = false;
    p.images = (p.images || []).map((img) => {
      const next = toRelative(img.url);
      if (next !== img.url) {
        changed = true;
        return { ...(img.toObject ? img.toObject() : img), url: next };
      }
      return img;
    });
    if (changed) {
      await p.save();
      totalUpdated++;
      console.log(`  product ${p._id}: ${p.images.length} image(s) rewritten`);
    }
  }
  console.log(`[migrate] products updated: ${products.length}`);

  console.log(`[migrate] done. total rows touched: ${totalUpdated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
