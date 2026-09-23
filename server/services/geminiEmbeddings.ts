import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { DocumentChunk } from './chunker.js';

/**
 * Gemini Embedding Service
 *
 * Implements official @google/genai SDK integration for RAG document chunk embedding.
 * - Model: gemini-embedding-2
 * - Output Dimensionality: 768
 * - Safe credential handling (never exposes API key)
 * - 1:1 chunk-to-embedding mapping
 * - Embedding reuse for unchanged chunks
 * - Exponential backoff on rate limits
 */

export const EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_DIMENSION = 768;

let aiClient: GoogleGenAI | null = null;

/**
 * Retrieves the configured Gemini API key without logging or exposing it.
 */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}

/**
 * Returns true if a valid Gemini API key is configured.
 */
export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length > 5);
}

/**
 * Obtains or creates the singleton GoogleGenAI client.
 */
function getAiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
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
 * Generates a 768-dimensional float embedding for a single text snippet.
 */
export async function generateEmbedding(text: string, retries = 3): Promise<number[]> {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  const ai = getAiClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: cleanText,
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });

      const values = response.embeddings?.[0]?.values;
      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini returned an empty or invalid embedding vector.');
      }

      if (values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Gemini returned embedding dimension ${values.length}, expected ${EMBEDDING_DIMENSION}.`
        );
      }

      return values;
    } catch (err: any) {
      const message = err?.message || 'Unknown error occurred while generating embedding.';
      const isRateLimit = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota');

      if (isRateLimit && attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw new Error(`Gemini embedding failed: ${sanitizeErrorMessage(message)}`);
    }
  }

  throw new Error('Gemini embedding failed after maximum retry attempts.');
}

export interface EmbeddingProgressStats {
  totalChunks: number;
  embeddedChunks: number;
  reusedChunks: number;
  apiRequests: number;
}

/**
 * Generates embeddings for an array of DocumentChunk objects.
 * - Reuses existing embeddings if chunk text, model, and dimension match.
 * - Maps 1:1 chunk to embedding in exact order.
 * - Employs batch embedding (up to 20 chunks per API call) to stay well within rate limits.
 */
export async function generateEmbeddingsForChunks(
  chunks: DocumentChunk[],
  onProgress?: (stats: EmbeddingProgressStats) => void
): Promise<DocumentChunk[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  const updatedChunks: DocumentChunk[] = new Array(chunks.length);
  const chunksToEmbed: { index: number; chunk: DocumentChunk }[] = [];

  let reusedCount = 0;

  // Check for reusable embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (
      chunk.embedding &&
      Array.isArray(chunk.embedding) &&
      chunk.embedding.length === EMBEDDING_DIMENSION &&
      chunk.embeddingModel === EMBEDDING_MODEL
    ) {
      updatedChunks[i] = chunk;
      reusedCount++;
    } else {
      chunksToEmbed.push({ index: i, chunk });
    }
  }

  if (chunksToEmbed.length === 0) {
    return updatedChunks;
  }

  const ai = getAiClient();
  let apiRequests = 0;
  let embeddedCount = 0;
  const BATCH_SIZE = 5; // 5 chunks per batch for safe token-per-minute limits

  for (let b = 0; b < chunksToEmbed.length; b += BATCH_SIZE) {
    const batch = chunksToEmbed.slice(b, b + BATCH_SIZE);
    const contentPayload = batch.map((item) => ({
      parts: [{ text: item.chunk.text }],
    }));

    let batchSuccess = false;
    const retries = 4;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: contentPayload,
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        });

        apiRequests++;
        const embeddings = response.embeddings;

        if (!embeddings || embeddings.length !== batch.length) {
          throw new Error(
            `Gemini returned ${embeddings?.length || 0} embeddings for batch of ${batch.length}.`
          );
        }

        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          const vector = embeddings[i]?.values;

          if (!vector || vector.length !== EMBEDDING_DIMENSION) {
            throw new Error(
              `Embedding vector at index ${i} has invalid dimension (${vector?.length || 0}).`
            );
          }

          const updated = {
            ...item.chunk,
            embedding: vector,
            embeddingModel: EMBEDDING_MODEL,
            embeddingDimension: EMBEDDING_DIMENSION,
          };
          updatedChunks[item.index] = updated;
          chunks[item.index] = updated;
          embeddedCount++;
        }

        batchSuccess = true;
        break;
      } catch (err: any) {
        const message = err?.message || 'Error occurred during batch embedding.';
        const isRateLimit = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota');

        if (isRateLimit && attempt < retries) {
          const backoffMs = attempt * 8000 + 2000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        throw new Error(`Gemini batch embedding failed: ${sanitizeErrorMessage(message)}`);
      }
    }

    if (!batchSuccess) {
      throw new Error('Gemini batch embedding failed after retries.');
    }

    if (onProgress) {
      onProgress({
        totalChunks: chunks.length,
        embeddedChunks: embeddedCount,
        reusedChunks: reusedCount,
        apiRequests,
      });
    }

    // Pacing delay between batch requests to respect Gemini free-tier rate limits
    if (b + BATCH_SIZE < chunksToEmbed.length) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  return updatedChunks;
}
