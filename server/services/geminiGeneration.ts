import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, isGeminiConfigured } from './geminiEmbeddings.js';
import { SearchResultItem } from './vectorSearch.js';

export const GENERATION_MODEL = 'gemini-3.5-flash-lite';

export const QUOTA_EXCEEDED_USER_MESSAGE =
  'AI generation is temporarily unavailable because the Gemini API request limit has been reached. Please try again later.';

/**
 * Checks if an error represents a quota exhaustion (HTTP 429 / RESOURCE_EXHAUSTED).
 */
export function isQuotaExceededError(err: any): boolean {
  const message = String(err?.message || '');
  const status = err?.status || err?.statusCode || err?.code;
  return (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Quota exceeded') ||
    message.includes('free_tier_requests') ||
    message.includes('requests/day') ||
    message.includes('limit: 20') ||
    message.includes('quota metric')
  );
}

/**
 * Dedicated error class for Gemini quota exhaustion.
 */
export class GeminiQuotaExceededError extends Error {
  statusCode: number;
  code: string;

  constructor(message = QUOTA_EXCEEDED_USER_MESSAGE) {
    super(message);
    this.name = 'GeminiQuotaExceededError';
    this.statusCode = 429;
    this.code = 'RESOURCE_EXHAUSTED';
  }
}

let genAiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({ apiKey });
  }
  return genAiClient;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GroundedCitation {
  id: number;
  documentId: string;
  documentName: string;
  chunkId: string;
  sectionTitle?: string;
  pageNumber: number;
  snippet: string;
}

export interface GroundedAnswerResult {
  query: string;
  retrievalQuery: string;
  answer: string;
  citations: GroundedCitation[];
}

export interface GenerateGroundedAnswerOptions {
  query: string;
  retrievalQuery?: string;
  chunks: SearchResultItem[];
  conversation?: ConversationMessage[];
}

/**
 * Strips any potential credential leaks from error messages.
 */
function sanitizeErrorMessage(message: string): string {
  const apiKey = getGeminiApiKey();
  let sanitized = message;
  if (apiKey) {
    sanitized = sanitized.split(apiKey).join('[REDACTED_API_KEY]');
  }
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  return sanitized;
}

/**
 * Executes a Gemini generateContent request with retry and exponential backoff
 * for transient errors (503 High Demand / UNAVAILABLE, 429 Rate Limits).
 */
