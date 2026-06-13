/**
 * XenoCRM Seed Script
 * Generates 500 realistic Indian shoppers + 2000 orders for "Brewhaus" coffee brand
 * Computes RFM scores and updates customer aggregates
 *
 * Run: npx ts-node src/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Static data pools ────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Aisha', 'Akash', 'Amit', 'Ananya', 'Arjun', 'Arnav',
  'Deepika', 'Dev', 'Divya', 'Farhan', 'Gauri', 'Isha', 'Ishaan', 'Kabir',
  'Karan', 'Kavya', 'Keerthi', 'Kriti', 'Lakshmi', 'Manish', 'Maya', 'Meera',
  'Mihir', 'Mohan', 'Naina', 'Neha', 'Nikhil', 'Nina', 'Pallavi', 'Pooja',
  'Priya', 'Rahul', 'Raj', 'Riya', 'Rohan', 'Sanya', 'Sara', 'Shaan',
  'Shruti', 'Simran', 'Sneha', 'Sonia', 'Suresh', 'Tanvi', 'Tara', 'Uday',
  'Varun', 'Vidya', 'Vikram', 'Vivek', 'Yash', 'Zara', 'Zubin',
];

const LAST_NAMES = [
  'Agarwal', 'Bhat', 'Chakraborty', 'Chopra', 'Das', 'Desai', 'Doshi',
  'Gandhi', 'Ghosh', 'Gupta', 'Iyer', 'Jain', 'Joshi', 'Kapoor', 'Kaur',
  'Khan', 'Kumar', 'Malhotra', 'Mehta', 'Mishra', 'Nair', 'Nayak', 'Patel',
  'Pillai', 'Rao', 'Reddy', 'Shah', 'Sharma', 'Shukla', 'Singh', 'Sinha',
  'Srinivasan', 'Trivedi', 'Verma',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
];

const MENU_ITEMS = [
  { name: 'Signature Cold Brew', price: 280 },
  { name: 'Flat White', price: 220 },
  { name: 'Cappuccino', price: 190 },
  { name: 'Nitro Coffee', price: 320 },
  { name: 'Caramel Latte', price: 250 },
  { name: 'Espresso Shot', price: 120 },
  { name: 'Matcha Latte', price: 290 },
  { name: 'Croissant', price: 160 },
  { name: 'Avocado Toast', price: 340 },
  { name: 'Blueberry Muffin', price: 130 },
  { name: 'Coffee Beans (250g)', price: 580 },
  { name: 'Brewhaus Tumbler', price: 890 },
  { name: 'Cold Brew Kit', price: 1200 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randDate = (daysAgo: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  return d;
};

const isoDate = (d: Date) => d.toISOString();

function generatePhone(): string {
  const prefix = pick(['98', '97', '96', '95', '90', '88', '87', '86', '70']);
  const rest = Array.from({ length: 8 }, () => rand(0, 9)).join('');
  return `+91${prefix}${rest}`;
}

function generateEmail(name: string, idx: number): string {
  const clean = name.toLowerCase().replace(/\s+/g, '.');
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  return `${clean}.${idx}@${pick(domains)}`;
}

// ─── RFM Scoring ──────────────────────────────────────────────────────────────

function computeRFM(
  lastOrderDate: Date | null,
  orderCount: number,
  totalSpent: number
): { rfm_r: number; rfm_f: number; rfm_m: number; tier: 'bronze' | 'silver' | 'gold' } {
  const now = new Date();

  // Recency score (1-5): lower days = higher score
  let rfm_r = 1;
  if (lastOrderDate) {
    const daysSince = Math.floor((now.getTime() - lastOrderDate.getTime()) / 86400000);
    if (daysSince <= 14) rfm_r = 5;
    else if (daysSince <= 30) rfm_r = 4;
    else if (daysSince <= 60) rfm_r = 3;
    else if (daysSince <= 90) rfm_r = 2;
    else rfm_r = 1;
  }

  // Frequency score (1-5)
  let rfm_f = 1;
  if (orderCount >= 20) rfm_f = 5;
  else if (orderCount >= 12) rfm_f = 4;
  else if (orderCount >= 6) rfm_f = 3;
  else if (orderCount >= 2) rfm_f = 2;
  else rfm_f = 1;

  // Monetary score (1-5)
  let rfm_m = 1;
  if (totalSpent >= 15000) rfm_m = 5;
  else if (totalSpent >= 8000) rfm_m = 4;
  else if (totalSpent >= 4000) rfm_m = 3;
  else if (totalSpent >= 1500) rfm_m = 2;
  else rfm_m = 1;

  const total = rfm_r + rfm_f + rfm_m;
  const tier = total >= 12 ? 'gold' : total >= 8 ? 'silver' : 'bronze';

  return { rfm_r, rfm_f, rfm_m, tier };
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting XenoCRM seed for Brewhaus Coffee...\n');

  // ── 1. Generate 500 customers ──────────────────────────────────────────────
  console.log('👥 Generating 500 customers...');

  const customerRows = Array.from({ length: 500 }, (_, i) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    return {
      name,
      email: generateEmail(name, i + 1),
      phone: generatePhone(),
      city: pick(CITIES),
      // RFM + tier will be updated after orders are inserted
      tier: 'bronze' as const,
      total_spent: 0,
      order_count: 0,
      last_order_date: null,
      rfm_r: 1,
      rfm_f: 1,
      rfm_m: 1,
    };
  });

  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .insert(customerRows)
    .select('id');

  if (custErr) {
    console.error('❌ Customer insert failed:', custErr.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${customers!.length} customers\n`);
  const customerIds = customers!.map((c) => c.id);

  // ── 2. Generate 2000 orders ────────────────────────────────────────────────
  console.log('🛍️ Generating 2000 orders...');

  // Distribution: some customers are heavy buyers, most are light
  // 50 customers → 10-20 orders each (heavy)
  // 150 customers → 4-9 orders each (medium)
  // 300 customers → 1-3 orders each (light)
  const orderRows: Array<{
    customer_id: string;
    order_date: string;
    amount: number;
    items: object;
    channel: 'online' | 'offline';
  }> = [];

  const heavyBuyers = customerIds.slice(0, 50);
  const mediumBuyers = customerIds.slice(50, 200);
  const lightBuyers = customerIds.slice(200);

  const addOrders = (custId: string, count: number, recencyDays: number) => {
    for (let i = 0; i < count; i++) {
      const itemCount = rand(1, 3);
      const items = Array.from({ length: itemCount }, () => {
        const item = pick(MENU_ITEMS);
        return { name: item.name, price: item.price, qty: rand(1, 2) };
      });
      const amount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      orderRows.push({
        customer_id: custId,
        order_date: isoDate(randDate(recencyDays)),
        amount,
        items,
        channel: Math.random() > 0.4 ? 'online' : 'offline',
      });
    }
  };

  // Heavy buyers: recent activity
  heavyBuyers.forEach((id) => addOrders(id, rand(10, 20), 30));
  // Medium buyers: mixed recency
  mediumBuyers.forEach((id) => addOrders(id, rand(4, 9), 90));
  // Light buyers: older purchases
  lightBuyers.forEach((id) => addOrders(id, rand(1, 3), 180));

  // Insert in batches of 200
  const BATCH = 200;
  for (let i = 0; i < orderRows.length; i += BATCH) {
    const batch = orderRows.slice(i, i + BATCH);
    const { error } = await supabase.from('orders').insert(batch);
    if (error) {
      console.error(`❌ Order batch ${i / BATCH + 1} failed:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  Inserted orders batch ${Math.ceil((i + 1) / BATCH)}/${Math.ceil(orderRows.length / BATCH)}\r`);
  }
  console.log(`\n✅ Inserted ${orderRows.length} orders\n`);

  // ── 3. Compute aggregates + RFM per customer ───────────────────────────────
  console.log('📊 Computing RFM scores...');

  // Group orders by customer
  const customerStats = new Map<string, { totalSpent: number; orderCount: number; lastDate: Date | null }>();
  for (const row of orderRows) {
    const existing = customerStats.get(row.customer_id) ?? {
      totalSpent: 0, orderCount: 0, lastDate: null,
    };
    existing.totalSpent += row.amount;
    existing.orderCount += 1;
    const d = new Date(row.order_date);
    if (!existing.lastDate || d > existing.lastDate) existing.lastDate = d;
    customerStats.set(row.customer_id, existing);
  }

  // Update each customer
  let updated = 0;
  for (const [custId, stats] of customerStats) {
    const rfm = computeRFM(stats.lastDate, stats.orderCount, stats.totalSpent);
    const { error } = await supabase
      .from('customers')
      .update({
        total_spent: Math.round(stats.totalSpent),
        order_count: stats.orderCount,
        last_order_date: stats.lastDate?.toISOString().split('T')[0] ?? null,
        ...rfm,
      })
      .eq('id', custId);

    if (error) console.warn(`⚠️ Update failed for ${custId}:`, error.message);
    updated++;
    if (updated % 100 === 0) process.stdout.write(`  Updated ${updated}/500 customers\r`);
  }

  console.log('\n✅ RFM scores computed\n');

  // ── 4. Print summary ───────────────────────────────────────────────────────
  const { data: summary } = await supabase
    .from('customers')
    .select('tier, rfm_r, rfm_f, rfm_m, total_spent')
    .order('total_spent', { ascending: false })
    .limit(5);

  console.log('🏆 Top 5 customers by spend:');
  summary?.forEach((c) =>
    console.log(`  ${c.tier.toUpperCase()} | ₹${c.total_spent} | RFM: ${c.rfm_r}/${c.rfm_f}/${c.rfm_m}`)
  );

  const { count: goldCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'gold');

  const { count: silverCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'silver');

  console.log(`\n📈 Tier distribution:`);
  console.log(`  Gold:   ${goldCount}`);
  console.log(`  Silver: ${silverCount}`);
  console.log(`  Bronze: ${500 - (goldCount ?? 0) - (silverCount ?? 0)}`);
  console.log('\n🎉 Seed complete! Brewhaus is ready to run campaigns.\n');
}

seed().catch((err) => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
