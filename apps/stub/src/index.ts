import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import type { Channel, CommStatus, StubSendPayload, StubRecipient } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Terminal colour helpers ──────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  // Status colours
  sent:      '\x1b[34m',   // blue
  delivered: '\x1b[36m',   // cyan
  opened:    '\x1b[32m',   // green
  read:      '\x1b[32m',   // green
  clicked:   '\x1b[33m',   // yellow
  failed:    '\x1b[31m',   // red
  order:     '\x1b[35m',   // magenta
  // Channel colours
  whatsapp:  '\x1b[92m',   // bright green
  sms:       '\x1b[93m',   // bright yellow
  email:     '\x1b[94m',   // bright blue
  rcs:       '\x1b[95m',   // bright magenta
} as Record<string, string>;

const STATUS_ICON: Record<CommStatus, string> = {
  queued:    '⏳',
  sent:      '📤',
  delivered: '✅',
  opened:    '👁 ',
  read:      '👁 ',
  clicked:   '🖱 ',
  failed:    '❌',
};

const CHANNEL_ICON: Record<Channel, string> = {
  whatsapp: '💬',
  sms:      '📱',
  email:    '📧',
  rcs:      '✨',
};

// Global counters per campaign batch for summary display
const batchCounters = new Map<string, Record<CommStatus, number>>();

function logEvent(
  channel: Channel,
  recipient: StubRecipient,
  status: CommStatus,
  batchId: string,
  orderValue = 0
) {
  const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const statusColor = C[status] ?? C.reset;
  const channelColor = C[channel] ?? C.reset;
  const icon = STATUS_ICON[status] ?? '•';
  const chIcon = CHANNEL_ICON[channel] ?? '📡';

  // Short ID for readability
  const shortId = recipient.stub_message_id.slice(0, 8);

  // Contact info
  const contact = (recipient.contact ?? '').slice(0, 20).padEnd(20, ' ');

  // Status label padded
  const statusLabel = status.toUpperCase().padEnd(9, ' ');

  let line = `  ${C.dim}${ts}${C.reset} ${chIcon} ${channelColor}${channel.padEnd(8)}${C.reset} `
    + `${C.dim}[${shortId}]${C.reset} `
    + `${statusColor}${C.bold}${icon} ${statusLabel}${C.reset} `
    + `${C.dim}→${C.reset} ${contact}`;

  if (orderValue > 0) {
    line += ` ${C.order}${C.bold}💰 ORDER ₹${orderValue}${C.reset}`;
  }

  console.log(line);

  // Update counters
  const ctr = batchCounters.get(batchId);
  if (ctr) ctr[status] = (ctr[status] ?? 0) + 1;
}

// ─── Channel delivery probability profiles ───────────────────────────────────
const CHANNEL_PROFILES: Record<Channel, {
  sendDelay: [number, number];
  deliverDelay: [number, number];
  engageDelay: [number, number];
  clickDelay: [number, number];
  deliverRate: number;
  engageRate: number;
  clickRate: number;
  failRate: number;
  orderRate: number;
  engageStatus: CommStatus;
}> = {
  // Wave 1: Sent (0-3s) → Wave 2: Delivered (3-10s) → Wave 3: Opened (10-20s) → Wave 4: Clicked (20-35s)
  whatsapp: {
    sendDelay:    [500,  3000],
    deliverDelay: [3000, 10000],
    engageDelay:  [10000, 20000],
    clickDelay:   [20000, 35000],
    deliverRate: 0.95,
    engageRate:  0.75,
    clickRate:   0.50,
    failRate:    0.05,
    orderRate:   0.35,
    engageStatus: 'read',
  },
  sms: {
    sendDelay:    [500,  3000],
    deliverDelay: [3000, 10000],
    engageDelay:  [10000, 20000],
    clickDelay:   [20000, 35000],
    deliverRate: 0.85,
    engageRate:  0.55,
    clickRate:   0.35,
    failRate:    0.10,
    orderRate:   0.25,
    engageStatus: 'opened',
  },
  email: {
    sendDelay:    [500,  3000],
    deliverDelay: [3000, 10000],
    engageDelay:  [10000, 20000],
    clickDelay:   [20000, 35000],
    deliverRate: 0.80,
    engageRate:  0.45,
    clickRate:   0.30,
    failRate:    0.08,
    orderRate:   0.20,
    engageStatus: 'opened',
  },
  rcs: {
    sendDelay:    [500,  3000],
    deliverDelay: [3000, 10000],
    engageDelay:  [10000, 20000],
    clickDelay:   [20000, 35000],
    deliverRate: 0.88,
    engageRate:  0.65,
    clickRate:   0.45,
    failRate:    0.07,
    orderRate:   0.30,
    engageStatus: 'read',
  },
};

