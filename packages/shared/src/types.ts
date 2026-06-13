// ============================================================
// Shared TypeScript types across all apps
// ============================================================

export type Tier = 'bronze' | 'silver' | 'gold';
export type Channel = 'whatsapp' | 'sms' | 'email' | 'rcs';
export type CommStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';
export type CampaignStatus = 'draft' | 'launched' | 'completed';
export type AgentRunStatus = 'running' | 'completed' | 'failed';
export type AgentStepType = 'thought' | 'tool_call' | 'observation' | 'summary';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tier: Tier;
  total_spent: number;
  order_count: number;
  last_order_date: string | null;
  rfm_r: number;
  rfm_f: number;
  rfm_m: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_date: string;
  amount: number;
  items: OrderItem[];
  channel: 'online' | 'offline';
  created_at: string;
}

export interface OrderItem {
  name: string;
  price: number;
  qty: number;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  filter_json: SegmentFilter;
  customer_count: number;
  created_by: string;
  created_at: string;
}

export interface SegmentFilter {
  recency_days?: number;
  min_spent?: number;
  max_spent?: number;
  tier?: Tier;
  city?: string;
  min_orders?: number;
  max_orders?: number;
}

export interface Campaign {
  id: string;
  name: string;
  segment_id: string | null;
  channel: Channel;
  message_template: string;
  status: CampaignStatus;
  agent_run_id: string | null;
  total_recipients: number;
  created_at: string;
  launched_at: string | null;
  completed_at: string | null;
}

export interface Communication {
  id: string;
  campaign_id: string;
  customer_id: string;
  stub_message_id: string;
  channel: Channel;
  message: string;
  status: CommStatus;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  order_placed: boolean;
  order_value: number | null;
}

export interface AgentStep {
  type: AgentStepType;
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  timestamp: string;
}

export interface AgentRun {
  id: string;
  goal: string;
  steps: AgentStep[];
  campaign_id: string | null;
  status: AgentRunStatus;
  created_at: string;
  completed_at: string | null;
}

export interface CampaignStats {
  campaign_id: string;
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  orders_placed: number;
  revenue_attributed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

// Stub API types
export interface StubSendPayload {
  campaign_id: string;
  crm_receipt_url: string;
  channel: Channel;
  recipients: StubRecipient[];
}

export interface StubRecipient {
  stub_message_id: string;
  customer_id: string;
  contact: string; // phone or email
  message: string;
}

export interface StubReceiptPayload {
  stub_message_id: string;
  status: CommStatus;
  order_placed?: boolean;
  order_value?: number;
}
