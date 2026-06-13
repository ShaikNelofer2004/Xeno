-- ============================================================
-- XenoCRM Database Schema
-- Run this in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  city TEXT,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold')) DEFAULT 'bronze',
  total_spent NUMERIC DEFAULT 0,
  order_count INT DEFAULT 0,
  last_order_date DATE,
  -- RFM scores (1-5 each)
  rfm_r INT DEFAULT 3,
  rfm_f INT DEFAULT 3,
  rfm_m INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC NOT NULL,
  items JSONB DEFAULT '[]',
  channel TEXT CHECK (channel IN ('online', 'offline')) DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filter_json JSONB NOT NULL DEFAULT '{}',
  customer_count INT DEFAULT 0,
  created_by TEXT DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email', 'rcs')) NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'launched', 'completed')) DEFAULT 'draft',
  agent_run_id UUID,
  total_recipients INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  launched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- COMMUNICATIONS (one row per recipient per campaign)
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  -- stub_message_id ensures idempotent receipt updates
  stub_message_id TEXT UNIQUE NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email', 'rcs')) NOT NULL,
  message TEXT NOT NULL,
  -- State machine: queued → sent → delivered → read/opened → clicked
  --                                  ↓
  --                                failed (terminal)
  status TEXT CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked')) DEFAULT 'queued',
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  -- Revenue attribution
  order_placed BOOLEAN DEFAULT FALSE,
  order_value NUMERIC
);

-- ============================================================
-- AGENT RUNS (full reasoning log)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal TEXT NOT NULL,
  -- steps: [{type: 'thought'|'tool_call'|'observation'|'summary', content, tool?, args?, result?}]
  steps JSONB DEFAULT '[]',
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_communications_campaign_id ON communications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_stub_message_id ON communications(stub_message_id);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
