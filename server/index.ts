import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { extractFromWebsite } from './services/websiteExtractor.js';
import { extractFromPdf, extractFromPlainText } from './services/documentExtractor.js';
import {
  insertDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  deleteDocumentsBulk,
  updateDocumentStatusAndChunks,
} from './services/database.js';
import { chunkDocument } from './services/chunker.js';
import {
  isGeminiConfigured,
  generateEmbeddingsForChunks,
} from './services/geminiEmbeddings.js';
import { semanticSearch } from './services/vectorSearch.js';
import {
  generateGroundedAnswer,
  rewriteQueryWithContext,
  ConversationMessage,
  GeminiQuotaExceededError,
  isQuotaExceededError,
  QUOTA_EXCEEDED_USER_MESSAGE,
} from './services/geminiGeneration.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Setup multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ContextAI Ingestion Service',
    database: 'SQLite (WAL mode)',
    embedding: isGeminiConfigured() ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/documents
 * Returns all persisted documents from SQLite database.
 */
app.get('/api/documents', (_req, res) => {
  try {
    const documents = getAllDocuments();
    res.json(documents);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve persisted documents from database.' });
  }
});

/**
 * GET /api/documents/:id
 * Returns a single persisted document by its ID.
 */
app.get('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const document = getDocumentById(id);
    if (!document) {
      res.status(404).json({ error: `Document with ID "${id}" was not found.` });
      return;
    }
    res.json(document);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve document from database.' });
  }
});

/**
 * DELETE /api/documents/bulk
 * Bulk deletes documents by their IDs from SQLite database.
 * This route must be registered before /api/documents/:id so Express does not
 * interpret "bulk" as a document ID.
 */
