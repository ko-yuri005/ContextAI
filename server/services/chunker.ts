/**
 * ContextAI RAG-Ready Document Chunker
 *
 * Implements deterministic, sentence-boundary and section-aware document chunking.
 * - Target chunk size: 500–800 tokens
 * - Overlap between adjacent chunks in large sections: 50–100 tokens
 * - Sentence-boundary preservation (no splitting mid-sentence)
 * - Section & page context enrichment ("SectionTitle — Text")
 * - Deterministic chunk IDs: ${documentId}-chunk-${index + 1}
 * - Zero empty chunks
 */

export interface ChunkInputSection {
  pageNumber?: number;
  title?: string;
  content: string;
}

export interface DocumentForChunking {
  id: string;
  name?: string;
  pages?: ChunkInputSection[];
  text?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
  embedding?: number[] | null;
  embeddingModel?: string | null;
  embeddingDimension?: number | null;
  // UI backwards-compatibility aliases
  pageOrSlideNumber?: number;
  snippet?: string;
}

// Target bounds for RAG-friendly chunks
export const CHUNK_TARGETS = {
  MIN_TOKENS: 500,
  MAX_TOKENS: 800,
  MIN_OVERLAP_TOKENS: 50,
  MAX_OVERLAP_TOKENS: 100,
  TARGET_OVERLAP_TOKENS: 75,
};

/**
 * Fast deterministic token estimation heuristic.
 *
 * Approximates token count as: Math.ceil(wordCount * 1.3)
 * NOTE: This is a fast, deterministic heuristic approximation (not a full BPE tokenizer),
 * matching standard English text token ratios without heavy runtime dependencies.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const words = trimmed.split(/\s+/);
  return Math.ceil(words.length * 1.3);
}

/**
 * Splits text cleanly into sentences using punctuation boundaries and paragraph structure.
 * Avoids splitting numbers, abbreviations, or mid-sentence decimals where possible.
 */
export function splitTextIntoSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Split by double newline into paragraphs
  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const sentences: string[] = [];

  for (const para of paragraphs) {
    // If the paragraph is a bullet list or code block, treat each line as a sentence unit
    if (/^[\*\-•\d+\.]\s/m.test(para)) {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      sentences.push(...lines);
      continue;
    }

    // Split at sentence end (.!?) followed by whitespace and an uppercase letter, quote, or bracket
    const parts = para
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘(\[])/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      sentences.push(...parts);
    } else if (para) {
      sentences.push(para);
    }
  }

  // Handle sentences that might themselves be too long (> MAX_TOKENS)
  const safeSentences: string[] = [];
  for (const sentence of sentences) {
    if (estimateTokenCount(sentence) > CHUNK_TARGETS.MAX_TOKENS) {
      safeSentences.push(...splitLongSentence(sentence, CHUNK_TARGETS.MAX_TOKENS));
    } else {
      safeSentences.push(sentence);
    }
  }

  return safeSentences;
}

/**
 * Subdivides an unusually long sentence (e.g. continuous run-on or unpunctuated block)
 * by commas, semicolons, or words to fit within maxTokens.
 */
function splitLongSentence(sentence: string, maxTokens: number): string[] {
  const clauses = sentence.split(/(?<=[;:,])\s+/).map((c) => c.trim()).filter(Boolean);
  const result: string[] = [];
  let current = '';

  for (const clause of clauses) {
    if (estimateTokenCount(clause) > maxTokens) {
      // Clause is still too large, split by words
      const words = clause.split(/\s+/);
      let wordChunk: string[] = [];
      for (const w of words) {
        wordChunk.push(w);
        if (estimateTokenCount(wordChunk.join(' ')) >= maxTokens - 100) {
          result.push(wordChunk.join(' '));
          wordChunk = [];
        }
      }
      if (wordChunk.length > 0) {
        result.push(wordChunk.join(' '));
      }
    } else {
      const combined = current ? `${current} ${clause}` : clause;
      if (estimateTokenCount(combined) > maxTokens && current) {
        result.push(current);
        current = clause;
      } else {
        current = combined;
      }
    }
  }

  if (current) {
    result.push(current);
  }

  return result.filter(Boolean);
}

/**
 * Determines a clean contextual prefix from section title.
 * Formats as: "SectionTitle — " if meaningful and not already at start of text.
 */
function getContextPrefix(title?: string, textSample?: string): string {
  if (!title) return '';
  const cleanTitle = title.trim();
  if (!cleanTitle) return '';

  // Avoid redundant prefixes if section text already starts with the title
  if (textSample) {
    const cleanSample = textSample.trim();
    if (
      cleanSample.toLowerCase().startsWith(cleanTitle.toLowerCase()) ||
      cleanSample.toLowerCase().startsWith(`## ${cleanTitle.toLowerCase()}`)
    ) {
      return '';
    }
  }

  return `${cleanTitle} — `;
}

interface RawChunk {
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
}

/**
 * Chunks a single section or page of a document.
 */
