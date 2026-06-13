import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { resolveSegment } from '../routes/segments';
import fetch from 'node-fetch';
import type { AgentStep, Channel, SegmentFilter } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Tool definitions for Gemini function calling ─────────────────────────────
const toolDeclarations = {
  functionDeclarations: [
    {
      name: 'segment_customers',
      description: 'Query and segment customers from the database based on RFM and behavioural filters. Returns segment ID and customer count.',
      parameters: {
        type: 'object',
        properties: {
          name:          { type: 'string', description: 'Human-readable segment name' },
          description:   { type: 'string', description: 'What this segment represents' },
          recency_days:  { type: 'number', description: 'Include customers who have NOT ordered in this many days' },
          min_spent:     { type: 'number', description: 'Minimum lifetime spend in INR' },
          max_spent:     { type: 'number', description: 'Maximum lifetime spend in INR' },
          tier:          { type: 'string', description: 'Customer tier: bronze, silver, or gold' },
          city:          { type: 'string', description: 'Filter by city name' },
          min_orders:    { type: 'number', description: 'Minimum number of orders' },
        },
        required: ['name', 'description'],
      },
    },
    {
      name: 'draft_message',
      description: 'Generate a personalised campaign message for the given goal and channel.',
      parameters: {
        type: 'object',
        properties: {
          goal:    { type: 'string', description: 'The campaign objective' },
          channel: { type: 'string', description: 'Channel: whatsapp, sms, email, or rcs' },
          tone:    { type: 'string', description: 'Tone: friendly, urgent, exclusive, or celebratory' },
          offer:   { type: 'string', description: 'Optional discount or CTA to include' },
        },
        required: ['goal', 'channel'],
      },
    },
    {
      name: 'launch_campaign',
      description: 'Create and launch a campaign to the given segment.',
      parameters: {
        type: 'object',
        properties: {
          campaign_name:    { type: 'string', description: 'Human-readable campaign name' },
          segment_id:       { type: 'string', description: 'ID of the segment to target' },
          channel:          { type: 'string', description: 'Channel: whatsapp, sms, email, or rcs' },
          message_template: { type: 'string', description: 'Message to send. Use {name} for first name, {tier} for tier.' },
        },
        required: ['campaign_name', 'segment_id', 'channel', 'message_template'],
      },
    },
    {
      name: 'get_campaign_stats',
      description: 'Fetch current delivery and engagement statistics for a campaign.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string', description: 'ID of the campaign' },
        },
        required: ['campaign_id'],
      },
    },
    {
      name: 'get_customer_insights',
      description: 'Get a summary of customer base health.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric: churn_risk, top_spenders, lapsed, new_customers, or all' },
        },
        required: ['metric'],
      },
    },
    {
      name: 'suggest_retry',
      description: 'Find failed communications from a campaign and create retry segment.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id:   { type: 'string', description: 'Original campaign ID' },
          retry_channel: { type: 'string', description: 'Channel to retry on' },
        },
        required: ['campaign_id', 'retry_channel'],
      },
    },
    {
      name: 'list_campaigns',
      description: 'List past campaigns with real UUIDs, names, channels, status, and launch dates. Supports optional date filtering. ALWAYS call this before compare_campaigns.',
      parameters: {
        type: 'object',
        properties: {
          limit:     { type: 'number', description: 'Max campaigns to return (default 20)' },
          date_from: { type: 'string', description: 'Filter campaigns launched on or after this ISO date string, e.g. "2026-06-10" for yesterday' },
          date_to:   { type: 'string', description: 'Filter campaigns launched on or before this ISO date string' },
        },
        required: [],
      },
    },
    {
      name: 'compare_campaigns',
      description: 'Compare 2 or more campaigns side-by-side on delivery rate, open rate, click rate, revenue, and orders. Pass ALL campaign IDs you want compared — not just two. Returns per-metric winners and an overall winner.',
      parameters: {
        type: 'object',
        properties: {
          campaign_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of campaign UUIDs to compare. Include ALL campaigns you want in the comparison — can be 2, 3, 4 or more.',
          },
        },
        required: ['campaign_ids'],
      },
    },
    {
      name: 'revenue_report',
      description: 'Generate a full revenue report across all campaigns. Breaks down total revenue by channel (email, sms, whatsapp, rcs) and by customer tier (gold, silver, bronze). Lists the top 5 highest-revenue campaigns.',
      parameters: {
        type: 'object',
        properties: {
          period_days: { type: 'number', description: 'How many past days to include. Use 30 for last month, 90 for quarter, 365 for year, or 0 for all time.' },
        },
        required: [],
      },
    },
  ],
};

