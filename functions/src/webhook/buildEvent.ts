/**
 * Build webhook event envelope
 */

import { WebhookEvent, WebhookEventType } from './eventTypes';

// Simple UUID v4 generator (no external dependency)
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'therfpqueen-f11fd';
const ENV = process.env.FUNCTIONS_EMULATOR ? 'development' : 'production';
const VERSION = '1.0';

export function buildEvent(
  type: WebhookEventType,
  data: Record<string, any>
): WebhookEvent {
  return {
    id: `evt_${uuidv4()}`,
    type,
    createdAt: new Date().toISOString(),
    data,
    source: {
      projectId: PROJECT_ID,
      env: ENV,
      version: VERSION,
    },
  };
}
