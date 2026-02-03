/**
 * Webhook signature generation and verification
 */

import * as crypto from 'crypto';

/**
 * Generate HMAC SHA256 signature for webhook payload
 */
export function signPayload(secret: string, rawBody: string | Buffer): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  secret: string,
  rawBody: string | Buffer,
  signature: string
): boolean {
  const expectedSignature = signPayload(secret, rawBody);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
