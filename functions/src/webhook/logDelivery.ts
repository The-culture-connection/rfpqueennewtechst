/**
 * Log webhook delivery attempts and results
 */

import { getAdminFirestore, admin } from './firebaseAdmin';
import { WebhookDelivery, WebhookEventType } from './eventTypes';
import { DeliveryResult } from './deliver';

const db = getAdminFirestore();

/**
 * Log webhook delivery attempt
 */
export async function logWebhookDelivery(
  integrationId: string,
  eventId: string,
  eventType: WebhookEventType,
  result: DeliveryResult,
  metadata?: {
    userId?: string;
    opportunityId?: string;
    documentId?: string;
    dataSummary?: Record<string, any>;
  }
): Promise<void> {
  const deliveryId = `${integrationId}_${eventId}`;
  const now = new Date();

  const timestamp = admin.firestore.Timestamp.fromDate(now);

  const delivery: WebhookDelivery = {
    integrationId,
    eventId,
    eventType,
    status: result.success ? 'delivered' : 'failed',
    httpStatus: result.httpStatus,
    attempts: result.attempts,
    lastError: result.error,
    createdAt: timestamp,
    updatedAt: timestamp,
    userId: metadata?.userId,
    opportunityId: metadata?.opportunityId,
    documentId: metadata?.documentId,
    dataSummary: metadata?.dataSummary,
  };

  await db
    .collection('webhookDeliveries')
    .doc(deliveryId)
    .set(delivery);
}
