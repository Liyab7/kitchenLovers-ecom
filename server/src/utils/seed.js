import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Role, ROLES } from '../models/Role.js';
import { Category } from '../models/Category.js';
import { Setting } from '../models/Setting.js';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function runSeed({ log = console.log } = {}) {
  for (const name of Object.values(ROLES)) {
    await Role.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }

  const superPhone = process.env.SEED_SUPER_ADMIN_PHONE || '+10000000000';
  const superPass = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

  const existingSuper = await User.findOne({ phone: superPhone });
  if (!existingSuper) {
    await User.create({
      fullName: 'Super Admin',
      phone: superPhone,
      password: superPass,
      role: ROLES.SUPER_ADMIN,
      isPhoneVerified: true,
    });
    log(`[seed] created super admin: ${superPhone}`);
  } else {
    log(`[seed] super admin already exists: ${superPhone}`);
  }

  const adminPhone = '+20000000000';
  const existingAdmin = await User.findOne({ phone: adminPhone });
  if (!existingAdmin) {
    await User.create({
      fullName: 'Store Admin',
      phone: adminPhone,
      password: superPass,
      role: ROLES.ADMIN,
      isPhoneVerified: true,
    });
    log(`[seed] created admin: ${adminPhone}`);
  } else {
    log(`[seed] admin already exists: ${adminPhone}`);
  }

  // Only seed default categories on a brand-new database. Once the admin has
  // customized the catalog (added/deleted any category), respect those edits
  // and stop re-creating defaults on every restart.
  const existingCount = await Category.estimatedDocumentCount();
  if (existingCount === 0) {
    const categories = ['Cookware', 'Cutlery', 'Bakeware', 'Appliances', 'Storage'];
    for (let i = 0; i < categories.length; i++) {
      const name = categories[i];
      await Category.create({ name, slug: slug(name), sortOrder: i });
    }
    log(`[seed] inserted ${categories.length} default categories (first-run)`);
  } else {
    log(`[seed] categories present (${existingCount}) — skipping default seed`);
  }

  await Setting.updateOne(
    { key: 'storefront' },
    {
      $setOnInsert: {
        key: 'storefront',
        isPublic: true,
        value: { storeName: 'KitchenLovers', currency: 'GHS', supportPhone: '' },
        description: 'Public storefront configuration',
      },
    },
    { upsert: true }
  );

  log('[seed] done');
}

const isDirectRun = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`
  || process.argv[1]?.endsWith('seed.js');

if (isDirectRun) {
  (async () => {
    try {
      await connectDB();
      await runSeed();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[seed] failed', err);
      process.exit(1);
    }
  })();
}
