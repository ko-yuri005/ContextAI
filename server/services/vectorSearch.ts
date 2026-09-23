import { generateEmbedding, isGeminiConfigured, EMBEDDING_DIMENSION } from './geminiEmbeddings.js';
import { getEmbeddedChunks, EmbeddedChunkItem } from './database.js';

export interface SemanticSearchOptions {
  documentIds?: string[];
  topK?: number;
}

export interface SearchResultItem {
  chunkId: string;
  documentId: string;
  documentName: string;
  sectionTitle?: string;
  pageNumber?: number;
  text?: string;
  snippet: string;
  similarity: number;
}

export interface SemanticSearchResponse {
  query: string;
  results: SearchResultItem[];
}

/**
 * Calculates the cosine similarity between two numeric vectors.
 *
 * Mathematical definition:
 *   cos(theta) = (A . B) / (||A|| * ||B||)
 *
 * Safe handling:
 * - Empty or missing vectors return 0.
 * - Mismatched vector dimensions return 0.
 * - Zero-norm vectors (all zeros) return 0 without division-by-zero or NaN.
 * - Result is clamped to [-1.0, 1.0].
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
    return 0;
  }

  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];

    if (typeof valA !== 'number' || typeof valB !== 'number' || isNaN(valA) || isNaN(valB)) {
      return 0;
    }

    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA <= 0 || normB <= 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  if (isNaN(similarity)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Formats a clean, context-preserving snippet directly from stored chunk text.
 * Never generates or hallucinates text.
 */
function extractSnippet(chunk: EmbeddedChunkItem, maxLength = 280): string {
  if (chunk.snippet && chunk.snippet.trim().length > 0) {
    return chunk.snippet.length > maxLength
      ? chunk.snippet.slice(0, maxLength).trimEnd() + '...'
      : chunk.snippet;
  }

  const text = (chunk.text || '').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Performs semantic vector search over persisted document chunks in SQLite.
 *
 * Pipeline:
 * 1. Validates non-empty user query and options.
 * 2. Embeds query into a 768-dimensional vector using gemini-embedding-2.
 * 3. Retrieves candidate chunks from SQLite (filtered by documentIds if provided).
 * 4. Computes cosine similarity between query vector and each chunk vector.
 * 5. Sorts descending by similarity and returns top-K ranked results.
 */
export async function semanticSearch(
  query: string,
  options?: SemanticSearchOptions
): Promise<SemanticSearchResponse> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    throw new Error('Search query cannot be empty.');
  }

  if (!isGeminiConfigured()) {
    throw new Error('Gemini embedding service is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  // Validate and clamp topK between 1 and 20 (default: 5)
  const requestedTopK = typeof options?.topK === 'number' && !isNaN(options.topK) ? options.topK : 5;
  const topK = Math.max(1, Math.min(20, Math.floor(requestedTopK)));

  // 1. Generate 768-dimensional query vector using existing Gemini embedding service
  const queryVector = await generateEmbedding(cleanQuery);
  if (!queryVector || queryVector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Failed to generate query embedding: received dimension ${queryVector?.length ?? 0}, expected ${EMBEDDING_DIMENSION}.`
    );
  }

  // 2. Retrieve embedded chunks from SQLite
  const candidateChunks = getEmbeddedChunks(options?.documentIds);
  if (candidateChunks.length === 0) {
    return {
      query: cleanQuery,
      results: [],
    };
  }

  // 3. Compute cosine similarity for each chunk
  const scoredItems: { chunk: EmbeddedChunkItem; similarity: number }[] = [];

  for (const chunk of candidateChunks) {
    // Safely verify vector dimensions match
    if (!chunk.embedding || chunk.embedding.length !== EMBEDDING_DIMENSION) {
      continue;
    }

    const similarity = cosineSimilarity(queryVector, chunk.embedding);
    scoredItems.push({ chunk, similarity });
  }

  // 4. Sort descending by similarity
  scoredItems.sort((a, b) => b.similarity - a.similarity);

  // 5. Select top-K chunks and format response (omitting raw embedding vectors)
  const topResults = scoredItems.slice(0, topK).map(({ chunk, similarity }) => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    sectionTitle: chunk.sectionTitle || undefined,
    pageNumber: chunk.pageNumber,
    text: chunk.text,
    snippet: extractSnippet(chunk),
    similarity: Math.round(similarity * 10000) / 10000,
  }));

  return {
    query: cleanQuery,
    results: topResults,
  };
}
