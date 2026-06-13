# ⚙️ XenoCRM — Core API Backend

This is the central Express.js backend for XenoCRM. It is responsible for orchestrating the database, handling campaign generation, processing webhooks from the vendor stub, and housing the autonomous Gemini ReAct Agent.

## 🛠️ Tech Stack

* **Framework:** Express.js (Node.js)
* **Language:** TypeScript
* **Database Client:** `@supabase/supabase-js` (PostgreSQL)
* **AI:** `@google/genai` (Gemini 1.5 Flash)
* **Events:** Server-Sent Events (SSE) for live streaming

## 🌟 Key Responsibilities

### 1. **Data Ingestion & Management**
Provides RESTful endpoints (`/api/customers`) to ingest and retrieve customer data. Handles complex dynamic queries via Supabase to filter customers by tier, order count, and recency.

### 2. **Campaign orchestration**
When a campaign is launched (`/api/campaigns/:id/send`), the backend:
1. Dynamically resolves the audience segment.
2. Creates unique `communications` rows for every targeted customer.
3. Personalizes the message template with customer-specific variables.
4. Generates a strict payload and dispatches it in a "fire-and-forget" manner to the Channel Stub.

### 3. **The Autonomous Agent**
Located in `src/agent/runner.ts`, this is a fully autonomous loop using the Gemini model. 
* It is equipped with tools like `queryDatabase`, `createSegment`, `draftMessage`, and `launchCampaign`.
* It reasons about the user's plain-english goal, formulates a plan, and executes the tools.
* The loop is fully visible to the user: the backend streams every thought, tool call, and result to the frontend via Server-Sent Events (`/api/agent/stream/:runId`).

### 4. **Idempotent Webhooks & State Machine**
The backend exposes a webhook endpoint at `/api/receipt` to listen for delivery events from the Channel Stub.
* It enforces a strict state machine: `queued → sent → delivered → read/opened → clicked`.
* It drops any out-of-order webhooks (e.g., receiving a "delivered" event *after* a "read" event due to network latency).
* Once a "clicked" event occurs, it probabilistically simulates an order placement and attributes revenue back to the campaign.

### 5. **Robust Chunking**
To ensure the CRM can handle large segments without hitting HTTP or URL length limits (a common pitfall of URL-based `in()` queries), the API aggressively chunks large database reads and inserts into manageable sizes.

## 🚀 Running the API

1. Ensure your `.env` is set up with Supabase and Gemini keys (see root `README.md`).
2. Install dependencies: `npm install`
3. Run the development server (auto-restarts on changes):
```bash
npm run dev
```
4. The server runs on port `3001` by default.

## 📂 Directory Structure

* `src/index.ts` — Express app configuration and routing map.
* `src/db.ts` — Supabase client initialization.
* `src/routes/` — Individual routers for customers, campaigns, segments, agent streaming, and receipt webhooks.
* `src/agent/runner.ts` — The ReAct agent execution loop and custom tool definitions.