// ─── Tool executors ───────────────────────────────────────────────────────────

async function execSegmentCustomers(args: Record<string, any>, agentRunId: string) {
  const { name, description, recency_days, min_spent, max_spent, tier, city, min_orders } = args;
  const filter: SegmentFilter = {};
  if (recency_days) filter.recency_days = recency_days;
  if (min_spent)    filter.min_spent    = min_spent;
  if (max_spent)    filter.max_spent    = max_spent;
  if (tier)         filter.tier         = tier;
  if (city)         filter.city         = city;
  if (min_orders)   filter.min_orders   = min_orders;

  const { ids, count } = await resolveSegment(filter);
  if (count === 0) return { error: 'No customers match these filters. Try relaxing the criteria.' };

  const { data: segment, error } = await db
    .from('segments')
    .insert({ name, description, filter_json: filter, customer_count: count, created_by: 'agent' })
    .select()
    .single();

  if (error) throw error;
  return { segment_id: segment.id, name: segment.name, customer_count: count };
}

async function execDraftMessage(args: Record<string, any>) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  const prompt = `You are a marketing copywriter for Brewhaus, a premium specialty coffee brand in India.
Write a short, personalised ${args.channel} message for: "${args.goal}".
Tone: ${args.tone || 'friendly'}. ${args.offer ? `Include offer: ${args.offer}` : ''}
Rules:
- WhatsApp/RCS: max 300 chars, emoji-friendly
- SMS: max 160 chars, no emoji  
- Email: max 500 chars, slightly formal
- Use {name} for customer first name, {tier} for tier
- Be specific to a coffee brand, end with a clear CTA
Return ONLY the message text.`;

  const result = await model.generateContent(prompt);
  return { message_template: result.response.text().trim() };
}

