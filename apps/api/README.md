# ⚙️ XenoCRM — Core API Backend

This is the central Express.js backend for XenoCRM. It is responsible for orchestrating the database, handling campaign generation, processing webhooks from the vendor stub, and housing the autonomous Gemini ReAct Agent.

## 🛠️ Tech Stack

* **Framework:** Express.js (Node.js)
* **Language:** TypeScript
* **Database Client:** `@supabase/supabase-js` (PostgreSQL)
* **AI:** `@google/genai` (Gemini 1.5 Flash)
* **Events:** Server-Sent Events (SSE) for live streaming

## 🌟 Key Responsibilities

```mermaid
graph TD
    API[Express.js App] --> Router[API Routers]
    Router --> Cust(Customers)
    Router --> Seg(Segments)
    Router --> Camp(Campaigns)
    Router --> Agt(Agent)
    Router --> Webhook(Receipt Webhooks)

    Camp -->|POST /send| Stub[(External Vendor Stub)]
    Webhook <--|POST /receipt| Stub
    
    Agt -->|SSE Stream| Frontend([Next.js Frontend])
    Cust --> Frontend
    Camp --> Frontend
    Seg --> Frontend

    Agt -->|Calls Tools| Tools{ReAct Tools}
    Tools --> DB[(Supabase Postgres)]
    Cust --> DB
    Seg --> DB
    Camp --> DB
```

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

## 📡 API Routes Reference

### Customers (`/api/customers`)
* `GET /api/customers` - Fetch paginated customers.
* `GET /api/customers/stats` - Fetch aggregate stats (total revenue, tiers).
* `GET /api/customers/cities` - Fetch unique cities for filtering.
* `GET /api/customers/rfm/scatter` - Fetch RFM coordinates for scatter plots.
* `GET /api/customers/:id` - Fetch a single customer's full profile.
* `POST /api/customers/ingest` - Ingest new customers.

### Segments (`/api/segments`)
* `GET /api/segments` - Fetch all saved audience segments.
* `POST /api/segments` - Create a new segment.
* `POST /api/segments/preview` - Preview how many customers match a set of rules.
* `GET /api/segments/:id/customers` - Get the actual customers inside a segment.
* `DELETE /api/segments/:id` - Delete a segment.

### Campaigns (`/api/campaigns`)
* `GET /api/campaigns` - Fetch all campaigns.
* `POST /api/campaigns` - Create a draft campaign.
* `GET /api/campaigns/:id` - Fetch details of a single campaign.
* `GET /api/campaigns/:id/stats` - Fetch funnel stats (sent, delivered, opened, etc).
* `GET /api/campaigns/:id/communications` - Fetch the individual delivery logs for recipients.
* `POST /api/campaigns/:id/send` - Launch a campaign and dispatch to the vendor stub.
* `DELETE /api/campaigns/:id` - Delete a campaign and its associated communications.

### AI Agent (`/api/agent`)
* `POST /api/agent/run` - Start a new autonomous agent session with a prompt goal.
* `GET /api/agent/runs` - List all past agent runs.
* `GET /api/agent/runs/:id` - Fetch details of a specific agent run.
* `GET /api/agent/stream/:runId` - **(SSE)** Connect to the live Server-Sent Events stream for real-time thought logs.

### Webhooks (`/api/receipt`)
* `POST /api/receipt` - The webhook callback endpoint for the Vendor Stub to report delivery status changes.

## 🚀 Running the API

1. Ensure your `.env` is set up with Supabase and Gemini keys (see root `README.md`).
2. Install dependencies: `npm install`
3. Run the development server (auto-restarts on changes):
```bash
npm run dev
```
4. The server runs on port `3001` by default.
