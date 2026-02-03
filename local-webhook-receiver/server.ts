/**
 * Local webhook receiver for testing
 * Run with: npm start
 * Then expose with: ngrok http 3000
 */

import express from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';

const app = express();
const PORT = 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-secret-change-me';

// Middleware to capture raw body for signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Toggle failure mode (for testing retries)
let shouldFail = false;
app.post('/toggle-fail', (req, res) => {
  shouldFail = !shouldFail;
  res.json({
    shouldFail,
    message: shouldFail
      ? 'Webhook will return 500 errors'
      : 'Webhook will return 200',
  });
});

// Webhook endpoint
app.post('/webhook', async (req: any, res) => {
  const timestamp = new Date().toISOString();
  const signature = req.headers['x-opportunilynk-signature'] as string;
  const eventType = req.headers['x-opportunilynk-event'] as string;
  const eventId = req.headers['x-opportunilynk-id'] as string;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Log request
  console.log(`\n[${timestamp}] Webhook received:`);
  console.log(`  Event Type: ${eventType}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  Idempotency Key: ${idempotencyKey}`);
  console.log(`  Headers:`, JSON.stringify(req.headers, null, 2));

  // Verify signature
  if (signature) {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
      )
    ) {
      console.error('  ❌ Signature verification FAILED');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    console.log('  ✅ Signature verified');
  } else {
    console.warn('  ⚠️  No signature provided');
  }

  // Log payload
  console.log(`  Payload:`, JSON.stringify(req.body, null, 2));

  // Save to log file
  const logEntry = {
    timestamp,
    eventType,
    eventId,
    idempotencyKey,
    headers: req.headers,
    payload: req.body,
  };

  const logFile = 'webhook-logs.jsonl';
  fs.appendFileSync(
    logFile,
    JSON.stringify(logEntry) + '\n',
    'utf-8'
  );

  // Simulate failure if toggle is on
  if (shouldFail) {
    console.log('  ❌ Simulating failure (toggle-fail is ON)');
    return res.status(500).json({
      error: 'Simulated failure',
      timestamp,
    });
  }

  // Success
  console.log('  ✅ Webhook processed successfully');
  res.status(200).json({
    received: true,
    eventId,
    timestamp,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local webhook receiver running on http://localhost:${PORT}`);
  console.log(`📝 Logs will be saved to webhook-logs.jsonl`);
  console.log(`\n📋 Next steps:`);
  console.log(`  1. Run: ngrok http ${PORT}`);
  console.log(`  2. Copy the ngrok URL (e.g., https://abc123.ngrok.io)`);
  console.log(`  3. Create integration in Firestore:`);
  console.log(`     - webhookUrl: https://abc123.ngrok.io/webhook`);
  console.log(`     - secret: ${WEBHOOK_SECRET}`);
  console.log(`     - enabledEvents: ["user.created", ...]`);
  console.log(`     - isActive: true`);
  console.log(`\n🔧 Test commands:`);
  console.log(`  - Toggle failures: POST http://localhost:${PORT}/toggle-fail`);
  console.log(`  - Health check: GET http://localhost:${PORT}/health`);
  console.log(`\n`);
});
