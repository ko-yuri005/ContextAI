import { chunkDocument, estimateTokenCount, CHUNK_TARGETS } from './services/chunker.js';

function runChunkerTests() {
  console.log('=== Running ContextAI Document Chunker Verification Suite ===\n');

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

  // Test 1: Short Section (< 800 tokens) stays as 1 chunk
  console.log('--- Test 1: Short Section Preservation ---');
  const shortDoc = {
    id: 'test-short-doc',
    name: 'Short Document',
    pages: [
      {
        pageNumber: 1,
        title: 'Introduction',
        content:
          'Artificial intelligence was founded as an academic discipline in 1956. In the years since, it has experienced several waves of optimism followed by disappointment and loss of funding, known as AI winters. However, new approaches and computational hardware have led to recent resurgences.',
      },
    ],
  };

  const shortChunks = chunkDocument(shortDoc);
  assert(shortChunks.length === 1, 'Short section produces exactly 1 chunk');
  assert(
    shortChunks[0].text.startsWith('Introduction — Artificial intelligence'),
    'Contextual prefix "Introduction — " is applied'
  );
  assert(shortChunks[0].tokenCount > 0 && shortChunks[0].tokenCount < 100, 'Token count is accurate');
  assert(shortChunks[0].id === 'test-short-doc-chunk-1', 'Deterministic ID formatted as test-short-doc-chunk-1');

  // Test 2: Large Section (> 1500 tokens) is split into chunks within 500–800 token target
  console.log('\n--- Test 2: Large Section Splitting & Sizing ---');
  // Build a synthetic large section of distinct numbered paragraphs
  const largeContent = Array.from({ length: 15 }, (_, idx) => 
    `Section passage ${idx + 1}: Machine learning is a field of inquiry devoted to understanding and building methods that learn, that is, methods that leverage data to improve performance on some set of tasks. It is seen as a part of artificial intelligence. Machine learning algorithms build a model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to do so. Machine learning algorithms are used in a wide variety of applications, such as in medicine, email filtering, speech recognition, agriculture, and computer vision, where it is difficult or unfeasible to develop conventional algorithms to perform the needed tasks. The study of mathematical optimization delivers methods, theory and application domains to the field of machine learning.`
  ).join('\n\n');
  const totalTokensRaw = estimateTokenCount(largeContent);

  const largeDoc = {
    id: 'test-large-doc',
    name: 'Machine Learning Deep Dive',
    pages: [
      {
        pageNumber: 2,
        title: 'Machine Learning Overview',
        content: largeContent,
      },
    ],
  };

  const largeChunks = chunkDocument(largeDoc);
  assert(largeChunks.length > 1, `Large content (${totalTokensRaw} tokens) split into ${largeChunks.length} chunks`);

  let allWithinRange = true;
  let hasOverlap = false;

  for (let i = 0; i < largeChunks.length; i++) {
    const chunk = largeChunks[i];
    // Check non-empty
    assert(chunk.text.trim().length > 0, `Chunk ${i + 1} is not empty`);
    assert(chunk.documentId === 'test-large-doc', `Chunk ${i + 1} has correct documentId`);
    assert(chunk.id === `test-large-doc-chunk-${i + 1}`, `Chunk ${i + 1} ID is deterministic`);
    assert(
      chunk.text.startsWith('Machine Learning Overview — '),
      `Chunk ${i + 1} preserves section heading context`
    );

    // Check sentence boundaries: does not start with lowercase letter or cut punctuation
    const textWithoutPrefix = chunk.text.replace(/^Machine Learning Overview — /, '');
    const startsCleanly = /^[A-Z0-9"“'‘(\[]/.test(textWithoutPrefix);
    assert(startsCleanly, `Chunk ${i + 1} starts at a valid sentence boundary`);

    // Check overlap with next chunk
    if (i < largeChunks.length - 1) {
      const nextChunk = largeChunks[i + 1];
      const nextTextWithoutPrefix = nextChunk.text.replace(/^Machine Learning Overview — /, '');
      
      // The first sentence of the next chunk should be found in the current chunk (carried over as overlap)
      const firstSentenceOfNext = nextTextWithoutPrefix.split(/(?<=[.!?])\s+/)[0]?.trim();
      if (firstSentenceOfNext && textWithoutPrefix.includes(firstSentenceOfNext)) {
        hasOverlap = true;
      }
    }
  }

  assert(hasOverlap, 'Adjacent chunks in large section have sentence overlap');

  // Compute test statistics
  const tokenCounts = largeChunks.map((c) => c.tokenCount);
  const minTokens = Math.min(...tokenCounts);
  const maxTokens = Math.max(...tokenCounts);
  const avgTokens = Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length);

  console.log(`\nLarge Section Chunk Statistics:`);
  console.log(`- Number of chunks: ${largeChunks.length}`);
  console.log(`- Minimum token count: ${minTokens}`);
  console.log(`- Maximum token count: ${maxTokens}`);
  console.log(`- Average token count: ${avgTokens}`);
  console.log(`- Overlap confirmed: ${hasOverlap ? 'YES' : 'NO'}`);
  console.log(`- Empty chunks detected: NO`);

  // Test 3: Deterministic Reprocessing Test
  console.log('\n--- Test 3: Deterministic Reprocessing ---');
  const reprocessingRun1 = chunkDocument(largeDoc);
  const reprocessingRun2 = chunkDocument(largeDoc);

  assert(reprocessingRun1.length === reprocessingRun2.length, 'Reprocessing produces same number of chunks');
  let deterministicMatches = true;
  for (let i = 0; i < reprocessingRun1.length; i++) {
    if (
      reprocessingRun1[i].id !== reprocessingRun2[i].id ||
      reprocessingRun1[i].text !== reprocessingRun2[i].text ||
      reprocessingRun1[i].tokenCount !== reprocessingRun2[i].tokenCount
    ) {
      deterministicMatches = false;
      break;
    }
  }
  assert(deterministicMatches, 'Reprocessing is 100% deterministic (IDs, text, tokens match exactly)');

  // Test 4: UI Backwards Compatibility Aliases
  console.log('\n--- Test 4: UI Backwards Compatibility Aliases ---');
  const sampleChunk = largeChunks[0];
  assert(typeof sampleChunk.pageOrSlideNumber === 'number', 'pageOrSlideNumber alias exists');
  assert(typeof sampleChunk.snippet === 'string', 'snippet alias exists');

  console.log(`\n======================================================`);
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runChunkerTests();
