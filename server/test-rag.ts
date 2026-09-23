import 'dotenv/config';
import { semanticSearch } from './services/vectorSearch.js';
import {
  generateGroundedAnswer,
  rewriteQueryWithContext,
  GENERATION_MODEL,
  ConversationMessage,
} from './services/geminiGeneration.js';
import { isGeminiConfigured } from './services/geminiEmbeddings.js';

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

async function runRagTests() {
  console.log('\n======================================================');
  console.log('       CONTEXTAI RAG GENERATION TEST SUITE');
  console.log(`       Model: ${GENERATION_MODEL}`);
  console.log('======================================================\n');

  if (!isGeminiConfigured()) {
    console.error('Gemini is not configured. Aborting RAG test suite.');
    process.exit(1);
  }

  const targetDocId = 'web-1790103926500-n49jk';

  // ------------------------------------------------------------------
  // TEST 1: Standalone Query — "What is artificial intelligence?"
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Standalone Query: "What is artificial intelligence?" ---');
  const query1 = 'What is artificial intelligence?';
  const retrievalQuery1 = await rewriteQueryWithContext(query1);
  assert(retrievalQuery1 === query1, 'Standalone query unchanged by rewriter');

  const searchRes1 = await semanticSearch(retrievalQuery1, {
    documentIds: [targetDocId],
    topK: 5,
  });
  assert(searchRes1.results.length === 5, 'Retrieved top 5 candidate chunks');

  const ragRes1 = await generateGroundedAnswer({
    query: query1,
    retrievalQuery: retrievalQuery1,
    chunks: searchRes1.results,
  });

  assert(ragRes1.answer.length > 50, 'Generated comprehensive grounded answer');
  assert(!ragRes1.answer.includes('[object Object]'), 'Answer contains clean text');

  // Verify citation mapping
  const hasCitationMarkers1 = /\[\d+\]/.test(ragRes1.answer);
  if (hasCitationMarkers1) {
    assert(ragRes1.citations.length > 0, `Mapped explicit [N] citation markers to structured citations (${ragRes1.citations.length} citations)`);
    const allValidDocNames = ragRes1.citations.every((c) => c.documentName === 'Artificial intelligence');
    assert(allValidDocNames, 'All citations map back to real database document metadata');
  } else {
    console.warn('  ⚠ WARNING: Answer produced no [N] citation markers; citations array is empty as expected');
    assert(ragRes1.citations.length === 0, 'No citation markers results in empty citations array');
  }

  // Verify no raw embeddings returned
  const hasNoEmbeddings1 = (ragRes1 as any).embedding === undefined &&
    ragRes1.citations.every((c: any) => c.embedding === undefined);
  assert(hasNoEmbeddings1, 'No raw embedding vectors exposed in RAG response');

  console.log(`\n  Original Query:  "${ragRes1.query}"`);
  console.log(`  Retrieval Query: "${ragRes1.retrievalQuery}"`);
  console.log(`  Answer:\n${ragRes1.answer}`);
  console.log(`  Citation IDs:    [${ragRes1.citations.map((c) => c.id).join(', ')}]`);
  ragRes1.citations.forEach((c) => {
    console.log(`    [${c.id}] Doc: "${c.documentName}" | Section: "${c.sectionTitle || 'General'}" | Chunk: ${c.chunkId}`);
  });

  await sleep(2500);

  // ------------------------------------------------------------------
  // TEST 2: Specific Query — "What is machine learning?"
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Specific Query: "What is machine learning?" ---');
  const query2 = 'What is machine learning?';
  const retrievalQuery2 = await rewriteQueryWithContext(query2);

  const searchRes2 = await semanticSearch(retrievalQuery2, {
    documentIds: [targetDocId],
    topK: 5,
  });

  const ragRes2 = await generateGroundedAnswer({
    query: query2,
    retrievalQuery: retrievalQuery2,
    chunks: searchRes2.results,
  });

  assert(ragRes2.answer.length > 50, 'Generated grounded answer for machine learning');
  const hasCitationMarkers2 = /\[\d+\]/.test(ragRes2.answer);
  if (hasCitationMarkers2) {
    assert(ragRes2.citations.length > 0, `Mapped explicit citation markers (${ragRes2.citations.length} citations)`);
    const citedLearningOrAI = ragRes2.citations.some(
      (c) => (c.sectionTitle || '').includes('Learning') || (c.sectionTitle || '').includes('Overview')
    );
    assert(citedLearningOrAI, 'Citations include relevant section from retrieved chunks');
  } else {
    console.warn('  ⚠ WARNING: Answer produced no [N] citation markers; citations array is empty as expected');
    assert(ragRes2.citations.length === 0, 'No citation markers results in empty citations array');
  }

  console.log(`\n  Original Query:  "${ragRes2.query}"`);
  console.log(`  Retrieval Query: "${ragRes2.retrievalQuery}"`);
  console.log(`  Answer:\n${ragRes2.answer}`);
  console.log(`  Citation IDs:    [${ragRes2.citations.map((c) => c.id).join(', ')}]`);
  ragRes2.citations.forEach((c) => {
    console.log(`    [${c.id}] Doc: "${c.documentName}" | Section: "${c.sectionTitle || 'General'}" | Chunk: ${c.chunkId}`);
  });

  await sleep(2500);

  // ------------------------------------------------------------------
  // TEST 3: Multi-turn Follow-up — "What are its main types?"
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Multi-Turn Follow-Up Query ---');
  const conversationHistory: ConversationMessage[] = [
    { role: 'user', content: query2 },
    { role: 'assistant', content: ragRes2.answer },
  ];

  const followUpQuery = 'What are its main types?';
  const rewrittenQuery = await rewriteQueryWithContext(followUpQuery, conversationHistory);

  console.log(`  Original Follow-Up: "${followUpQuery}"`);
  console.log(`  Rewritten Query:    "${rewrittenQuery}"`);

  // Verify that "its" was resolved to machine learning
  const resolvedMachineLearning = /machine learning/i.test(rewrittenQuery);
  assert(
    resolvedMachineLearning,
    `Follow-up query resolved pronoun "its" to "machine learning" (got: "${rewrittenQuery}")`
  );

  const searchRes3 = await semanticSearch(rewrittenQuery, {
    documentIds: [targetDocId],
    topK: 5,
  });

  const ragRes3 = await generateGroundedAnswer({
    query: followUpQuery,
    retrievalQuery: rewrittenQuery,
    chunks: searchRes3.results,
    conversation: conversationHistory,
  });

  assert(ragRes3.answer.length > 50, 'Generated grounded answer for follow-up query');
  assert(ragRes3.retrievalQuery === rewrittenQuery, 'Retrieval query recorded in response');

  console.log(`\n  Answer:\n${ragRes3.answer}`);
  console.log(`  Citation IDs: [${ragRes3.citations.map((c) => c.id).join(', ')}]`);
  ragRes3.citations.forEach((c) => {
    console.log(`    [${c.id}] Doc: "${c.documentName}" | Section: "${c.sectionTitle || 'General'}" | Chunk: ${c.chunkId}`);
  });

  await sleep(2500);

  // ------------------------------------------------------------------
  // TEST 4: Unsupported Query — "What is the capital of France?"
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Unsupported Query (Out-of-Domain Guardrail) ---');
  const unsupportedQuery = 'What is the capital of France?';
  const searchRes4 = await semanticSearch(unsupportedQuery, {
    documentIds: [targetDocId],
    topK: 5,
  });

  const ragRes4 = await generateGroundedAnswer({
    query: unsupportedQuery,
    chunks: searchRes4.results,
  });

  console.log(`\n  Query: "${unsupportedQuery}"`);
  console.log(`  Answer:\n${ragRes4.answer}`);

  // Must NOT claim Paris as capital of France based on external knowledge
  const didNotSayParisAsCapital = !/\bParis is the capital\b/i.test(ragRes4.answer);
  assert(didNotSayParisAsCapital, 'Did NOT fabricate "Paris is the capital" from general world knowledge');

  // Must explicitly state insufficient information
  const statesInsufficient = /not contain (enough|sufficient) information|insufficient information|do not contain/i.test(
    ragRes4.answer
  );
  assert(statesInsufficient, 'Explicitly states that available sources do not contain enough information');

  // Must have 0 citations since no claims are grounded in document
  assert(ragRes4.citations.length === 0, `Unsupported question has 0 citations (got ${ragRes4.citations.length})`);

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

runRagTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
