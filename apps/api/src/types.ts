// Inline types to avoid cross-workspace import issues
export type Tier = 'bronze' | 'silver' | 'gold';
export type Channel = 'whatsapp' | 'sms' | 'email' | 'rcs';
export type CommStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';

export interface SegmentFilter {
  recency_days?: number;
  min_spent?: number;
  max_spent?: number;
  tier?: Tier;
  city?: string;
  min_orders?: number;
  max_orders?: number;
}

export interface AgentStep {
  type: 'thought' | 'tool_call' | 'observation' | 'summary';
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  timestamp: string;
}

export interface StubSendPayload {
  campaign_id: string;
  crm_receipt_url: string;
  channel: Channel;
  recipients: StubRecipient[];
}

export interface StubRecipient {
  stub_message_id: string;
  customer_id: string;
  contact: string;
  message: string;
}

export interface StubReceiptPayload {
  stub_message_id: string;
  status: CommStatus;
  order_placed?: boolean;
  order_value?: number;
}
