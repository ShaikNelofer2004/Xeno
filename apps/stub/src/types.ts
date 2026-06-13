// Inline types for the stub service
export type Channel = 'whatsapp' | 'sms' | 'email' | 'rcs';
export type CommStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';

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
