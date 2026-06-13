import { Router } from 'express';
import { db } from '../db';

export const customerRoutes = Router();

// GET /api/customers/cities — get unique cities
customerRoutes.get('/cities', async (_req, res) => {
  try {
    const { data, error } = await db.from('customers').select('city');
    if (error) throw error;
    
    // Extract unique non-null cities
    const cities = [...new Set(data.map(d => d.city).filter(c => c && c.trim() !== ''))].sort();
    res.json(cities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers — list with optional filters
customerRoutes.get('/', async (req, res) => {
  try {
    const { tier, city, min_spent, max_spent, search, limit = '50', offset = '0' } = req.query;

    let query = db
      .from('customers')
      .select('*', { count: 'exact' })
      .order('total_spent', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (tier) query = query.eq('tier', tier as string);
    if (city) query = query.eq('city', city as string);
    if (min_spent) query = query.gte('total_spent', Number(min_spent));
    if (max_spent) query = query.lte('total_spent', Number(max_spent));
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, count, limit: Number(limit), offset: Number(offset) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/stats — dashboard summary
customerRoutes.get('/stats', async (_req, res) => {
  try {
    const { count: total } = await db
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: gold } = await db
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'gold');

    const { count: silver } = await db
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'silver');

    // Lapsed: no order in 60+ days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const { count: lapsed } = await db
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .lt('last_order_date', sixtyDaysAgo.toISOString().split('T')[0]);

    // Total revenue
    const { data: revenueData } = await db
      .from('customers')
      .select('total_spent');
    const totalRevenue = revenueData?.reduce((s, c) => s + (c.total_spent || 0), 0) ?? 0;

    res.json({
      total,
      gold,
      silver,
      bronze: (total ?? 0) - (gold ?? 0) - (silver ?? 0),
      lapsed,
      total_revenue: totalRevenue,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
customerRoutes.get('/:id', async (req, res) => {
  try {
    const { data, error } = await db
      .from('customers')
      .select('*, orders(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/customers/ingest — bulk insert customers + optional orders
customerRoutes.post('/ingest', async (req, res) => {
  try {
    const { customers, orders } = req.body as {
      customers: Array<Record<string, unknown>>;
      orders?: Array<Record<string, unknown>>;
    };

    const { data: inserted, error } = await db
      .from('customers')
      .upsert(customers, { onConflict: 'email' })
      .select('id');
    if (error) throw error;

    if (orders && orders.length > 0) {
      const { error: orderErr } = await db.from('orders').insert(orders);
      if (orderErr) throw orderErr;
    }

    res.json({ inserted: inserted?.length ?? 0, message: 'Ingest successful' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/customers/rfm/scatter — RFM scatter plot data
customerRoutes.get('/rfm/scatter', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('customers')
      .select('id, name, tier, rfm_r, rfm_f, rfm_m, total_spent, last_order_date')
      .limit(500);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
