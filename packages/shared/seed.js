/**
 * XenoCRM Seed Script (CommonJS — no build needed)
 * Run: node packages/shared/seed.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ─── Static data pools ────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Aditi','Aisha','Akash','Amit','Ananya','Arjun','Arnav',
  'Deepika','Dev','Divya','Farhan','Gauri','Isha','Ishaan','Kabir',
  'Karan','Kavya','Kriti','Lakshmi','Manish','Maya','Meera','Mihir',
  'Mohan','Naina','Neha','Nikhil','Nina','Pallavi','Pooja','Priya',
  'Rahul','Raj','Riya','Rohan','Sanya','Sara','Shaan','Shruti',
  'Simran','Sneha','Sonia','Suresh','Tanvi','Tara','Uday','Varun',
  'Vidya','Vikram','Vivek','Yash','Zara','Zubin',
];
const LAST_NAMES = [
  'Agarwal','Bhat','Chakraborty','Chopra','Das','Desai','Doshi',
  'Gandhi','Ghosh','Gupta','Iyer','Jain','Joshi','Kapoor','Kaur',
  'Khan','Kumar','Malhotra','Mehta','Mishra','Nair','Nayak','Patel',
  'Pillai','Rao','Reddy','Shah','Sharma','Shukla','Singh','Sinha',
  'Srinivasan','Trivedi','Verma',
];
const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Surat'];
const MENU_ITEMS = [
  { name: 'Signature Cold Brew',   price: 280 },
  { name: 'Flat White',            price: 220 },
  { name: 'Cappuccino',            price: 190 },
  { name: 'Nitro Coffee',          price: 320 },
  { name: 'Caramel Latte',         price: 250 },
  { name: 'Espresso Shot',         price: 120 },
  { name: 'Matcha Latte',          price: 290 },
  { name: 'Croissant',             price: 160 },
  { name: 'Avocado Toast',         price: 340 },
  { name: 'Blueberry Muffin',      price: 130 },
  { name: 'Coffee Beans (250g)',   price: 580 },
  { name: 'Brewhaus Tumbler',      price: 890 },
  { name: 'Cold Brew Kit',         price: 1200 },
];

const rand    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const randDate = days => { const d = new Date(); d.setDate(d.getDate() - rand(0, days)); return d.toISOString(); };

function genPhone() {
  const prefix = pick(['98','97','96','95','90','88','87','86','70']);
  const rest   = Array.from({length:8}, () => rand(0,9)).join('');
  return `+91${prefix}${rest}`;
}

function genEmail(name, idx) {
  const clean = name.toLowerCase().replace(/\s+/g,'.');
  return `${clean}.${idx}@${pick(['gmail.com','yahoo.com','outlook.com'])}`;
}

function computeRFM(lastDate, orderCount, totalSpent) {
  const daysSince = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
    : 999;

  const rfm_r = daysSince<=14 ? 5 : daysSince<=30 ? 4 : daysSince<=60 ? 3 : daysSince<=90 ? 2 : 1;
  const rfm_f = orderCount>=20 ? 5 : orderCount>=12 ? 4 : orderCount>=6 ? 3 : orderCount>=2 ? 2 : 1;
  const rfm_m = totalSpent>=15000 ? 5 : totalSpent>=8000 ? 4 : totalSpent>=4000 ? 3 : totalSpent>=1500 ? 2 : 1;
  const total = rfm_r + rfm_f + rfm_m;
  const tier  = total>=12 ? 'gold' : total>=8 ? 'silver' : 'bronze';
  return { rfm_r, rfm_f, rfm_m, tier };
}

async function seed() {
  console.log('\n🌱 XenoCRM Seed — Brewhaus Coffee\n');

  // ── 1. Generate 500 customers ──────────────────────────────────────────────
  console.log('👥 Inserting 500 customers...');
  const customerRows = Array.from({length:500}, (_,i) => {
    const fn = pick(FIRST_NAMES), ln = pick(LAST_NAMES);
    const name = `${fn} ${ln}`;
    return {
      name,
      email: genEmail(name, i+1),
      phone: genPhone(),
      city:  pick(CITIES),
      tier:  'bronze',
      total_spent: 0, order_count: 0,
      rfm_r: 1, rfm_f: 1, rfm_m: 1,
    };
  });

  // Insert in batches of 100
  let customerIds = [];
  for (let i = 0; i < customerRows.length; i += 100) {
    const batch = customerRows.slice(i, i+100);
    const { data, error } = await supabase.from('customers').insert(batch).select('id');
    if (error) { console.error('Customer insert error:', error.message); process.exit(1); }
    customerIds = customerIds.concat(data.map(c => c.id));
    process.stdout.write(`  ${customerIds.length}/500 customers\r`);
  }
  console.log(`✅ Inserted ${customerIds.length} customers\n`);

  // ── 2. Generate orders ─────────────────────────────────────────────────────
  console.log('🛍️ Inserting orders...');

  // Distribution: heavy/medium/light buyers
  const heavy  = customerIds.slice(0, 50);   // 10-20 orders, recent
  const medium = customerIds.slice(50, 200); // 4-9 orders, mixed
  const light  = customerIds.slice(200);     // 1-3 orders, older

  const orderRows = [];

  const addOrders = (ids, countRange, recencyDays) => {
    for (const custId of ids) {
      const n = rand(countRange[0], countRange[1]);
      for (let i = 0; i < n; i++) {
        const itemCount = rand(1, 3);
        const items = Array.from({length:itemCount}, () => {
          const item = pick(MENU_ITEMS);
          return { name: item.name, price: item.price, qty: rand(1,2) };
        });
        const amount = items.reduce((s,it) => s + it.price * it.qty, 0);
        orderRows.push({
          customer_id: custId,
          order_date:  randDate(recencyDays),
          amount,
          items,
          channel: Math.random() > 0.4 ? 'online' : 'offline',
        });
      }
    }
  };

  addOrders(heavy,  [10,20], 30);
  addOrders(medium, [4,9],   90);
  addOrders(light,  [1,3],   180);

  // Insert orders in batches of 200
  let inserted = 0;
  for (let i = 0; i < orderRows.length; i += 200) {
    const batch = orderRows.slice(i, i+200);
    const { error } = await supabase.from('orders').insert(batch);
    if (error) { console.error('Order insert error:', error.message); process.exit(1); }
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${orderRows.length} orders\r`);
  }
  console.log(`✅ Inserted ${inserted} orders\n`);

  // ── 3. Compute RFM and update customers ────────────────────────────────────
  console.log('📊 Computing RFM scores...');

  // Group orders by customer
  const stats = {};
  for (const row of orderRows) {
    if (!stats[row.customer_id]) stats[row.customer_id] = { totalSpent:0, count:0, lastDate:null };
    stats[row.customer_id].totalSpent += row.amount;
    stats[row.customer_id].count++;
    const d = new Date(row.order_date);
    if (!stats[row.customer_id].lastDate || d > new Date(stats[row.customer_id].lastDate)) {
      stats[row.customer_id].lastDate = row.order_date;
    }
  }

  let updated = 0;
  for (const [custId, s] of Object.entries(stats)) {
    const rfm = computeRFM(s.lastDate, s.count, s.totalSpent);
    const { error } = await supabase.from('customers').update({
      total_spent:     Math.round(s.totalSpent),
      order_count:     s.count,
      last_order_date: s.lastDate ? new Date(s.lastDate).toISOString().split('T')[0] : null,
      ...rfm,
    }).eq('id', custId);
    if (error) console.warn(`Update failed for ${custId}:`, error.message);
    updated++;
    if (updated % 100 === 0) process.stdout.write(`  Updated ${updated} customers\r`);
  }
  console.log(`✅ RFM scores computed for ${updated} customers\n`);

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  const { count: gold }   = await supabase.from('customers').select('*',{count:'exact',head:true}).eq('tier','gold');
  const { count: silver } = await supabase.from('customers').select('*',{count:'exact',head:true}).eq('tier','silver');
  const { count: bronze } = await supabase.from('customers').select('*',{count:'exact',head:true}).eq('tier','bronze');

  console.log('🏆 Tier distribution:');
  console.log(`  🥇 Gold:   ${gold}`);
  console.log(`  🥈 Silver: ${silver}`);
  console.log(`  🥉 Bronze: ${bronze}`);
  console.log(`\n🎉 Seed complete! Brewhaus has ${customerIds.length} shoppers ready.\n`);
}

seed().catch(err => { console.error('💥 Seed failed:', err); process.exit(1); });
