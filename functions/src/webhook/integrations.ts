/**
 * Webhook integration management
 */

import { getAdminFirestore } from './firebaseAdmin';
import { WebhookIntegration, WebhookEventType } from './eventTypes';

const db = getAdminFirestore();

/**
 * Get active integrations for an event type
 */
export async function getActiveIntegrations(
  eventType: WebhookEventType
): Promise<WebhookIntegration[]> {
  const snapshot = await db
    .collection('integrations')
    .where('isActive', '==', true)
    .where('enabledEvents', 'array-contains', eventType)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WebhookIntegration[];
}

/**
 * Get integration by ID
 */
export async function getIntegration(
  integrationId: string
): Promise<WebhookIntegration | null> {
  const doc = await db.collection('integrations').doc(integrationId).get();
  if (!doc.exists) {
    return null;
  }
  return {
    id: doc.id,
    ...doc.data(),
  } as WebhookIntegration;
}