async function callGenerateContentWithRetry(
  prompt: string,
  temperature = 0.2,
  retries = 3
): Promise<string> {
  const ai = getClient();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GENERATION_MODEL,
        contents: prompt,
        config: {
          temperature,
        },
      });
      return response.text || '';
    } catch (err: any) {
      const message = err?.message || '';

      // Do NOT retry daily / tiered quota exhaustion errors
      if (isQuotaExceededError(err)) {
        console.warn(`[Gemini Generation] Quota exceeded: ${sanitizeErrorMessage(message)}`);
        throw new GeminiQuotaExceededError();
      }

      const isTransient =
        message.includes('503') ||
        message.includes('UNAVAILABLE') ||
        message.includes('high demand') ||
        message.includes('overloaded');

      if (isTransient && attempt < retries) {
        const backoffMs = attempt * 2500 + Math.floor(Math.random() * 500);
        console.warn(
          `[Gemini Generation] Transient error (${sanitizeErrorMessage(message)}), retrying in ${backoffMs}ms (attempt ${attempt}/${retries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini generation failed after maximum retry attempts.');
}

/**
 * Uses recent conversation context to reformulate ambiguous follow-up questions
 * into a standalone semantic retrieval query.
 *
 * Example:
 *   User: "What is machine learning?"
 *   User: "What are its main types?"
 *   -> Reformulated: "What are the main types of machine learning?"
 */
export async function rewriteQueryWithContext(
  query: string,
  conversation?: ConversationMessage[]
): Promise<string> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return cleanQuery;

  if (!conversation || conversation.length === 0) {
    return cleanQuery;
  }

  // Use up to the last 6 messages
  const recentHistory = conversation.slice(-6);
  if (recentHistory.length === 0) {
    return cleanQuery;
  }

  // Heuristic check: does the query contain ambiguous pronouns or references?
  const hasAmbiguousReference = /\b(it|its|they|them|their|these|those|this|that|he|she|him|her|former|latter|which|such|also)\b/i.test(cleanQuery)
    || cleanQuery.split(/\s+/).length <= 4;

  if (!hasAmbiguousReference && recentHistory.length <= 1) {
    return cleanQuery;
  }

  if (!isGeminiConfigured()) {
    return cleanQuery;
  }

  try {
    const historyText = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `You are a search query reformulation assistant for a retrieval-augmented generation (RAG) system.
Given the recent conversation history and a user follow-up query, reformulate the query into a single, standalone search query that contains all necessary entities and context from the conversation so that it can be searched in a vector database independently.

Rules:
- Resolve all pronouns (it, its, they, their, these, those, this) and ambiguous references using the prior messages.
- If the query is already self-contained and clear, output the original query verbatim.
- Output ONLY the plain text search query. Do NOT output quotes, markdown formatting, explanations, or commentary.

Conversation History:
${historyText}

User Query:
${cleanQuery}

Standalone Search Query:`;

    const text = await callGenerateContentWithRetry(prompt, 0.1, 3);
    const rewritten = (text || '').trim().replace(/^["']|["']$/g, '');
    if (rewritten && rewritten.length > 0) {
      return rewritten;
    }
  } catch (err: any) {
    console.warn(`[Query Rewriter] Failed to rewrite query: ${sanitizeErrorMessage(err.message || '')}`);
  }

  return cleanQuery;
}

/**
 * Generates a grounded answer based strictly on retrieved document chunks.
 * Enforces citation mapping: only returns citations corresponding to explicit,
 * valid [N] markers in the generated answer.
 */
export async function generateGroundedAnswer(
  options: GenerateGroundedAnswerOptions
): Promise<GroundedAnswerResult> {
  const { query, chunks, conversation } = options;
  const retrievalQuery = options.retrievalQuery || query;

  if (!isGeminiConfigured()) {
    throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  // If no chunks were retrieved at all, return grounded insufficient context response
  if (!chunks || chunks.length === 0) {
    return {
      query,
      retrievalQuery,
      answer: 'The available sources do not contain enough information to answer this question.',
      citations: [],
    };
  }

  // Format retrieved chunks into structured numbered source blocks
  const sourceBlocks = chunks
    .map((chunk, index) => {
      const sourceId = index + 1;
      const content = (chunk.text || chunk.snippet || '').trim();
      return `SOURCE [${sourceId}]
Document: ${chunk.documentName}
Section: ${chunk.sectionTitle || 'General'}
Page: ${chunk.pageNumber ?? 1}
Chunk ID: ${chunk.chunkId}
Content:
${content}`;
    })
    .join('\n\n');

  // Format recent conversation context if present (up to last 4 messages for grounding context)
  let conversationSection = '';
  if (conversation && conversation.length > 0) {
    const recent = conversation.slice(-4);
    conversationSection = `\nRECENT CONVERSATION HISTORY:\n` +
      recent.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') +
      '\n';
  }

  const prompt = `You are ContextAI, a strictly grounded document question-answering assistant.

CRITICAL INSTRUCTIONS:
1. Answer the user's question using ONLY the factual information provided in the numbered SOURCE blocks below.
2. DO NOT assume, extrapolate, or use outside/general world knowledge that is not directly supported by the provided sources.
3. If the provided sources do not contain sufficient information to answer the question, you MUST explicitly state that the available sources do not contain enough information to answer. Do not attempt to guess or use general training knowledge.
4. Whenever you make a factual claim or statement, you MUST cite the source that supports it using bracketed numbers like [1], [2] immediately following the statement.
5. Only use citation numbers that correspond to the provided SOURCE [N] blocks (from [1] to [${chunks.length}]). DO NOT invent citation numbers, document names, sections, or page numbers. DO NOT copy or output Wikipedia bracketed reference marks (such as [12], [419], [ab]) that appear inside the source text.
6. DO NOT mention similarity scores, vector distances, or internal chunk IDs to the user.
7. Keep the answer clear, objective, and well-structured.
${conversationSection}
AVAILABLE SOURCES:
${sourceBlocks}

USER QUESTION:
${query}

GROUNDED ANSWER (with [N] citations):`;

  try {
    const text = await callGenerateContentWithRetry(prompt, 0.2, 3);
    const rawAnswer = (text || '').trim();

    // Scan the generated answer for explicit [N] citation markers
    const citationRegex = /\[(\d+)\]/g;
    const matches: number[] = [];
    let match;
    while ((match = citationRegex.exec(rawAnswer)) !== null) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id) && !matches.includes(id)) {
        matches.push(id);
      }
    }

    // Map only explicit, valid [N] citation markers back to retrieved chunks
    const citations: GroundedCitation[] = [];
    for (const id of matches) {
      const chunkIndex = id - 1;
      if (chunkIndex >= 0 && chunkIndex < chunks.length) {
        const chunk = chunks[chunkIndex];
        citations.push({
          id,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          chunkId: chunk.chunkId,
          sectionTitle: chunk.sectionTitle || undefined,
          pageNumber: chunk.pageNumber ?? 1,
          snippet: chunk.snippet,
        });
      }
    }

    // Sort citations by ID ascending
    citations.sort((a, b) => a.id - b.id);

    return {
      query,
      retrievalQuery,
      answer: rawAnswer,
      citations,
    };
  } catch (err: any) {
    if (err instanceof GeminiQuotaExceededError || isQuotaExceededError(err)) {
      throw err instanceof GeminiQuotaExceededError ? err : new GeminiQuotaExceededError();
    }
    const message = err?.message || 'Unknown error occurred while generating grounded answer.';
    throw new Error(`Gemini generation failed: ${sanitizeErrorMessage(message)}`);
  }
}