app.delete('/api/documents/bulk', (req, res) => {
  try {
    const body: unknown = req.body;
    if (!body || typeof body !== 'object' || !('documentIds' in body)) {
      res.status(400).json({ error: 'documentIds must be a non-empty array of string IDs.' });
      return;
    }

    const { documentIds } = body;
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ error: 'documentIds must be a non-empty array of string IDs.' });
      return;
    }
    if (!documentIds.every((id): id is string => typeof id === 'string' && id.trim().length > 0)) {
      res.status(400).json({ error: 'All documentIds must be non-empty strings.' });
      return;
    }

    const normalizedIds = documentIds.map((id) => id.trim());
    console.info(`[BULK DELETE] Request received for ${normalizedIds.length} document(s).`);
    const deletedIds = deleteDocumentsBulk(normalizedIds);
    console.info(`[BULK DELETE] Transaction committed; deleted ${deletedIds.length} document(s).`);
    res.json({ success: true, deletedIds, message: `Successfully deleted ${deletedIds.length} documents.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to bulk delete documents from database.';
    console.error('[BULK DELETE] Transaction failed:', err);
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes a document by ID from SQLite database.
 */
app.delete('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteDocument(id);
    if (!deleted) {
      res.status(404).json({ error: `Document with ID "${id}" was not found.` });
      return;
    }
    res.json({ success: true, id, message: 'Document successfully deleted.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete document from database.';
    res.status(500).json({ error: message });
  }
});

/**
 * Track in-progress background indexing jobs to prevent duplicate jobs.
 */
const activeIndexingJobs = new Set<string>();

/**
 * POST /api/websites/ingest
 * Ingests a public website URL, extracts readable text and chunks, immediately persists with
 * status 'processing', responds to the client promptly (~1-2s), and completes Gemini embeddings
 * asynchronously in the background.
 */
app.post('/api/websites/ingest', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Please provide a valid website URL.' });
      return;
    }

    const extracted = await extractFromWebsite(url.trim());
    extracted.chunks = chunkDocument(extracted);
    extracted.status = isGeminiConfigured() ? 'processing' : 'ready';
    const persisted = insertDocument(extracted);

    // Promptly send HTTP 200 response with processing document so UI never hangs
    res.json(persisted);

    // If Gemini embeddings are configured, kick off in-process background embedding
    if (isGeminiConfigured() && !activeIndexingJobs.has(persisted.id)) {
      activeIndexingJobs.add(persisted.id);
      (async () => {
        try {
          console.log(`[WEBSITE INDEXING] Starting background embedding for "${persisted.name}" (${persisted.id}, ${extracted.chunks?.length || 0} chunks)...`);
          const embeddedChunks = await generateEmbeddingsForChunks(extracted.chunks || []);
          // Verify document still exists before updating status
          const doc = getDocumentById(persisted.id);
          if (!doc) {
            console.warn(`[WEBSITE INDEXING] Document ${persisted.id} was deleted before embedding finished. Skipping status update.`);
          } else {
            updateDocumentStatusAndChunks(persisted.id, 'ready', embeddedChunks);
            console.log(`[WEBSITE INDEXING] Successfully completed embedding for "${persisted.name}" (${persisted.id}). Status set to 'ready'.`);
          }
        } catch (err: any) {
          console.error(`[WEBSITE INDEXING ERROR] Failed to embed chunks for "${persisted.name}" (${persisted.id}):`, err);
          if (getDocumentById(persisted.id)) {
            updateDocumentStatusAndChunks(persisted.id, 'failed');
          } else {
            console.warn(`[WEBSITE INDEXING] Document ${persisted.id} was deleted before failure status update. Skipping update.`);
          }
        } finally {
          activeIndexingJobs.delete(persisted.id);
        }
      })();
    }
  } catch (err: any) {
    const message = err.message || 'Failed to ingest website.';
    const statusCode =
      message.includes('restricted') || message.includes('Invalid URL') || message.includes('protocol')
        ? 400
        : 502;

    res.status(statusCode).json({ error: message });
  }
});

/**
 * POST /api/documents/upload
 * Uploads a document (PDF, TXT, MD), extracts real text content, generates RAG chunks & embeddings, persists in SQLite, and returns the document.
 */
app.post(
  '/api/documents/upload',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('[UPLOAD ERROR] File reception failed in multer middleware:');
        console.error(`[UPLOAD ERROR] Name: ${err.name || 'Error'}`);
        console.error(`[UPLOAD ERROR] Message: ${err.message || 'Unknown error'}`);
        if ((err as any).code) {
          console.error(`[UPLOAD ERROR] Code: ${(err as any).code}`);
        }
        if (err.stack) {
          console.error(`[UPLOAD ERROR] Stack: ${err.stack}`);
        }
        res.status(500).json({
          error: `Upload failed during file reception: ${err.message}`,
          stage: 'reception',
          name: err.name,
          code: (err as any).code,
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    let currentStage = 'reception';
    try {
      const file = req.file;
      if (!file) {
        console.error('[UPLOAD ERROR] No file attached in request');
        res.status(400).json({ error: 'No file uploaded. Please select a file.', stage: 'reception' });
        return;
      }

      console.log(`[UPLOAD] received file: ${file.originalname}`);
      console.log(`[UPLOAD] file size: ${file.size} bytes (${(file.size / 1024).toFixed(1)} KB / ${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      console.log(`[UPLOAD] MIME type: ${file.mimetype}`);

      const filename = file.originalname.toLowerCase();
      const isPdf = filename.endsWith('.pdf') || file.mimetype === 'application/pdf';
      const isText = filename.endsWith('.txt') || filename.endsWith('.md') || file.mimetype.startsWith('text/');

      if (isPdf) {
        currentStage = 'extraction';
        console.log(`[UPLOAD] extraction started (PDF: ${file.originalname})`);
        const extracted = await extractFromPdf(file.buffer, file.originalname);
        console.log(`[UPLOAD] extraction completed: ${extracted.pages.length} pages/sections, summary length: ${extracted.summary.length}`);
        console.log(`[UPLOAD] extracted text length: ${extracted.text?.length || 0} characters`);

        currentStage = 'chunking';
        console.log(`[UPLOAD] chunking started`);
        extracted.chunks = chunkDocument(extracted);
        console.log(`[UPLOAD] chunking completed`);
        console.log(`[UPLOAD] chunk count: ${extracted.chunks.length}`);

        currentStage = 'embedding';
        if (isGeminiConfigured()) {
          console.log(`[UPLOAD] embedding started for ${extracted.chunks.length} chunks`);
          extracted.chunks = await generateEmbeddingsForChunks(extracted.chunks, (stats) => {
            console.log(`[UPLOAD] embedding progress: ${stats.embeddedChunks + stats.reusedChunks}/${stats.totalChunks} chunks`);
          });
          console.log(`[UPLOAD] embedding completed`);
        } else {
          console.log(`[UPLOAD] embedding skipped: Gemini not configured`);
        }

        currentStage = 'database persistence';
        console.log(`[UPLOAD] database persistence started: document id "${extracted.id}"`);
        const persisted = insertDocument(extracted);
        console.log(`[UPLOAD] database persistence completed`);

        currentStage = 'response';
        res.json(persisted);
        console.log(`[UPLOAD] response sent (HTTP 200, document id: "${persisted.id}")`);
        return;
      }

      if (isText) {
        currentStage = 'extraction';
        console.log(`[UPLOAD] extraction started (Text: ${file.originalname})`);
        const extracted = extractFromPlainText(file.buffer, file.originalname);
        console.log(`[UPLOAD] extraction completed: ${extracted.pages.length} sections`);
        console.log(`[UPLOAD] extracted text length: ${extracted.text?.length || 0} characters`);

        currentStage = 'chunking';
        console.log(`[UPLOAD] chunking started`);
        extracted.chunks = chunkDocument(extracted);
        console.log(`[UPLOAD] chunking completed`);
        console.log(`[UPLOAD] chunk count: ${extracted.chunks.length}`);

        currentStage = 'embedding';
        if (isGeminiConfigured()) {
          console.log(`[UPLOAD] embedding started for ${extracted.chunks.length} chunks`);
          extracted.chunks = await generateEmbeddingsForChunks(extracted.chunks);
          console.log(`[UPLOAD] embedding completed`);
        } else {
          console.log(`[UPLOAD] embedding skipped: Gemini not configured`);
        }

        currentStage = 'database persistence';
        console.log(`[UPLOAD] database persistence started: document id "${extracted.id}"`);
        const persisted = insertDocument(extracted);
        console.log(`[UPLOAD] database persistence completed`);

        currentStage = 'response';
        res.json(persisted);
        console.log(`[UPLOAD] response sent (HTTP 200, document id: "${persisted.id}")`);
        return;
      }

      res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF or text/markdown document (.pdf, .txt, .md).',
        stage: 'reception',
      });
    } catch (err: any) {
      console.error(`[UPLOAD ERROR] Failure during stage: "${currentStage}"`);
      console.error(`[UPLOAD ERROR] Name: ${err?.name || 'Error'}`);
      console.error(`[UPLOAD ERROR] Message: ${err?.message || 'Unknown error'}`);
      if (err?.code) {
        console.error(`[UPLOAD ERROR] Code: ${err.code}`);
      }
      if (err?.stack) {
        console.error(`[UPLOAD ERROR] Stack: ${err.stack}`);
      }
      res.status(500).json({
        error: `Upload failed during ${currentStage}: ${err?.message || 'Failed to process and extract text from document.'}`,
        stage: currentStage,
        name: err?.name,
        code: err?.code,
      });
    }
  }
);

