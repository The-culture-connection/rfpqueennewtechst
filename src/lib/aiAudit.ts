// AI API Audit Logger
// Logs all OpenAI API calls to Firestore for auditing

import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export interface AIAuditEvent {
  requestId: string;
  timestamp: string;
  userId?: string;
  route?: string;
  functionName: string;
  phase: 'prompt_build' | 'openai_request' | 'openai_response' | 'post_process' | 'final_response' | 'error';
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  input?: string; // Sanitized input text
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: any;
  };
  tool_calls?: any[];
  raw_response?: string;
  parsed_result?: any;
  latency_ms?: number;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string;
  errorMessage?: string;
}

/**
 * Sanitize sensitive data from text
 * Removes emails, phone numbers, and other PII
 */
function sanitizeText(text: string): string {
  if (!text) return text;
  
  let sanitized = text;
  
  // Remove email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(/\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(/\b\d{10}\b/g, '[PHONE_REDACTED]');
  
  // Remove potential API keys (sk- prefix)
  sanitized = sanitized.replace(/\bsk-[A-Za-z0-9]{20,}\b/g, '[API_KEY_REDACTED]');
  
  // Truncate very long text (keep first 50k chars for audit, rest truncated)
  if (sanitized.length > 50000) {
    sanitized = sanitized.substring(0, 50000) + '\n...[TRUNCATED]';
  }
  
  return sanitized;
}

/**
 * Sanitize messages array
 */
function sanitizeMessages(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  return messages.map(msg => ({
    role: msg.role,
    content: sanitizeText(msg.content),
  }));
}

/**
 * Log AI API audit event to Firestore
 */
export async function logAIAuditEvent(event: Partial<AIAuditEvent>): Promise<void> {
  try {
    // Check if audit is enabled (default: true in dev, can be controlled via env var)
    const auditEnabled = process.env.AI_AUDIT !== 'false';
    const sampleRate = parseFloat(process.env.AI_AUDIT_SAMPLE_RATE || '1.0');
    
    // In production, respect sample rate
    if (process.env.NODE_ENV === 'production' && Math.random() > sampleRate) {
      return; // Skip this audit event based on sample rate
    }
    
    if (!auditEnabled) {
      return;
    }
    
    const db = getAdminFirestore();
    const requestId = event.requestId || uuidv4();
    const timestamp = event.timestamp || new Date().toISOString();
    
    // Prepare audit document
    const auditDoc: AIAuditEvent = {
      requestId,
      timestamp,
      userId: event.userId,
      route: event.route,
      functionName: event.functionName,
      phase: event.phase || 'openai_request',
      model: event.model,
      messages: event.messages ? sanitizeMessages(event.messages) : undefined,
      input: event.input ? sanitizeText(event.input) : undefined,
      parameters: event.parameters,
      tool_calls: event.tool_calls,
      raw_response: event.raw_response ? sanitizeText(event.raw_response) : undefined,
      parsed_result: event.parsed_result,
      latency_ms: event.latency_ms,
      token_usage: event.token_usage,
      error: event.error,
      errorMessage: event.errorMessage,
    };
    
    // Store in Firestore
    await db.collection('Ai api audit').doc(requestId).set(auditDoc);
    
    console.log(`📊 [AI Audit] Logged ${event.phase} event: ${requestId}`);
  } catch (error: any) {
    // Don't fail the main operation if audit logging fails
    console.error('❌ [AI Audit] Failed to log audit event:', error.message);
  }
}

/**
 * Create a request ID for tracking an entire AI operation
 */
export function createAuditRequestId(): string {
  return uuidv4();
}
