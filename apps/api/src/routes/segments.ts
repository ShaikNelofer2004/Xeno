import { Router } from 'express';
import { db } from '../db';
import type { SegmentFilter } from '../types';

export const segmentRoutes = Router();

/**
 * Resolve a segment filter into a list of customer IDs + count.
 * Supports: recency_days, min_spent, max_spent, tier, city, min_orders, max_orders
 */
export async function resolveSegment(filter: SegmentFilter = {}): Promise<{ ids: string[]; count: number }> {
  // If the filter is explicitly a manual list of IDs, we can just return them to avoid URL length limits.
  const filterKeys = Object.keys(filter);
  if ((filter as any).ids && Array.isArray((filter as any).ids) && filterKeys.length === 1) {
    const ids = (filter as any).ids;
    return { ids, count: ids.length };
  }

  let query = db.from('customers').select('id');

  if (filter.tier) query = query.eq('tier', filter.tier);
  if (filter.city) query = query.ilike('city', filter.city);
  if (filter.min_spent != null) query = query.gte('total_spent', filter.min_spent);
  if (filter.max_spent != null) query = query.lte('total_spent', filter.max_spent);
  if (filter.min_orders != null) query = query.gte('order_count', filter.min_orders);
  if (filter.max_orders != null) query = query.lte('order_count', filter.max_orders);

  if (filter.recency_days != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.recency_days);
    query = query.lt('last_order_date', cutoff.toISOString().split('T')[0]);
  }
  if ((filter as any).ids) {
    // Note: This may fail for very large arrays due to URL length limits.
    // Chunking or using a different strategy might be needed if complex filters combine with large ID lists.
    query = query.in('id', (filter as any).ids);
  }
  if ((filter as any).exclude_ids && (filter as any).exclude_ids.length > 0) {
    query = query.not('id', 'in', `(${(filter as any).exclude_ids.join(',')})`);
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  const ids = (data ?? []).map((r) => r.id);
  return { ids, count: ids.length };
}

// GET /api/segments
segmentRoutes.get('/', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('segments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/segments — create and persist a segment
segmentRoutes.post('/', async (req, res) => {
  try {
    const { name, description, filter_json, created_by = 'manual' } = req.body;

    const { count } = await resolveSegment(filter_json as SegmentFilter);

    const { data, error } = await db
      .from('segments')
      .insert({ name, description, filter_json, customer_count: count, created_by })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/segments/:id/customers — resolve segment to customer list
segmentRoutes.get('/:id/customers', async (req, res) => {
  try {
    const { data: segment, error: segErr } = await db
      .from('segments')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (segErr) throw segErr;

    const { ids } = await resolveSegment(segment.filter_json as SegmentFilter);

    let customers: any[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunkIds = ids.slice(i, i + 100);
      const { data: chunk, error } = await db
        .from('customers')
        .select('*')
        .in('id', chunkIds)
        .order('total_spent', { ascending: false });
      if (error) throw error;
      if (chunk) customers = customers.concat(chunk);
    }

    res.json({ segment, customers, count: customers?.length ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/segments/preview — preview filter without saving
segmentRoutes.post('/preview', async (req, res) => {
  try {
    const { filter_json } = req.body;
    const { ids, count } = await resolveSegment(filter_json as SegmentFilter);

    // Return all matched customers for preview (so the UI can display and allow unselecting)
    const { data: sample } = await db
      .from('customers')
      .select('id, name, email, tier, total_spent, last_order_date, city')
      .in('id', ids.slice(0, 1000)); // limit to 1000 for preview to prevent massive payloads

    res.json({ count, customers: sample || [] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/segments/:id — update a segment
segmentRoutes.patch('/:id', async (req, res) => {
  try {
    const { name, description, filter_json } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    
    if (filter_json !== undefined) {
      updates.filter_json = filter_json;
      // Recalculate member count
      const { count } = await resolveSegment(filter_json as SegmentFilter);
      updates.customer_count = count;
    }

    const { data, error } = await db
      .from('segments')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/segments/:id — delete a segment
segmentRoutes.delete('/:id', async (req, res) => {
  try {
    // Check if segment is in use by any non-deleted campaigns
    const { data: camps, error: campErr } = await db
      .from('campaigns')
      .select('id, name')
      .eq('segment_id', req.params.id)
      .limit(1);
    
    if (campErr) throw campErr;
    if (camps && camps.length > 0) {
      return res.status(400).json({ error: `Cannot delete segment. It is currently used by the campaign "${camps[0].name}". Delete the campaign first.` });
    }

    const { error } = await db.from('segments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Segment deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
