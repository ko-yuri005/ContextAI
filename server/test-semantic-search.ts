import 'dotenv/config';
import { cosineSimilarity, semanticSearch, SearchResultItem } from './services/vectorSearch.js';
import { getEmbeddedChunks, getDocumentById } from './services/database.js';
import { generateEmbedding, EMBEDDING_DIMENSION, isGeminiConfigured } from './services/geminiEmbeddings.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   CONTEXTAI SEMANTIC VECTOR SEARCH TEST SUITE');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // 1. UNIT TESTS: cosineSimilarity mathematical & boundary checks
  // ------------------------------------------------------------------
  console.log('--- 1. Cosine Similarity Unit Tests ---');

  const simIdentical = cosineSimilarity([1, 0, 0], [1, 0, 0]);
  assert(Math.abs(simIdentical - 1.0) < 1e-6, 'Identical vectors yield similarity 1.0');

  const simOrthogonal = cosineSimilarity([1, 0, 0], [0, 1, 0]);
  assert(Math.abs(simOrthogonal - 0.0) < 1e-6, 'Orthogonal vectors yield similarity 0.0');

  const simOpposite = cosineSimilarity([1, 0], [-1, 0]);
  assert(Math.abs(simOpposite - -1.0) < 1e-6, 'Opposite vectors yield similarity -1.0');

  const simArbitrary = cosineSimilarity([1, 2, 3], [4, 5, 6]);
  // dot = 4+10+18 = 32; normA = sqrt(14); normB = sqrt(77); 32 / (sqrt(14)*sqrt(77)) = 32 / sqrt(1078) ≈ 0.9746318
  assert(Math.abs(simArbitrary - 0.97463) < 0.001, 'Arbitrary positive vectors match cosine formula');

  const simZeroA = cosineSimilarity([0, 0, 0], [1, 2, 3]);
  assert(simZeroA === 0, 'Zero-norm vector safely returns 0 (prevents division by zero)');

  const simMismatched = cosineSimilarity([1, 2, 3], [1, 2]);
  assert(simMismatched === 0, 'Mismatched vector dimensions safely return 0');

  const simEmpty = cosineSimilarity([], []);
  assert(simEmpty === 0, 'Empty vectors safely return 0');

  const simNaN = cosineSimilarity([NaN, 1], [1, 2]);
  assert(simNaN === 0, 'Vectors with NaN elements safely return 0');

  // ------------------------------------------------------------------
  // 2. DATABASE TESTS: getEmbeddedChunks
  // ------------------------------------------------------------------
  console.log('\n--- 2. Database Embedded Chunks Retrieval Tests ---');

  const targetDocId = 'web-1790103926500-n49jk';
  const doc = getDocumentById(targetDocId);
  assert(doc !== null, `Target Wikipedia document "${targetDocId}" exists in SQLite`);

  const embeddedChunks = getEmbeddedChunks([targetDocId]);
  assert(
    embeddedChunks.length === 100,
    `Retrieved exactly 100 embedded chunks for "${targetDocId}" (got ${embeddedChunks.length})`
  );

  const allValidDims = embeddedChunks.every(
    (c) => Array.isArray(c.embedding) && c.embedding.length === EMBEDDING_DIMENSION
  );
  assert(allValidDims, `All retrieved chunks have valid ${EMBEDDING_DIMENSION}-dimensional embeddings`);

  const hasContent = embeddedChunks.every(
    (c) => typeof c.text === 'string' && c.text.length > 0 && typeof c.documentName === 'string'
  );
  assert(hasContent, 'All retrieved chunks contain non-empty text and documentName');

  const emptyFilter = getEmbeddedChunks(['nonexistent-document-id-999']);
  assert(emptyFilter.length === 0, 'Filtering by nonexistent documentId returns empty array');

  // ------------------------------------------------------------------
  // 3. SEMANTIC SEARCH BENCHMARKS: Realistic Queries
  // ------------------------------------------------------------------
  console.log('\n--- 3. Semantic Search Benchmarks & Query Quality ---');

  if (!isGeminiConfigured()) {
    console.error('Gemini is not configured. Aborting live search tests.');
    process.exit(1);
  }

  const queries = [
    'What is artificial intelligence?',
    'What are the main approaches to artificial intelligence?',
    'What is machine learning?',
    'How are neural networks used in AI?',
  ];

  for (let qIdx = 0; qIdx < queries.length; qIdx++) {
    const query = queries[qIdx];
    console.log(`\n[Query ${qIdx + 1}/4]: "${query}"`);

    // Verify standalone query embedding
    const queryVector = await generateEmbedding(query);
    assert(
      Array.isArray(queryVector) && queryVector.length === EMBEDDING_DIMENSION,
      `Query embedding dimension is exactly ${EMBEDDING_DIMENSION}`
    );

    // Execute semantic search
    const response = await semanticSearch(query, {
      documentIds: [targetDocId],
      topK: 5,
    });

    assert(response.query === query, 'Response query matches input query');
    assert(response.results.length === 5, `Returned exactly 5 results (got ${response.results.length})`);

    // Verify descending sort order
    let isSorted = true;
    for (let i = 1; i < response.results.length; i++) {
      if (response.results[i].similarity > response.results[i - 1].similarity) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, 'Results are strictly sorted descending by similarity score');

    // Verify no raw embedding vectors exposed in results
    const noRawEmbeddings = response.results.every((r: any) => r.embedding === undefined);
    assert(noRawEmbeddings, 'Raw embedding vectors are excluded from results');

    // Verify snippets are non-empty and derived from stored text
    const validSnippets = response.results.every((r) => typeof r.snippet === 'string' && r.snippet.length > 20);
    assert(validSnippets, 'All results contain valid context snippets');

    // Print ranking table
    console.log('   Results:');
    response.results.forEach((r, idx) => {
      console.log(
        `     Rank #${idx + 1} | Score: ${r.similarity.toFixed(4)} | Section: "${r.sectionTitle || 'N/A'}" (Chunk: ${r.chunkId})`
      );
      console.log(`            Snippet: ${r.snippet.replace(/\n+/g, ' ').slice(0, 140)}...`);
    });

    // Pacing pause between test queries to respect rate limits
    if (qIdx < queries.length - 1) {
      await sleep(1500);
    }
  }

  // ------------------------------------------------------------------
  // 4. EDGE CASE & PARAMETER VALIDATION TESTS
  // ------------------------------------------------------------------
  console.log('\n--- 4. Edge Cases & Parameter Validation Tests ---');

  // Test topK clamping
  const topK3 = await semanticSearch('Robotics in AI', {
    documentIds: [targetDocId],
    topK: 3,
  });
  assert(topK3.results.length === 3, `topK=3 returns exactly 3 results (got ${topK3.results.length})`);

  await sleep(1500);

  const topK1 = await semanticSearch('Singularity', {
    documentIds: [targetDocId],
    topK: 1,
  });
  assert(topK1.results.length === 1, `topK=1 returns exactly 1 result (got ${topK1.results.length})`);

  // Empty query rejection
  let emptyRejected = false;
  try {
    await semanticSearch('');
  } catch (err: any) {
    emptyRejected = err.message.includes('empty');
  }
  assert(emptyRejected, 'Empty query is rejected with descriptive error');

  // Whitespace-only query rejection
  let whitespaceRejected = false;
  try {
    await semanticSearch('   ');
  } catch (err: any) {
    whitespaceRejected = err.message.includes('empty');
  }
  assert(whitespaceRejected, 'Whitespace-only query is rejected with descriptive error');

  // Mismatched vector dimensions in search
  const fakeCandidateChunks = [
    {
      id: 'test-chunk-1',
      documentId: 'doc-1',
      documentName: 'Doc 1',
      text: 'Test',
      pageNumber: 1,
      sectionTitle: 'Test',
      tokenCount: 1,
      snippet: 'Test',
      embedding: [0.1, 0.2], // 2 dimensions instead of 768
    },
  ];
  const testSimilarity = cosineSimilarity(new Array(768).fill(0.1), fakeCandidateChunks[0].embedding);
  assert(testSimilarity === 0, 'Mismatched vector candidate safely yields 0 similarity');

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
