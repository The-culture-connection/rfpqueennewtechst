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
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        const cleanedValue = removeUndefinedValues(obj[key]);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
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
    const auditDoc: any = {
      requestId,
      timestamp,
      functionName: event.functionName,
      phase: event.phase || 'openai_request',
    };
    
    // Only add fields that are defined
    if (event.userId) auditDoc.userId = event.userId;
    if (event.route) auditDoc.route = event.route;
    if (event.model) auditDoc.model = event.model;
    if (event.messages) auditDoc.messages = sanitizeMessages(event.messages);
    if (event.input) auditDoc.input = sanitizeText(event.input);
    if (event.parameters) auditDoc.parameters = event.parameters;
    if (event.tool_calls) auditDoc.tool_calls = event.tool_calls;
    if (event.raw_response) auditDoc.raw_response = sanitizeText(event.raw_response);
    if (event.parsed_result) auditDoc.parsed_result = event.parsed_result;
    if (event.latency_ms !== undefined) auditDoc.latency_ms = event.latency_ms;
    if (event.token_usage) auditDoc.token_usage = event.token_usage;
    if (event.error) auditDoc.error = event.error;
    if (event.errorMessage) auditDoc.errorMessage = event.errorMessage;
    
    // Remove any remaining undefined values (safety check)
    const cleanedDoc = removeUndefinedValues(auditDoc);
    
    // Store in Firestore
    await db.collection('Ai api audit').doc(requestId).set(cleanedDoc);
    
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
