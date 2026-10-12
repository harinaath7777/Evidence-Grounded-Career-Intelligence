const { generateText } = require('./gemini');
const { vectorSearch } = require('./vectorStore');

function safeJson(text, fallback) {
  try {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

async function plan(query) {
  const raw = await generateText(
    `You are the planner in an agentic RAG system. Analyze the user's request and decide how to search a private knowledge base.\n\nReturn JSON only:\n{"searchQuery":"...","needsRetrieval":true|false,"reason":"..."}\n\nUser request:\n${query}`,
    { responseMimeType: 'application/json' }
  );

  return safeJson(raw, {
    searchQuery: query,
    needsRetrieval: true,
    reason: 'Default retrieval',
  });
}

async function grade(query, documents) {
  if (!documents.length) {
    return { sufficient: false, reason: 'No documents retrieved', rewrite: query };
  }

  const context = documents
    .map((d, i) => `[${i + 1}] ${d.source}\n${d.text}`)
    .join('\n\n');

  const raw = await generateText(
    `You are a retrieval evaluator. Decide whether the supplied passages are sufficient to answer the user's question accurately.\n\nReturn JSON only:\n{"sufficient":true|false,"reason":"...","rewrite":"better search query if insufficient"}\n\nQuestion:\n${query}\n\nPassages:\n${context}`,
    { responseMimeType: 'application/json' }
  );

  return safeJson(raw, {
    sufficient: documents.some((d) => d.score >= Number(process.env.RAG_MIN_SCORE || 0.55)),
    reason: 'Fallback score evaluation',
    rewrite: query,
  });
}

async function answer(query, documents) {
  const context = documents
    .map((d, i) => `[SOURCE ${i + 1}] ${d.source} (chunk ${d.chunkIndex})\n${d.text}`)
    .join('\n\n');

  return generateText(
    `You are a grounded assistant. Answer the user's question using ONLY the supplied knowledge-base passages. If the passages do not contain the answer, say that the knowledge base does not provide enough information. Do not invent facts. Cite supporting passages inline as [SOURCE 1], [SOURCE 2], etc.\n\nQuestion:\n${query}\n\nKnowledge base:\n${context}`
  );
}

async function runAgent({ query, ownerId = null }) {
  const firstPlan = await plan(query);
  if (firstPlan.needsRetrieval === false) {
    return { answer: await answer(query, []), sources: [], trace: [{ step: 'plan', ...firstPlan }] };
  }

  const firstQuery = firstPlan.searchQuery || query;
  let documents = await vectorSearch({ query: firstQuery, ownerId, limit: 8 });
  const firstGrade = await grade(query, documents);
  const trace = [
    { step: 'plan', searchQuery: firstQuery, reason: firstPlan.reason },
    { step: 'retrieve', count: documents.length },
    { step: 'grade', ...firstGrade },
  ];

  if (!firstGrade.sufficient) {
    const rewritten = firstGrade.rewrite || firstQuery;
    if (rewritten && rewritten !== firstQuery) {
      documents = await vectorSearch({ query: rewritten, ownerId, limit: 10 });
      trace.push({ step: 'rewrite-retrieve', searchQuery: rewritten, count: documents.length });
    }
  }

  const finalDocuments = documents.slice(0, 10);
  const finalAnswer = await answer(query, finalDocuments);

  return {
    answer: finalAnswer,
    sources: finalDocuments.map((d) => ({
      id: String(d._id),
      source: d.source,
      documentId: d.documentId,
      chunkIndex: d.chunkIndex,
      score: d.score,
      preview: d.text.slice(0, 240),
    })),
    trace,
  };
}

module.exports = { runAgent };
