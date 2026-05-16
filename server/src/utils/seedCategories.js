import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Category } from '../models/Category.js';

const slug = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Top-level category → its subcategories. Mirrors the structure in the spec.
const TREE = [
  {
    name: 'Cookware',
    subs: ['Pot Sets', 'Frying Pans', 'Non-Stick Pans', 'Pressure Cookers', 'Sauce Pans', 'Grill Pans', 'Steamers', 'Ceramic Pots', 'Cast Iron Cookware'],
  },
  {
    name: 'Kitchen Appliances',
    subs: ['Blenders', 'Juicers', 'Food Processors', 'Mixers', 'Air Fryers', 'Microwaves', 'Rice Cookers', 'Electric Kettles', 'Coffee Machines', 'Toasters', 'Sandwich Makers', 'Induction Cookers', 'Electric Ovens', 'Deep Fryers'],
  },
  {
    name: 'Bakeware',
    subs: ['Baking Trays', 'Cake Molds', 'Muffin Pans', 'Pizza Pans', 'Oven Dishes', 'Baking Accessories'],
  },
  {
    name: 'Kitchen Utensils',
    subs: ['Spoon Sets', 'Knives', 'Chopping Boards', 'Spatulas', 'Whisks', 'Peelers', 'Tongs', 'Measuring Cups', 'Kitchen Scissors'],
  },
  {
    name: 'Dinnerware & Serving',
    subs: ['Plate Sets', 'Bowls', 'Cups & Mugs', 'Serving Trays', 'Cutlery Sets', 'Glassware', 'Serving Bowls'],
  },
  {
    name: 'Storage & Organization',
    subs: ['Food Storage Containers', 'Spice Racks', 'Kitchen Shelves', 'Dish Racks', 'Lunch Boxes', 'Fridge Organizers', 'Storage Baskets'],
  },
  {
    name: 'Home & Dining',
    subs: ['Dining Tables', 'Dining Accessories', 'Home Decor', 'Table Mats', 'Kitchen Towels', 'Curtains', 'Decorative Pieces'],
  },
  {
    name: 'Commercial Kitchen Equipment',
    subs: ['Commercial Blenders', 'Industrial Pots', 'Juice Dispensers', 'Food Warmers', 'Catering Equipment', 'Commercial Ovens'],
  },
];

async function upsertCategory(name, parent = null, sortOrder = 0) {
  const s = slug(name);
  const doc = await Category.findOneAndUpdate(
    { slug: s },
    { $set: { name, parent, sortOrder, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
}

async function run() {
  await connectDB();

  let total = 0;
  for (let i = 0; i < TREE.length; i++) {
    const { name, subs } = TREE[i];
    const parent = await upsertCategory(name, null, i);
    total += 1;
    for (let j = 0; j < subs.length; j++) {
      await upsertCategory(subs[j], parent._id, j);
      total += 1;
    }
  }

  console.log(`[seed:categories] upserted ${total} categories (${TREE.length} parents + subcategories)`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed:categories] failed', err);
  process.exit(1);
});
