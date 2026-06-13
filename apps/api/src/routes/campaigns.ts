import { Router } from 'express';
import { db } from '../db';
import { resolveSegment } from './segments';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import type { Channel, SegmentFilter, StubSendPayload } from '../types';

export const campaignRoutes = Router();

// GET /api/campaigns
campaignRoutes.get('/', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('campaigns')
      .select('*, segments(name, description)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id
campaignRoutes.get('/:id', async (req, res) => {
  try {
    const { data, error } = await db
      .from('campaigns')
      .select('*, segments(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/stats — delivery funnel aggregation
campaignRoutes.get('/:id/stats', async (req, res) => {
  try {
    const { data: comms, error } = await db
      .from('communications')
      .select('status, order_placed, order_value')
      .eq('campaign_id', req.params.id);
    if (error) throw error;

    const total = comms?.length ?? 0;
    const counts = {
      queued: 0, sent: 0, delivered: 0, failed: 0,
      opened: 0, read: 0, clicked: 0,
    };

    let orders_placed = 0;
    let revenue_attributed = 0;

    for (const c of comms ?? []) {
      if (c.status in counts) counts[c.status as keyof typeof counts]++;
      if (c.order_placed) {
        orders_placed++;
        revenue_attributed += c.order_value ?? 0;
      }
    }

    const delivered = counts.delivered + counts.opened + counts.read + counts.clicked;
    const opened_total = counts.opened + counts.read + counts.clicked;
    const read_total = counts.read + counts.clicked;
    const sent_total = counts.sent + delivered;

    res.json({
      campaign_id: req.params.id,
      total,
      ...counts,
      sent_total,
      delivered_total: delivered,
      opened_total,
      read_total,
      clicked_total: counts.clicked,
      delivery_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      open_rate: delivered > 0 ? Math.round((opened_total / delivered) * 100) : 0,
      click_rate: delivered > 0 ? Math.round((counts.clicked / delivered) * 100) : 0,
      orders_placed,
      revenue_attributed: Math.round(revenue_attributed),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/communications — per-customer status table
campaignRoutes.get('/:id/communications', async (req, res) => {
  try {
    const { data, error } = await db
      .from('communications')
      .select('*, customers(name, email, phone, tier)')
      .eq('campaign_id', req.params.id)
      .order('queued_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns — create a campaign
campaignRoutes.post('/', async (req, res) => {
  try {
    const { name, segment_id, channel, message_template, agent_run_id } = req.body;

    const { data, error } = await db
      .from('campaigns')
      .insert({ name, segment_id, channel, message_template, agent_run_id })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/send — launch campaign → calls channel stub
campaignRoutes.post('/:id/send', async (req, res) => {
  try {
    const { data: campaign, error: campErr } = await db
      .from('campaigns')
      .select('*, segments(*)')
      .eq('id', req.params.id)
      .single();
    if (campErr) throw campErr;
    if (campaign.status === 'launched') {
      return res.status(400).json({ error: 'Campaign already launched' });
    }

    // Determine customer IDs — manual override or segment resolution
    const bodyCustomerIds: string[] | undefined = req.body?.customer_ids;
    let ids: string[];

    if (bodyCustomerIds && bodyCustomerIds.length > 0) {
      // Manual customer selection
      ids = bodyCustomerIds;
    } else if (campaign.segments?.filter_json) {
      // Segment-based resolution
      const filter = campaign.segments.filter_json as SegmentFilter;
      const resolved = await resolveSegment(filter);
      ids = resolved.ids;
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No customers match this segment' });
      }
    } else {
      return res.status(400).json({ error: 'This campaign has no audience configured (likely an old draft). Please edit it and select an audience before launching.' });
    }

    // Fetch customer contact details in chunks to avoid URL length limits
    let customers: any[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunkIds = ids.slice(i, i + 100);
      const { data: chunk, error: custErr } = await db
        .from('customers')
        .select('id, name, email, phone, tier, total_spent')
        .in('id', chunkIds);
      if (custErr) throw custErr;
      if (chunk) customers = customers.concat(chunk);
    }

    // Personalise message and create communication rows
    const commsToInsert = customers!.map((c) => ({
      campaign_id: campaign.id,
      customer_id: c.id,
      stub_message_id: uuidv4(),
      channel: campaign.channel as Channel,
      message: campaign.message_template
        .replace(/\{name\}/g, c.name.split(' ')[0])
        .replace(/\{tier\}/g, c.tier)
        .replace(/\{total_spent\}/g, `₹${c.total_spent ?? 0}`),
      status: 'queued',
    }));

    const { error: commErr } = await db.from('communications').insert(commsToInsert);
    if (commErr) throw commErr;

    // Update campaign status
    await db.from('campaigns').update({
      status: 'launched',
      launched_at: new Date().toISOString(),
      total_recipients: ids.length,
    }).eq('id', campaign.id);

    // Build stub payload
    const stubPayload: StubSendPayload = {
      campaign_id: campaign.id,
      crm_receipt_url: process.env.CRM_RECEIPT_URL || 'http://localhost:3001/api/receipt',
      channel: campaign.channel as Channel,
      recipients: commsToInsert.map((c, i) => ({
        stub_message_id: c.stub_message_id,
        customer_id: c.customer_id,
        contact: campaign.channel === 'email'
          ? customers![i].email
          : customers![i].phone,
        message: c.message,
      })),
    };

    // Fire and forget to stub — do NOT await (async callback loop)
    const stubUrl = process.env.STUB_URL || 'http://localhost:4000';
    fetch(`${stubUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stubPayload),
    }).catch((err) => console.error('Stub call failed:', err.message));

    res.json({
      message: 'Campaign launched',
      campaign_id: campaign.id,
      recipients: ids.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/campaigns/:id — update a draft campaign
campaignRoutes.patch('/:id', async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await db
      .from('campaigns').select('status').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be edited' });
    }
    const { name, segment_id, channel, message_template } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (segment_id !== undefined) updates.segment_id = segment_id;
    if (channel !== undefined) updates.channel = channel;
    if (message_template !== undefined) updates.message_template = message_template;

    const { data, error } = await db
      .from('campaigns').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id — delete any campaign (and its communications)
campaignRoutes.delete('/:id', async (req, res) => {
  try {
    // Delete communications first to avoid foreign key constraints (if cascade is not set)
    await db.from('communications').delete().eq('campaign_id', req.params.id);
    
    // Delete campaign
    const { error } = await db.from('campaigns').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Campaign deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
