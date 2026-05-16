import 'dotenv/config';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Role, ROLES } from '../models/Role.js';
import { Category } from '../models/Category.js';
import { Setting } from '../models/Setting.js';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function run() {
  await connectDB();

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
    console.log(`[seed] created super admin: ${superPhone} / ${superPass}`);
  } else {
    console.log(`[seed] super admin already exists: ${superPhone}`);
  }

  // Create an Admin user for testing
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
    console.log(`[seed] created admin: ${adminPhone} / ${superPass}`);
  } else {
    console.log(`[seed] admin already exists: ${adminPhone}`);
  }

  const categories = ['Cookware', 'Cutlery', 'Bakeware', 'Appliances', 'Storage'];
  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    await Category.updateOne(
      { slug: slug(name) },
      { $setOnInsert: { name, slug: slug(name), sortOrder: i } },
      { upsert: true }
    );
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

  console.log('[seed] done');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