/**
 * POST /api/documents/:id/embed
 * Generates or updates Gemini embeddings for all chunks in an existing persisted document.
 */
app.post('/api/documents/:id/embed', async (req, res) => {
  try {
    const { id } = req.params;
    const document = getDocumentById(id);
    if (!document) {
      res.status(404).json({ error: `Document with ID "${id}" was not found.` });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(400).json({ error: 'Gemini embeddings are not configured. Please set GEMINI_API_KEY in .env.' });
      return;
    }

    const chunks = document.chunks && document.chunks.length > 0
      ? (document.chunks as any)
      : chunkDocument(document);
    const embeddedChunks = await generateEmbeddingsForChunks(chunks, (stats) => {
      document.chunks = chunks;
      insertDocument(document);
      console.log(
        `[Embeddings Progress] ${stats.embeddedChunks + stats.reusedChunks}/${stats.totalChunks} chunks processed (${stats.apiRequests} API calls)...`
      );
    });

    document.chunks = embeddedChunks;
    const persisted = insertDocument(document);
    res.json(persisted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate embeddings for document.' });
  }
});

/**
 * POST /api/search
 * Performs semantic vector search using Gemini gemini-embedding-2 (768-dim) and SQLite chunks.
 */
app.post('/api/search', async (req, res) => {
  try {
    const { query, documentIds, topK } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Search query is required and cannot be empty.' });
      return;
    }

    if (documentIds !== undefined && !Array.isArray(documentIds)) {
      res.status(400).json({ error: 'documentIds must be an array of document ID strings if provided.' });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error: 'Gemini embedding service is not configured. Please set GEMINI_API_KEY in .env.',
      });
      return;
    }

    const searchResponse = await semanticSearch(query, {
      documentIds,
      topK: typeof topK === 'number' ? topK : undefined,
    });

    res.json(searchResponse);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute semantic search.' });
  }
});