const randMs = (range: [number, number]) =>
  Math.floor(Math.random() * (range[1] - range[0])) + range[0];

// ─── Send a receipt callback to the CRM ──────────────────────────────────────
async function sendReceipt(
  crmUrl: string,
  stubMessageId: string,
  status: CommStatus,
  orderPlaced = false,
  orderValue = 0
) {
  const method = 'POST';
  const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const shortId = stubMessageId.slice(0, 8);
  const statusColor = C[status] ?? C.reset;

  // Log the outgoing HTTP request
  console.log(
    `  ${C.dim}${ts}${C.reset} `
    + `${C.bold}\x1b[96m${method}\x1b[0m ${C.dim}→ ${crmUrl}${C.reset}  `
    + `${C.dim}[${shortId}]${C.reset} `
    + `${statusColor}${C.bold}${STATUS_ICON[status]} ${status.toUpperCase()}${C.reset}`
    + (orderValue > 0 ? `  ${C.order}${C.bold}💰 ₹${orderValue}${C.reset}` : '')
  );

  try {
    const res = await fetch(crmUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stub_message_id: stubMessageId,
        status,
        order_placed: orderPlaced,
        order_value: orderValue,
      }),
    });
    
    // Consume the response to free the socket/memory
    await res.text();
    
    // Log the HTTP response code
    const statusCode = res.status;
    const codeColor = statusCode >= 200 && statusCode < 300 ? '\x1b[92m' : '\x1b[91m';
    console.log(
      `  ${C.dim}${ts}${C.reset} `
      + `${C.bold}\x1b[96m${method}\x1b[0m ${C.dim}← ${crmUrl}${C.reset}  `
      + `${C.dim}[${shortId}]${C.reset} `
      + `${codeColor}${C.bold}HTTP ${statusCode}${C.reset}`
    );
  } catch (err: any) {
    console.error(`  ${C.failed}${C.bold}POST ← FAILED${C.reset} ${C.dim}[${shortId}]${C.reset} ${err.message}`);
  }
}

// ─── Simulate the full lifecycle for one recipient ────────────────────────────
function simulateRecipient(
  recipient: StubRecipient,
  channel: Channel,
  crmReceiptUrl: string,
  batchId: string
) {
  const profile = CHANNEL_PROFILES[channel];
  const isFail = Math.random() < profile.failRate;

  // Step 1: sent
  setTimeout(async () => {
    logEvent(channel, recipient, 'sent', batchId);
    await sendReceipt(crmReceiptUrl, recipient.stub_message_id, 'sent');

    if (isFail) {
      setTimeout(async () => {
        logEvent(channel, recipient, 'failed', batchId);
        await sendReceipt(crmReceiptUrl, recipient.stub_message_id, 'failed');
      }, randMs([200, 800]));
      return;
    }

    // Step 2: delivered or failed
    if (Math.random() > profile.deliverRate) {
      setTimeout(async () => {
        logEvent(channel, recipient, 'failed', batchId);
        await sendReceipt(crmReceiptUrl, recipient.stub_message_id, 'failed');
      }, randMs([500, 2000]));
      return;
    }

    setTimeout(async () => {
      logEvent(channel, recipient, 'delivered', batchId);
      await sendReceipt(crmReceiptUrl, recipient.stub_message_id, 'delivered');

      // Step 3: opened/read
      if (Math.random() < profile.engageRate) {
        setTimeout(async () => {
          logEvent(channel, recipient, profile.engageStatus, batchId);
          await sendReceipt(crmReceiptUrl, recipient.stub_message_id, profile.engageStatus);

          // Step 4: clicked + order
          if (Math.random() < profile.clickRate) {
            setTimeout(async () => {
              const orderPlaced = Math.random() < profile.orderRate;
              const orderValue = orderPlaced
                ? Math.round(Math.random() * 1500 + 300)
                : 0;
              logEvent(channel, recipient, 'clicked', batchId, orderValue);
              await sendReceipt(
                crmReceiptUrl,
                recipient.stub_message_id,
                'clicked',
                orderPlaced,
                orderValue
              );
            }, randMs(profile.clickDelay));
          }
        }, randMs(profile.engageDelay));
      }
    }, randMs(profile.deliverDelay));
  }, randMs(profile.sendDelay));
}

