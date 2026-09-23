import 'dotenv/config';
import {
  isGeminiConfigured,
  generateEmbedding,
  generateEmbeddingsForChunks,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
} from './services/geminiEmbeddings.js';
import { insertDocument, getDocumentById, deleteDocument } from './services/database.js';
import { DocumentChunk } from './services/chunker.js';

async function runEmbeddingTests() {
  console.log('=== Running ContextAI Gemini Embeddings Verification Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${details ? ' - ' + details : ''}`);
      failed++;
    }
  }

  // 1. Verify GEMINI_API_KEY is detected
  console.log('--- Check 1: API Key Detection ---');
  const configured = isGeminiConfigured();
  assert(configured, 'GEMINI_API_KEY is detected in environment');
  if (!configured) {
    console.error('Cannot proceed without GEMINI_API_KEY. Exiting.');
    process.exit(1);
  }

  // 2 & 3 & 4. Send known text, verify numeric embedding with dimension 768
  console.log('\n--- Check 2, 3 & 4: Single Embedding Generation & Dimension Check ---');
  const sampleText = 'Artificial intelligence is the science of making machines intelligent.';
  console.log(`Requesting embedding for sample text using model "${EMBEDDING_MODEL}" with target dimension ${EMBEDDING_DIMENSION}...`);

  const startTime = Date.now();
  const vector = await generateEmbedding(sampleText);
  const elapsedMs = Date.now() - startTime;

  assert(Array.isArray(vector), 'Gemini returned an array vector');
  assert(vector.length === EMBEDDING_DIMENSION, `Embedding dimension is exactly ${EMBEDDING_DIMENSION} (received ${vector.length})`);

  const allNumbers = vector.every((val) => typeof val === 'number' && !isNaN(val));
  assert(allNumbers, 'All 768 elements in the embedding vector are valid numbers');

  const hasNonZero = vector.some((val) => val !== 0);
  assert(hasNonZero, 'Embedding vector contains meaningful non-zero floating-point values');
  console.log(`Embedding generated in ${elapsedMs}ms. Vector slice: [${vector.slice(0, 3).map((v) => v.toFixed(6)).join(', ')}, ... (${vector.length} total)]`);

  // 5 & 6. Verify SQLite storage and retrieval of embedded chunks
  console.log('\n--- Check 5 & 6: SQLite Roundtrip Persistence ---');
  const testDocId = `test-embed-doc-${Date.now()}`;
  const testChunk: DocumentChunk = {
    id: `${testDocId}-chunk-1`,
    documentId: testDocId,
    text: sampleText,
    pageNumber: 1,
    sectionTitle: 'Testing Section',
    tokenCount: 15,
    pageOrSlideNumber: 1,
    snippet: sampleText,
    embedding: vector,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimension: EMBEDDING_DIMENSION,
  };

  const docToPersist: any = {
    id: testDocId,
    name: 'Embeddings Test Document',
    type: 'note',
    size: 200,
    uploadDate: 'Just now',
    status: 'ready',
    totalPages: 1,
    unitLabel: 'section',
    summary: 'Test document for verifying SQLite embedding persistence.',
    tags: ['Test', 'Embeddings'],
    isSelectedAsSource: false,
    text: sampleText,
    pages: [{ pageNumber: 1, title: 'Testing Section', content: sampleText }],
    chunks: [testChunk],
  };

  // Insert into SQLite
  insertDocument(docToPersist);
  console.log(`Document "${testDocId}" inserted into SQLite.`);

  // Retrieve from SQLite
  const retrieved = getDocumentById(testDocId);
  assert(Boolean(retrieved), 'Document retrieved from SQLite');
  assert(retrieved?.chunks?.length === 1, 'Retrieved document contains 1 chunk');

  const retrievedChunk = retrieved?.chunks?.[0];
  assert(Array.isArray(retrievedChunk?.embedding), 'Retrieved chunk contains an embedding array');
  assert(retrievedChunk?.embedding?.length === EMBEDDING_DIMENSION, `Retrieved embedding has dimension ${EMBEDDING_DIMENSION}`);
  assert(retrievedChunk?.embeddingModel === EMBEDDING_MODEL, `Retrieved chunk has embeddingModel "${EMBEDDING_MODEL}"`);
  assert(retrievedChunk?.embeddingDimension === EMBEDDING_DIMENSION, `Retrieved chunk has embeddingDimension ${EMBEDDING_DIMENSION}`);

  // Value equality check
  let valuesMatch = true;
  for (let i = 0; i < vector.length; i++) {
    if (Math.abs(vector[i] - (retrievedChunk?.embedding?.[i] || 0)) > 1e-6) {
      valuesMatch = false;
      break;
    }
  }
  assert(valuesMatch, 'Persisted vector values match generated vector exactly');

  // Clean up test document
  deleteDocument(testDocId);
  const afterDelete = getDocumentById(testDocId);
  assert(!afterDelete, 'Temporary test document deleted cleanly from SQLite');

  // 7. Verify chunk array embedding with reuse test
  console.log('\n--- Check 7: Multiple Chunk Embedding & Cache Reuse ---');
  const multiChunks: DocumentChunk[] = [
    {
      id: 'chunk-cached-1',
      documentId: 'doc-cache-test',
      text: 'Cached chunk 1',
      tokenCount: 5,
      pageOrSlideNumber: 1,
      snippet: 'Cached chunk 1',
      embedding: vector,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: EMBEDDING_DIMENSION,
    },
    {
      id: 'chunk-new-2',
      documentId: 'doc-cache-test',
      text: 'New chunk needing fresh embedding generation.',
      tokenCount: 8,
      pageOrSlideNumber: 1,
      snippet: 'New chunk needing fresh embedding generation.',
    },
  ];

  let progressStats: any = null;
  const embeddedList = await generateEmbeddingsForChunks(multiChunks, (stats) => {
    progressStats = stats;
  });

  assert(embeddedList.length === 2, 'generateEmbeddingsForChunks returned both chunks');
  assert(embeddedList[0].embedding === vector, 'Unchanged chunk 1 reused existing embedding (no API call)');
  assert(Array.isArray(embeddedList[1].embedding), 'New chunk 2 received a fresh embedding');
  assert(embeddedList[1].embedding?.length === EMBEDDING_DIMENSION, `New chunk 2 embedding dimension is ${EMBEDDING_DIMENSION}`);
  assert(progressStats?.reusedChunks === 1, 'Progress tracker recorded 1 reused chunk');
  assert(progressStats?.apiRequests === 1, 'Progress tracker recorded exactly 1 API request for the new chunk');

  console.log(`\n======================================================`);
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEmbeddingTests().catch((err) => {
  console.error('Fatal error during embedding tests:', err);
  process.exit(1);
});