/**
 * POST /api/rag/query
 * End-to-end RAG query pipeline:
 * Query Contextualization -> Semantic Vector Search -> Grounded Gemini Generation -> Structured Citations
 */
app.post('/api/rag/query', async (req, res) => {
  try {
    const { query, documentIds, topK, conversation } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Query is required and cannot be empty.' });
      return;
    }

    if (documentIds !== undefined && !Array.isArray(documentIds)) {
      res.status(400).json({ error: 'documentIds must be an array of document ID strings if provided.' });
      return;
    }

    if (conversation !== undefined && !Array.isArray(conversation)) {
      res.status(400).json({ error: 'conversation must be an array of messages if provided.' });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error: 'Gemini service is not configured. Please set GEMINI_API_KEY in .env.',
      });
      return;
    }

    // 1. Contextual query rewriting for multi-turn follow-ups
    const retrievalQuery = await rewriteQueryWithContext(
      query.trim(),
      Array.isArray(conversation) ? (conversation as ConversationMessage[]) : undefined
    );

    // 2. Semantic vector retrieval from SQLite
    const searchResponse = await semanticSearch(retrievalQuery, {
      documentIds,
      topK: typeof topK === 'number' ? topK : 5,
    });

    // 3. Grounded generation with Gemini and backend-owned citation mapping
    const result = await generateGroundedAnswer({
      query: query.trim(),
      retrievalQuery,
      chunks: searchResponse.results,
      conversation: Array.isArray(conversation) ? (conversation as ConversationMessage[]) : undefined,
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof GeminiQuotaExceededError || isQuotaExceededError(err)) {
      res.status(429).json({ error: QUOTA_EXCEEDED_USER_MESSAGE });
      return;
    }

    const statusCode = err?.statusCode || (typeof err?.status === 'number' ? err.status : 500);
    res.status(statusCode).json({ error: err.message || 'Failed to process RAG query.' });
  }
});

// Global Express error handler to catch and log any unhandled middleware errors
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER UNHANDLED ERROR]:', {
    name: err?.name,
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
  });
  const statusCode = err?.status || err?.statusCode || (err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  res.status(statusCode).json({
    error: err?.message || 'Internal Server Error',
    name: err?.name,
    code: err?.code,
  });
});

app.listen(PORT, () => {
  console.log(`ContextAI Ingestion Backend listening on http://localhost:${PORT}`);
});
