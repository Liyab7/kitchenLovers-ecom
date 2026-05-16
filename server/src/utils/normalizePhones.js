/**
 * One-shot: rewrite every User.phone to canonical E.164 (+233...) form so login
 * with either "0244..." or "+233..." resolves to the same record.
 *
 * Safe to run multiple times — already-canonical numbers are left untouched.
 *
 *   npm run migrate:phones
 */

import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { normalizePhone } from './phone.js';

async function main() {
  await connectDB();
  const users = await User.find({});
  let touched = 0;
  for (const u of users) {
    if (!u.phone) continue;
    const next = normalizePhone(u.phone);
    if (next !== u.phone) {
      console.log(`  ${u.phone}  →  ${next}  (${u.fullName})`);
      u.phone = next;
      try {
        await u.save();
        touched++;
      } catch (err) {
        console.error(`  ✗ ${u._id}: ${err.message}`);
      }
    }
  }
  console.log(`[migrate-phones] done. updated ${touched}/${users.length}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error('[migrate-phones] failed:', e); process.exit(1); });