function chunkSection(section: ChunkInputSection): RawChunk[] {
  const content = (section.content || '').trim();
  if (!content) return [];

  const pageNumber = section.pageNumber || 1;
  const sectionTitle = section.title?.trim();
  const prefix = getContextPrefix(sectionTitle, content);
  const prefixTokens = estimateTokenCount(prefix);

  const totalContentTokens = estimateTokenCount(content);

  // If the entire section fits within the max target size, keep it together as 1 chunk
  if (totalContentTokens + prefixTokens <= CHUNK_TARGETS.MAX_TOKENS) {
    const fullText = prefix ? `${prefix}${content}` : content;
    return [
      {
        text: fullText,
        pageNumber,
        sectionTitle,
        tokenCount: estimateTokenCount(fullText),
      },
    ];
  }

  // Section exceeds max target tokens: split into sentences and apply chunking with overlap
  const sentences = splitTextIntoSentences(content);
  if (sentences.length === 0) return [];

  const chunks: RawChunk[] = [];
  let currentSentences: string[] = [];
  let currentTokens = prefixTokens;
  let lastChunkOverlapSentences: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokenCount(sentence);

    const willExceedMax = currentTokens + sentenceTokens > CHUNK_TARGETS.MAX_TOKENS;
    const hasReachedMin = currentTokens >= CHUNK_TARGETS.MIN_TOKENS;

    // Finalize current chunk if it has reached min tokens and adding the sentence would exceed max,
    // or if the chunk cannot take this sentence without blowing past max
    if (currentSentences.length > 0 && (willExceedMax && (hasReachedMin || currentTokens + sentenceTokens > CHUNK_TARGETS.MAX_TOKENS + 100))) {
      // Build finalized chunk text
      const bodyText = currentSentences.join(' ');
      const fullText = prefix ? `${prefix}${bodyText}` : bodyText;

      chunks.push({
        text: fullText,
        pageNumber,
        sectionTitle,
        tokenCount: estimateTokenCount(fullText),
      });

      // Calculate overlap sentences for the next chunk (50–100 tokens from the tail)
      const overlap: string[] = [];
      let overlapTokens = 0;
      for (let j = currentSentences.length - 1; j >= 0; j--) {
        const s = currentSentences[j];
        const sTokens = estimateTokenCount(s);
        if (overlapTokens + sTokens <= CHUNK_TARGETS.MAX_OVERLAP_TOKENS || overlap.length === 0) {
          overlap.unshift(s);
          overlapTokens += sTokens;
          if (overlapTokens >= CHUNK_TARGETS.MIN_OVERLAP_TOKENS) {
            break;
          }
        } else {
          break;
        }
      }

      lastChunkOverlapSentences = [...overlap];
      currentSentences = [...overlap];
      currentTokens = prefixTokens + overlapTokens;
    }

    currentSentences.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Handle leftover sentences
  if (currentSentences.length > 0) {
    // Check if currentSentences are ONLY the overlap from the previous chunk
    const isOnlyOverlap =
      chunks.length > 0 &&
      currentSentences.length === lastChunkOverlapSentences.length &&
      currentSentences.every((s, idx) => s === lastChunkOverlapSentences[idx]);

    if (!isOnlyOverlap) {
      const leftoverBody = currentSentences.join(' ');
      const leftoverFull = prefix ? `${prefix}${leftoverBody}` : leftoverBody;
      const leftoverTokens = estimateTokenCount(leftoverFull);

      // If leftover is small and fits into previous chunk without exceeding MAX_TOKENS, merge it
      if (chunks.length > 0 && chunks[chunks.length - 1].tokenCount + leftoverTokens <= CHUNK_TARGETS.MAX_TOKENS) {
        const prev = chunks[chunks.length - 1];
        // Deduplicate overlap when appending
        const newBodySentences = currentSentences.filter((s) => !lastChunkOverlapSentences.includes(s));
        if (newBodySentences.length > 0) {
          const appendedText = `${prev.text} ${newBodySentences.join(' ')}`;
          prev.text = appendedText;
          prev.tokenCount = estimateTokenCount(appendedText);
        }
      } else {
        chunks.push({
          text: leftoverFull,
          pageNumber,
          sectionTitle,
          tokenCount: leftoverTokens,
        });
      }
    }
  }

  return chunks;
}

/**
 * Main chunking entrypoint.
 * Transforms an extracted document into clean, retrieval-friendly, RAG-ready chunks.
 */
export function chunkDocument(doc: DocumentForChunking): DocumentChunk[] {
  if (!doc) return [];

  const rawChunks: RawChunk[] = [];

  // Determine sections: prefer structured pages/sections, fallback to full text
  const sections: ChunkInputSection[] =
    doc.pages && doc.pages.length > 0
      ? doc.pages
      : [
          {
            pageNumber: 1,
            title: doc.name || 'Main Content',
            content: doc.text || '',
          },
        ];

  for (const section of sections) {
    const sectionChunks = chunkSection(section);
    rawChunks.push(...sectionChunks);
  }

  // Filter out any accidental empty chunks and map to deterministic final chunks
  const validChunks = rawChunks.filter((c) => c.text && c.text.trim().length > 0);

  return validChunks.map((c, index) => {
    const chunkId = `${doc.id}-chunk-${index + 1}`;
    const cleanText = c.text.trim();

    return {
      id: chunkId,
      documentId: doc.id,
      text: cleanText,
      pageNumber: c.pageNumber,
      sectionTitle: c.sectionTitle,
      tokenCount: c.tokenCount,
      // Compatibility aliases
      pageOrSlideNumber: c.pageNumber || 1,
      snippet: cleanText.length > 200 ? cleanText.substring(0, 197).trim() + '...' : cleanText,
    };
  });
}