// ─── POST /send — receive campaign batch from CRM ────────────────────────────
app.post('/send', async (req, res) => {
  res.json({ received: true, count: req.body.recipients?.length ?? 0 });

  const payload = req.body as StubSendPayload;
  const { channel, recipients, crm_receipt_url } = payload;

  if (!recipients || !Array.isArray(recipients)) return;

  const batchId = uuidv4();
  const chIcon = CHANNEL_ICON[channel] ?? '📡';
  const channelColor = C[channel] ?? C.reset;

  // Init counters
  batchCounters.set(batchId, {
    queued: 0, sent: 0, delivered: 0,
    opened: 0, read: 0, clicked: 0, failed: 0,
  });

  console.log('\n' + '─'.repeat(72));
  console.log(
    `  ${chIcon} ${channelColor}${C.bold}CAMPAIGN DISPATCH${C.reset}`
    + `  ${C.dim}channel:${C.reset} ${channelColor}${channel.toUpperCase()}${C.reset}`
    + `  ${C.dim}recipients:${C.reset} ${C.bold}${recipients.length}${C.reset}`
    + `  ${C.dim}batch:${C.reset} ${C.dim}${batchId.slice(0, 8)}${C.reset}`
  );
  console.log('─'.repeat(72));
  console.log(
    `  ${C.dim}${'TIME'.padEnd(10)} CHANNEL  [MSG-ID ]`
    + ` STATUS     → CONTACT${C.reset}`
  );
  console.log('─'.repeat(72));

  const BATCH_SIZE = 5;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchDelay = Math.floor(i / BATCH_SIZE) * 1000;

    setTimeout(() => {
      for (const recipient of batch) {
        simulateRecipient(recipient, channel, crm_receipt_url, batchId);
      }
    }, batchDelay);
  }

  // Print summary after all events should have fired (~40s)
  setTimeout(() => {
    const ctr = batchCounters.get(batchId);
    if (!ctr) return;
    const totalRevenue = 0; // tracked server-side in CRM, not here
    console.log('\n' + '═'.repeat(72));
    console.log(`  ${chIcon} ${C.bold}SIMULATION COMPLETE${C.reset}  ${C.dim}batch: ${batchId.slice(0, 8)}${C.reset}`);
    console.log('─'.repeat(72));
    console.log(
      `  ${C[`sent`]}📤 Sent: ${ctr.sent}${C.reset}` +
      `   ${C['delivered']}✅ Delivered: ${ctr.delivered}${C.reset}` +
      `   ${C['opened']}👁  Opened/Read: ${(ctr.opened ?? 0) + (ctr.read ?? 0)}${C.reset}` +
      `   ${C['clicked']}🖱  Clicked: ${ctr.clicked}${C.reset}` +
      `   ${C['failed']}❌ Failed: ${ctr.failed}${C.reset}`
    );
    console.log('═'.repeat(72) + '\n');
    batchCounters.delete(batchId);
  }, 75000);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'xenocrm-stub', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n📡 ${C.bold}Channel Stub${C.reset} running on http://localhost:${PORT}`);
  console.log(`   Channels: 💬 WhatsApp  📱 SMS  📧 Email  ✨ RCS\n`);

  // Mutual Keep-Alive: Ping the API every 10 minutes to prevent Render sleep
  setInterval(() => {
    const apiUrl = process.env.CRM_RECEIPT_URL;
    if (apiUrl && apiUrl.includes('onrender.com')) {
      const healthUrl = apiUrl.replace('/api/receipt', '/health');
      fetch(healthUrl)
        .then(res => res.text()) // Consume response to free socket
        .then(() => console.log('💓 Keep-Alive Ping sent to API'))
        .catch(() => {});
    }
  }, 10 * 60 * 1000);
});

export default app;