async function execLaunchCampaign(args: Record<string, any>, agentRunId: string) {
  const { data: campaign, error: campErr } = await db
    .from('campaigns')
    .insert({
      name: args.campaign_name,
      segment_id: args.segment_id,
      channel: args.channel,
      message_template: args.message_template,
      agent_run_id: agentRunId,
    })
    .select()
    .single();

  if (campErr) throw campErr;

  const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/campaigns/${campaign.id}/send`, { method: 'POST' });
  const result = await response.json() as any;
  if (!response.ok) throw new Error(result.error || 'Send failed');

  await db.from('agent_runs').update({ campaign_id: campaign.id }).eq('id', agentRunId);

  return { campaign_id: campaign.id, campaign_name: args.campaign_name, recipients: result.recipients, channel: args.channel };
}

async function execGetCampaignStats(args: Record<string, any>) {
  const { data: comms } = await db
    .from('communications')
    .select('status, order_placed, order_value')
    .eq('campaign_id', args.campaign_id);

  const total = comms?.length ?? 0;
  const counts: Record<string, number> = { sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0 };
  let revenue = 0;
  for (const c of comms ?? []) {
    if (c.status in counts) counts[c.status]++;
    if (c.order_placed) revenue += c.order_value ?? 0;
  }
  const delivered = counts.delivered + counts.opened + counts.read + counts.clicked;
  return {
    total,
    delivered,
    failed: counts.failed,
    engaged: counts.opened + counts.read,
    clicked: counts.clicked,
    delivery_rate: total > 0 ? `${Math.round((delivered / total) * 100)}%` : '0%',
    revenue_attributed: `₹${Math.round(revenue)}`,
  };
}

async function execGetCustomerInsights(args: Record<string, any>) {
  const results: Record<string, any> = {};
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { count: lapsed } = await db.from('customers').select('*', { count: 'exact', head: true })
    .lt('last_order_date', sixtyDaysAgo.toISOString().split('T')[0]);
  results.lapsed_customers = lapsed;

  if (args.metric === 'top_spenders' || args.metric === 'all') {
    const { data } = await db.from('customers').select('name, total_spent, tier')
      .order('total_spent', { ascending: false }).limit(5);
    results.top_spenders = data;
  }

  const { count: total } = await db.from('customers').select('*', { count: 'exact', head: true });
  const { count: gold }  = await db.from('customers').select('*', { count: 'exact', head: true }).eq('tier', 'gold');
  results.total_customers = total;
  results.gold_tier = gold;
  return results;
}

async function execSuggestRetry(args: Record<string, any>) {
  const { data: failedComms } = await db
    .from('communications')
    .select('customer_id')
    .eq('campaign_id', args.campaign_id)
    .eq('status', 'failed');

  if (!failedComms || failedComms.length === 0) {
    return { message: 'No failed communications. No retry needed.' };
  }

  const { data: segment } = await db.from('segments').insert({
    name: `Retry Segment (${failedComms.length} customers)`,
    description: `Retry for failed comms from campaign ${args.campaign_id}`,
    filter_json: {},
    customer_count: failedComms.length,
    created_by: 'agent',
  }).select().single();

  return {
    retry_segment_id: segment?.id,
    failed_count: failedComms.length,
    retry_channel: args.retry_channel,
    message: `Found ${failedComms.length} failed deliveries. Retry segment created on ${args.retry_channel}.`,
  };
}

// ─── NEW: list_campaigns ─────────────────────────────────────────────────────
async function execListCampaigns(args: Record<string, any>) {
  const limit = args.limit ?? 20;
  let query = db
    .from('campaigns')
    .select('id, name, channel, status, launched_at, total_recipients')
    .order('launched_at', { ascending: false })
    .limit(limit);

  if (args.date_from) query = query.gte('launched_at', args.date_from);
  if (args.date_to)   query = query.lte('launched_at', args.date_to + 'T23:59:59Z');

  const { data: campaigns, error } = await query;
  if (error) throw error;

  return {
    count: campaigns?.length ?? 0,
    campaigns: (campaigns ?? []).map(c => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      recipients: c.total_recipients,
      launched_at: c.launched_at
        ? new Date(c.launched_at).toISOString().split('T')[0]
        : 'Not launched',
    })),
  };
}

// ─── NEW: compare_campaigns (supports N campaigns) ────────────────────────────
async function execCompareCampaigns(args: Record<string, any>) {
  // Accept either campaign_ids[] (new) or campaign_id_a/b (legacy)
  let ids: string[] = [];
  if (Array.isArray(args.campaign_ids) && args.campaign_ids.length > 0) {
    ids = args.campaign_ids;
  } else if (args.campaign_id_a && args.campaign_id_b) {
    ids = [args.campaign_id_a, args.campaign_id_b];
  } else {
    return { error: 'Provide campaign_ids array with at least 2 IDs.' };
  }

  if (ids.length < 2) return { error: 'Need at least 2 campaign IDs to compare.' };

  const fetchStats = async (campaignId: string) => {
    const [{ data: camp }, { data: comms }] = await Promise.all([
      db.from('campaigns').select('name, channel, launched_at').eq('id', campaignId).single(),
      db.from('communications').select('status, order_placed, order_value').eq('campaign_id', campaignId),
    ]);
    const total = comms?.length ?? 0;
    const counts: Record<string, number> = { sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0 };
    let revenue = 0, orders = 0;
    for (const c of comms ?? []) {
      if (c.status in counts) counts[c.status]++;
      if (c.order_placed) { orders++; revenue += c.order_value ?? 0; }
    }
    const delivered = counts.delivered + counts.opened + counts.read + counts.clicked;
    const engaged   = counts.opened + counts.read + counts.clicked;
    return {
      id:                campaignId,
      name:              (camp as any)?.name ?? campaignId,
      channel:           (camp as any)?.channel ?? 'unknown',
      total_recipients:  total,
      delivery_rate_pct: total     > 0 ? Math.round((delivered / total)     * 100) : 0,
      open_rate_pct:     delivered > 0 ? Math.round((engaged   / delivered) * 100) : 0,
      click_rate_pct:    delivered > 0 ? Math.round((counts.clicked / delivered) * 100) : 0,
      orders,
      revenue:           Math.round(revenue),
      failed:            counts.failed,
    };
  };

  // Fetch all campaign stats in parallel
  const allStats = await Promise.all(ids.map(fetchStats));

  // Per-metric winner across all N campaigns
  const metricKeys = [
    { key: 'delivery_rate_pct' as const, label: 'Delivery Rate' },
    { key: 'open_rate_pct'     as const, label: 'Open Rate' },
    { key: 'click_rate_pct'    as const, label: 'Click Rate' },
    { key: 'revenue'           as const, label: 'Revenue' },
    { key: 'orders'            as const, label: 'Orders' },
  ];

  const winCounts: Record<string, number> = {};
  const metricWinners: Record<string, string> = {};
  allStats.forEach(s => { winCounts[s.name] = 0; });

  for (const { key, label } of metricKeys) {
    const best = allStats.reduce((a, b) => (a[key] >= b[key] ? a : b));
    const tied = allStats.filter(s => s[key] === best[key]);
    metricWinners[label] = tied.length > 1 ? 'Tie' : best.name;
    if (tied.length === 1) winCounts[best.name] = (winCounts[best.name] ?? 0) + 1;
  }

  const overallWinner = Object.entries(winCounts).sort((a, b) => b[1] - a[1])[0];
  const winner = overallWinner[1] > 0 ? overallWinner[0] : 'Tie';

  return {
    campaigns_compared: allStats.length,
    all_stats: allStats,
    metric_winners: metricWinners,
    overall_winner: winner,
    win_counts: winCounts,
    recommendation: winner === 'Tie'
      ? 'Campaigns performed similarly. Consider testing on larger audiences.'
      : `"${winner}" is the top performer. Replicate its channel (${allStats.find(s => s.name === winner)?.channel}) and messaging strategy for future campaigns.`,
  };
}

// ─── NEW: revenue_report ──────────────────────────────────────────────────────
async function execRevenueReport(args: Record<string, any>) {
  const periodDays = args.period_days ?? 0;

  // Build optional date filter
  let dateFilter: string | null = null;
  if (periodDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    dateFilter = cutoff.toISOString();
  }

  // Fetch all communications with order data + campaign + customer info
  let query = db
    .from('communications')
    .select('order_placed, order_value, channel, customers(tier), campaigns(name, channel, launched_at)')
    .eq('order_placed', true);

  if (dateFilter) {
    query = query.gte('clicked_at', dateFilter);
  }

  const { data: orders } = await query;

  // Aggregate by channel
  const byChannel: Record<string, { orders: number; revenue: number }> = {};
  const byTier:    Record<string, { orders: number; revenue: number }> = {};
  const byCampaign: Record<string, { name: string; orders: number; revenue: number }> = {};

  let totalRevenue = 0;
  let totalOrders  = 0;

  for (const o of orders ?? []) {
    const val = o.order_value ?? 0;
    const ch  = (o as any).campaigns?.channel ?? o.channel ?? 'unknown';
    const tier = (o as any).customers?.tier ?? 'unknown';
    const campName = (o as any).campaigns?.name ?? 'Unknown Campaign';

    totalRevenue += val;
    totalOrders  += 1;

    // By channel
    if (!byChannel[ch]) byChannel[ch] = { orders: 0, revenue: 0 };
    byChannel[ch].orders++;
    byChannel[ch].revenue += val;

    // By tier
    if (!byTier[tier]) byTier[tier] = { orders: 0, revenue: 0 };
    byTier[tier].orders++;
    byTier[tier].revenue += val;

    // By campaign
    if (!byCampaign[campName]) byCampaign[campName] = { name: campName, orders: 0, revenue: 0 };
    byCampaign[campName].orders++;
    byCampaign[campName].revenue += val;
  }

  // Top 5 campaigns by revenue
  const topCampaigns = Object.values(byCampaign)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(c => ({ ...c, revenue: Math.round(c.revenue) }));

  // Best channel
  const bestChannel = Object.entries(byChannel)
    .sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0] ?? 'N/A';

  // Best tier
  const bestTier = Object.entries(byTier)
    .sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0] ?? 'N/A';

  return {
    period: periodDays > 0 ? `Last ${periodDays} days` : 'All time',
    total_revenue: `₹${Math.round(totalRevenue).toLocaleString()}`,
    total_orders: totalOrders,
    avg_order_value: totalOrders > 0 ? `₹${Math.round(totalRevenue / totalOrders)}` : '₹0',
    revenue_by_channel: Object.fromEntries(
      Object.entries(byChannel).map(([k, v]) => [k, { orders: v.orders, revenue: `₹${Math.round(v.revenue)}` }])
    ),
    revenue_by_tier: Object.fromEntries(
      Object.entries(byTier).map(([k, v]) => [k, { orders: v.orders, revenue: `₹${Math.round(v.revenue)}` }])
    ),
    top_campaigns: topCampaigns,
    best_channel: bestChannel,
    best_tier: bestTier,
    recommendation: `Focus future campaigns on the ${bestChannel} channel targeting ${bestTier} tier customers for maximum ROI.`,
  };
}

// ─── Step persistence ─────────────────────────────────────────────────────────

async function appendStep(runId: string, step: AgentStep) {
  const { data: run } = await db.from('agent_runs').select('steps').eq('id', runId).single();
  const steps = ((run?.steps ?? []) as AgentStep[]);
  steps.push(step);
  await db.from('agent_runs').update({ steps }).eq('id', runId);
}

// ─── Main ReAct agent runner ──────────────────────────────────────────────────

export async function runAgent(runId: string, goal: string): Promise<void> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [toolDeclarations as any],
    generationConfig: { temperature: 0.3 },
    systemInstruction: `You are an autonomous marketing agent for Brewhaus, a premium specialty coffee brand in India.
Today's date is ${new Date().toISOString().split('T')[0]} (YYYY-MM-DD format). Current month: ${new Date().getMonth() + 1}, Current year: ${new Date().getFullYear()}.

Given a marketing goal, you will: analyse the customer base, segment customers, draft a message, launch the campaign, check stats, and suggest retry if needed.
Always be decisive. Pick the best channel. Execute autonomously without asking for confirmation.

DATE CALCULATION RULES (compute these yourself before calling any tool):
- "yesterday"       → date_from = date_to = one day before today e.g. if today is 2026-06-11, use "2026-06-10"
- "today"           → date_from = date_to = today's date
- "this week"       → date_from = this Monday's date, date_to = today
- "last week"       → date_from = last Monday, date_to = last Sunday
- "this month"      → date_from = YYYY-MM-01 (first of current month), date_to = today
- "last month"      → date_from = first day of previous month, date_to = last day of previous month
- "June" or "May"   → date_from = YYYY-06-01, date_to = YYYY-06-30 (compute last day correctly)
- "last 7 days"     → date_from = 7 days ago, date_to = today
- "last 30 days"    → date_from = 30 days ago, date_to = today
- "last 3 months"   → date_from = 3 months ago first day, date_to = today
Always compute the exact ISO date strings (YYYY-MM-DD) before calling list_campaigns.

CAMPAIGN COMPARISON RULES:
- NEVER invent or guess campaign IDs. Always call list_campaigns first to get real UUIDs.
- When user asks for campaigns from a time period, use date_from/date_to in list_campaigns to get ALL campaigns in that range.
- Pass ALL returned campaign IDs to compare_campaigns — never arbitrarily pick only 2 if more exist.
- compare_campaigns accepts campaign_ids as an ARRAY: ["id1","id2","id3"].

OUTPUT FORMATTING:
- Use markdown tables for any comparison data.
- Use bullet points for summaries and key takeaways.
- Bold key numbers and winner names.
- Always prefix money with ₹.`,
  });

  const chat = model.startChat();

  try {
    let response = await chat.sendMessage(
      `Marketing goal: "${goal}". Please execute this campaign end-to-end.`
    );

    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Extract text and function calls from response
      const text = response.response.text();
      const fnCalls = response.response.functionCalls();

      // Stream any thought text
      if (text) {
        await appendStep(runId, { type: 'thought', content: text, timestamp: new Date().toISOString() });
      }

      // If no function calls, agent is done
      if (!fnCalls || fnCalls.length === 0) {
        await appendStep(runId, { type: 'summary', content: text || 'Campaign completed.', timestamp: new Date().toISOString() });
        break;
      }

      // Execute the first function call
      const fn = fnCalls[0];
      const args = (fn.args ?? {}) as Record<string, any>;

      await appendStep(runId, {
        type: 'tool_call',
        content: `Calling ${fn.name}`,
        tool: fn.name,
        args,
        timestamp: new Date().toISOString(),
      });

      let result: any;
      try {
        switch (fn.name) {
          case 'segment_customers':    result = await execSegmentCustomers(args, runId); break;
          case 'draft_message':        result = await execDraftMessage(args); break;
          case 'launch_campaign':      result = await execLaunchCampaign(args, runId); break;
          case 'get_campaign_stats':
            await new Promise((r) => setTimeout(r, 8000)); // wait for callbacks
            result = await execGetCampaignStats(args);
            break;
          case 'get_customer_insights': result = await execGetCustomerInsights(args); break;
          case 'suggest_retry':         result = await execSuggestRetry(args); break;
          case 'list_campaigns':        result = await execListCampaigns(args); break;
          case 'compare_campaigns':     result = await execCompareCampaigns(args); break;
          case 'revenue_report':        result = await execRevenueReport(args); break;
          default: result = { error: `Unknown tool: ${fn.name}` };
        }
      } catch (err: any) {
        result = { error: err.message };
      }

      await appendStep(runId, {
        type: 'observation',
        content: JSON.stringify(result, null, 2),
        tool: fn.name,
        result,
        timestamp: new Date().toISOString(),
      });

      // Feed result back
      response = await chat.sendMessage([{
        functionResponse: { name: fn.name, response: { result } },
      }]);
    }

    await db.from('agent_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId);
  } catch (err: any) {
    console.error(`Agent run ${runId} error:`, err.message);
    await appendStep(runId, { type: 'summary', content: `Error: ${err.message}`, timestamp: new Date().toISOString() });
    await db.from('agent_runs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', runId);
  }
}
