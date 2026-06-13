import { Router } from 'express';
import { db } from '../db';
import type { CommStatus, StubReceiptPayload } from '../types';

export const receiptRoutes = Router();

// ─── Terminal colour helpers ──────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgGreen: '\x1b[42m',
};

const STATUS_LOG: Record<CommStatus, { color: string; icon: string }> = {
  queued:    { color: C.dim,     icon: '⏳' },
  sent:      { color: C.blue,    icon: '📤' },
  delivered: { color: C.cyan,    icon: '✅' },
  opened:    { color: C.green,   icon: '👁 ' },
  read:      { color: C.green,   icon: '👁 ' },
  clicked:   { color: C.yellow,  icon: '🖱 ' },
  failed:    { color: C.red,     icon: '❌' },
};

/**
 * State machine: valid forward transitions only.
 */
const STATUS_ORDER: CommStatus[] = [
  'queued', 'sent', 'delivered', 'opened', 'read', 'clicked',
];
const TERMINAL: CommStatus[] = ['failed', 'clicked'];

function isValidTransition(current: CommStatus, next: CommStatus): boolean {
  if (TERMINAL.includes(current)) return false;
  if (next === 'failed') return current !== 'failed';
  const currentIdx = STATUS_ORDER.indexOf(current);
  const nextIdx = STATUS_ORDER.indexOf(next);
  return nextIdx > currentIdx;
}

// POST /api/receipt — called by Channel Stub with delivery updates
receiptRoutes.post('/', async (req, res) => {
  // Always respond 200 immediately — never block the stub
  res.json({ received: true });

  try {
    const payload = req.body as StubReceiptPayload;
    const { stub_message_id, status, order_placed, order_value } = payload;
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const shortId = stub_message_id.slice(0, 8);
    const cfg = STATUS_LOG[status] ?? STATUS_LOG.queued;

    // Fetch current comm (for state machine check + customer name)
    const { data: comm, error: fetchErr } = await db
      .from('communications')
      .select('id, status, campaign_id, customers(name, tier)')
      .eq('stub_message_id', stub_message_id)
      .single();

    if (fetchErr || !comm) {
      console.warn(`  ${C.dim}${ts}${C.reset} ${C.red}RECEIPT${C.reset} unknown stub_message_id: ${shortId}`);
      return;
    }

    const currentStatus = comm.status as CommStatus;
    const customer = (comm as any).customers;
    const customerName = customer?.name ?? 'Unknown';
    const tier = customer?.tier ?? '';

    // Enforce state machine ordering
    if (!isValidTransition(currentStatus, status)) {
      // Skip silently — just skip invalid transitions
      return;
    }

    // Build update payload
    const timestampField: Record<CommStatus, string> = {
      queued: 'queued_at', sent: 'sent_at', delivered: 'delivered_at',
      opened: 'opened_at', read: 'read_at', clicked: 'clicked_at', failed: 'failed_at',
    };

    const update: Record<string, unknown> = {
      status,
      [timestampField[status]]: new Date().toISOString(),
    };

    if (order_placed) {
      update.order_placed = true;
      update.order_value = order_value ?? 0;
    }

    const { error: updateErr } = await db
      .from('communications')
      .update(update)
      .eq('stub_message_id', stub_message_id);

    if (updateErr) {
      console.error(`  ${C.red}DB UPDATE FAILED${C.reset} [${shortId}]: ${updateErr.message}`);
      return;
    }

    // ── Rich terminal log ──────────────────────────────────────────────────
    const tierColor: Record<string, string> = {
      gold:   '\x1b[93m',
      silver: '\x1b[37m',
      bronze: '\x1b[33m',
    };
    const tc = tierColor[tier] ?? C.dim;

    let line = `  ${C.dim}${ts}${C.reset} `
      + `${C.bold}\x1b[96mPOST\x1b[0m /api/receipt  `
      + `${C.dim}[${shortId}]${C.reset}  `
      + `${cfg.color}${C.bold}${cfg.icon} ${status.toUpperCase().padEnd(9)}${C.reset}  `
      + `${C.white}${customerName.padEnd(22)}${C.reset} `
      + `${tc}[${tier}]${C.reset}`;

    if (order_placed && order_value) {
      line += `  ${C.magenta}${C.bold}💰 ORDER ₹${order_value}${C.reset}`;
    }

    console.log(line);

  } catch (err: any) {
    console.error(`  ${C.red}Receipt handler error:${C.reset}`, err.message);
  }
});
