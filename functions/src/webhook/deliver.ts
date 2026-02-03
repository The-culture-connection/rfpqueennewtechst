/**
 * Webhook delivery with retries
 */

import { WebhookEvent, WebhookIntegration } from './eventTypes';
import { signPayload } from './sign';
import * as logger from 'firebase-functions/logger';

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [250, 500, 1000, 2000, 4000]; // ms

interface DeliveryResult {
  success: boolean;
  httpStatus?: number;
  error?: string;
  attempts: number;
}

/**
 * Deliver webhook event to integration endpoint
 */
export async function deliverWebhook(
  integration: WebhookIntegration,
  event: WebhookEvent
): Promise<DeliveryResult> {
  const rawBody = JSON.stringify(event);
  const signature = signPayload(integration.secret, rawBody);

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'OpportuniLynk-Webhooks/1.0',
    'X-OpportuniLynk-Event': event.type,
    'X-OpportuniLynk-Id': event.id,
    'Idempotency-Key': event.id,
    'X-OpportuniLynk-Signature': `sha256=${signature}`,
  };

  let lastError: Error | null = null;
  let lastHttpStatus: number | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      lastHttpStatus = response.status;

      // Success
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          httpStatus: response.status,
          attempts: attempt + 1,
        };
      }

      // Retry on 5xx, 429, 408
      if (
        response.status >= 500 ||
        response.status === 429 ||
        response.status === 408
      ) {
        if (attempt < MAX_ATTEMPTS - 1) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Don't retry other 4xx errors
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        httpStatus: response.status,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        attempts: attempt + 1,
      };
    } catch (error: any) {
      lastError = error;

      // Network errors - retry
      if (
        error.name === 'AbortError' ||
        error.name === 'TypeError' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT'
      ) {
        if (attempt < MAX_ATTEMPTS - 1) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Other errors - don't retry
      return {
        success: false,
        error: error.message || String(error),
        attempts: attempt + 1,
      };
    }
  }

  // All retries exhausted
  return {
    success: false,
    httpStatus: lastHttpStatus,
    error: lastError?.message || 'Max retries exceeded',
    attempts: MAX_ATTEMPTS,
  };
}
