# 🤖 XenoCRM — Autonomous AI Campaign Agent

**Xeno Engineering Internship Assignment 2026**

XenoCRM is an AI-native Mini CRM built to handle end-to-end marketing campaigns autonomously. Instead of manually clicking through filters to segment users and draft emails, a marketer simply types a goal (e.g., *"Send a win-back discount to Silver tier customers inactive for 60 days"*). 

The CRM uses a **Gemini ReAct Agent** to reason, segment the audience, draft personalized cross-channel messages, and launch the campaign. A separate **Channel Stub** simulates real-world delivery latency and failures across WhatsApp, SMS, Email, and RCS.

---

## 🌟 Key Features

1. **Autonomous ReAct Loop:** Gemini 1.5 Flash agent that reasons, acts, and observes using custom function-calling tools.
2. **Live SSE Streaming:** The frontend streams the agent's "thought process" live via Server-Sent Events, so the marketer can watch the AI work in real-time.
3. **Idempotent Delivery Webhooks:** The CRM exposes a `/api/receipt` endpoint governed by a strict state-machine (Sent → Delivered → Opened → Clicked) that rejects out-of-order callbacks.
4. **Vendor Channel Stub:** A fully separate Express service that simulates 4-channel delivery. It uses `setTimeout` to introduce probabilistic latency and enforces a 10% failure rate to simulate real-world bounce mechanics.
5. **Auto-Retry Mechanics:** The agent can observe failed deliveries and autonomously launch a retry campaign on an alternate channel.
6. **Robust Authentication:** Full authentication provided by Clerk.
7. **Interactive Dashboard & Delivery Funnel:** Beautiful Next.js frontend with live funnel metrics and AI-driven campaign builder.

---

## 🏗️ System Architecture

The project is structured as an npm monorepo:

* `apps/web/` — **Next.js 14 App Router** (Frontend, Tailwind CSS, Clerk Auth)
* `apps/api/` — **Express.js + TypeScript** (Core CRM Backend, PostgreSQL/Supabase, Gemini SDK)
* `apps/stub/` — **Express.js + TypeScript** (External Vendor Delivery Simulator)
* `packages/shared/` — **Shared Types & DB Scripts** (Seed script, SQL schema)

*(Please check the `README.md` files in each specific app folder for detailed technical documentation of each service.)*

---

## 🚀 Local Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com) account (for PostgreSQL)
- A [Clerk](https://clerk.com) account (for Auth)
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini)

### 2. Database Setup
1. Create a new Supabase project.
2. Run the SQL schema located at `packages/shared/schema.sql` in the Supabase SQL Editor.

### 3. Environment Variables
You need to create 3 `.env` files:

**`apps/api/.env`**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

GEMINI_API_KEY=your_gemini_api_key

STUB_URL=http://localhost:4000
CRM_RECEIPT_URL=http://localhost:3001/api/receipt
API_INTERNAL_URL=http://localhost:3001
PORT=3001
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_API_URL=http://localhost:3001
```

**`apps/stub/.env`**
```env
CRM_RECEIPT_URL=http://localhost:3001/api/receipt
PORT=4000
```

### 4. Install & Seed
Install all dependencies across the monorepo:
```bash
npm install
```

Run the seed script to populate the database with 500 customers, 2000+ orders, and calculate their RFM (Recency, Frequency, Monetary) scores:
```bash
node packages/shared/seed.js
```

### 5. Run the Services
You need 3 terminal windows to run the services simultaneously:

**Terminal 1: Web Frontend**
```bash
cd apps/web
npm run dev
```

**Terminal 2: CRM API**
```bash
cd apps/api
npx ts-node-dev --respawn --transpile-only src/index.ts
```

**Terminal 3: Channel Stub**
```bash
cd apps/stub
npx ts-node-dev --respawn --transpile-only src/index.ts
```

Open `http://localhost:3000` in your browser.

---

## 🧠 System Design Tradeoffs

### Volume & Ordering
To prevent the vendor stub from overwhelming the CRM receipt API with thousands of concurrent requests, the stub processes recipients in **batches of 50**, staggered by 100ms. 
To ensure chronological integrity (e.g. preventing a "delivered" status from overwriting an "opened" status due to network jitter), the CRM `/api/receipt` endpoint implements a strict **State Machine**. Out-of-order state transitions are rejected. Furthermore, database operations for fetching large segments are heavily chunked to prevent URL length limits in standard REST/fetch clients.

### Idempotency
Each message sent to the stub is assigned a unique `stub_message_id`. This ID is passed back in all webhooks, allowing the CRM to confidently update the communications table without risking duplicate records during network retries.

### Production Scaling Considerations
For a rapid assignment, `setTimeout` and synchronous DB writes are acceptable. At real-world scale (millions of users):
1. **Message Broker:** The API would push campaigns to a Kafka topic or SQS queue, rather than calling the stub synchronously.
2. **Dead Letter Queues (DLQ):** Failed receipt webhooks would be pushed to a DLQ for asynchronous replay.
3. **Connection Pooling:** We would implement PgBouncer in front of Supabase to handle thousands of concurrent webhook DB connections.
