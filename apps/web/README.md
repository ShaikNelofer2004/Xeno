# 🌐 XenoCRM — Frontend (Web App)

This is the Next.js frontend for the XenoCRM platform, built with modern web technologies to provide a highly interactive, real-time, and aesthetically pleasing experience.

## 🛠️ Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** Vanilla CSS + Inline Styles (for highly tailored, premium gradients, glassmorphism, and dynamic micro-animations)
* **Authentication:** Clerk
* **Icons:** Lucide React
* **Data Visualization:** Recharts
* **Markdown Rendering:** React-Markdown

## 🌟 Key Features & Pages

### 1. **Authentication**
Fully protected routes using Clerk middleware. Users must sign in to view CRM data, ensuring complete security.

### 2. **Dashboard**
An overview of the CRM's high-level metrics. Displays RFM tier distributions, overall revenue, and recent campaign performance through clean, responsive Recharts diagrams.

### 3. **Audience & Customers**
A robust table view displaying all ingested customers. Marketers can view individual customer profiles, their RFM scores (Recency, Frequency, Monetary), loyalty tiers (Gold, Silver, Bronze, Lapsed), and lifetime value.

### 4. **Campaign Wizard**
A 4-step interactive wizard designed for marketers to manually configure campaigns:
1. **Details:** Name and Channel (WhatsApp, SMS, Email, RCS).
2. **Audience:** Select a dynamic segment or manually pick specific customers.
3. **Message:** Draft the message template using dynamic variables like `{name}` and `{tier}`. Includes a live rendering preview.
4. **Review & Launch:** Final review before triggering the backend delivery pipeline.

### 5. **Live Delivery Funnel (Campaign Details)**
Once a campaign is launched, you can watch its progress in real-time. This page continuously polls the backend and streams live events (Sent → Delivered → Opened/Read → Clicked → Order Placed) into a visual funnel, along with a live activity feed.

### 6. **AI Agent Interface**
The core autonomous feature of XenoCRM. An interactive chat interface where marketers can type plain-english goals. The frontend establishes a Server-Sent Events (SSE) connection with the backend to stream the Gemini agent's thought process, tool calls, and final results directly to the UI in real-time.

### 7. **Churn Health Dashboard**
Highlights customers who are "At Risk" or "Churning" based on their exact recency metrics and past order history. Features a convenient "Auto-Winback" quick-action button that automatically delegates a win-back campaign to the AI Agent.

## 📡 API Integration Reference

The frontend fetches data directly from the **Core API Backend**. The primary routes utilized by this web application include:

* **Agent API:**
  * `POST /api/agent/run` - Used to trigger a new AI session.
  * `GET /api/agent/stream/:runId` - Streamed via EventSource in the Agent Chat UI.
* **Campaigns API:**
  * `GET /api/campaigns` & `GET /api/campaigns/:id` - Used in the Dashboard and Campaigns table.
  * `POST /api/campaigns/:id/send` - Triggered at the end of the Campaign Wizard.
* **Customers API:**
  * `GET /api/customers` - Fetches the main Audience table (paginated).
  * `GET /api/customers/stats` - Powers the Dashboard widgets.
* **Segments API:**
  * `POST /api/segments` - Used by the Create Segment modal.

## 🚀 Running the App

1. Ensure your `.env.local` is set up with Clerk keys and the API URL (see root `README.md`).
2. Install dependencies: `npm install`
3. Run the development server:
```bash
npm run dev
```
4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Architecture Notes

* **`app/(app)/`**: All authenticated routes are grouped inside this route group. The layout enforces Clerk authentication and renders the global sidebar navigation.
* **`lib/api.ts`**: A centralized, type-safe wrapper around the native browser `fetch` API. It handles JSON parsing, error throwing, and prepending the backend API base URL automatically.
