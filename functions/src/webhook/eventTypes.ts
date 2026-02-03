/**
 * Webhook event type definitions
 */

export type WebhookEventType =
  | 'user.created'
  | 'document.uploaded'
  | 'opportunity.saved'
  | 'opportunity.applied'
  | 'opportunity.outcome_recorded'
  | 'opportunity.analyzed'
  | 'opportunities.recommended'
  | 'opportunity.viewed';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  createdAt: string; // ISO string
  data: Record<string, any>;
  source: {
    projectId: string;
    env: string;
    version: string;
  };
}

export interface WebhookIntegration {
  id: string;
  name: string;
  webhookUrl: string;
  secret: string;
  enabledEvents: WebhookEventType[];
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp | any;
  updatedAt?: FirebaseFirestore.Timestamp | any;
}

export interface WebhookDelivery {
  integrationId: string;
  eventId: string;
  eventType: WebhookEventType;
  status: 'delivered' | 'failed';
  httpStatus?: number;
  attempts: number;
  lastError?: string;
  createdAt: FirebaseFirestore.Timestamp | any;
  updatedAt: FirebaseFirestore.Timestamp | any;
  userId?: string;
  opportunityId?: string;
  documentId?: string;
  dataSummary?: Record<string, any>; // Small subset only
}
