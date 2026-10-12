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
    `You are the planner in an agentic RAG system for resumes and career coaching. Analyze the user's request and decide how to search the candidate's resume/profile.\n\nReturn JSON only:\n{"searchQuery":"concise search query keywords","needsRetrieval":true|false,"reason":"why this strategy was chosen"}\n\nUser request:\n${query}`,
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
    return { sufficient: false, reason: 'No documents retrieved from knowledge base', rewrite: query };
  }

  const context = documents
    .map((d, i) => `[${i + 1}] Source: ${d.source}\n${d.text}`)
    .join('\n\n');

  const raw = await generateText(
    `You are an evaluation agent for a RAG system. Decide whether the retrieved passages contain relevant and sufficient information to answer the user's question accurately.\n\nReturn JSON only:\n{"sufficient":true|false,"reason":"brief explanation","rewrite":"improved search query if insufficient"}\n\nQuestion:\n${query}\n\nPassages:\n${context}`,
    { responseMimeType: 'application/json' }
  );

  return safeJson(raw, {
    sufficient: documents.some((d) => (d.score || 0) >= Number(process.env.RAG_MIN_SCORE || 0.45)),
    reason: 'Score based evaluation fallback',
    rewrite: query,
  });
}

async function answer(query, documents, history = []) {
  const context = documents
    .map((d, i) => `[SOURCE ${i + 1}] ${d.source} (chunk #${d.chunkIndex + 1})\n${d.text}`)
    .join('\n\n');

  const transcript = history.slice(-6)
    .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${String(item.content || '').slice(0, 1000)}`)
    .join('\n');

  return generateText(
    `You are a grounded resume-writing coach and career assistant. Answer the user's question accurately using ONLY the supplied knowledge base passages.

Grounding rules:
1. Do NOT hallucinate credentials, metrics, employers, or dates not present in the sources.
2. Cite supporting passages inline using [SOURCE 1], [SOURCE 2], etc.
3. If drafting or improving bullets, clearly distinguish suggested wording from verified facts.
4. If the knowledge base does not contain enough information, explain what is missing rather than inventing facts.

Retrieved knowledge base passages:
${context || 'No matching passages retrieved.'}

Recent conversation context:
${transcript || '(none)'}

User question:
${query}`
  );
}

async function runAgent({ query, ownerId = null, documentId = null, history = [] }) {
  // Step 1: Planning
  const firstPlan = await plan(query);
  if (firstPlan.needsRetrieval === false) {
    const directAnswer = await answer(query, [], history);
    return {
      answer: directAnswer,
      sources: [],
      trace: [{ step: 'plan', ...firstPlan }],
    };
  }

  const firstQuery = firstPlan.searchQuery || query;

  // Step 2: Vector Retrieval
  let documents = await vectorSearch({ query: firstQuery, ownerId, documentId, limit: 6 });

  // Step 3: Retrieval Grading / Evaluation
  const firstGrade = await grade(query, documents);
  const trace = [
    { step: 'plan', searchQuery: firstQuery, reason: firstPlan.reason },
    { step: 'retrieve', query: firstQuery, count: documents.length },
    { step: 'grade', sufficient: firstGrade.sufficient, reason: firstGrade.reason },
  ];

  // Step 4: Self-Correction (Rewrite & Re-retrieve if insufficient)
  if (!firstGrade.sufficient && firstGrade.rewrite) {
    const rewritten = firstGrade.rewrite;
    if (rewritten && rewritten !== firstQuery) {
      const moreDocuments = await vectorSearch({ query: rewritten, ownerId, documentId, limit: 8 });
      trace.push({
        step: 'rewrite-retrieve',
        searchQuery: rewritten,
        count: moreDocuments.length,
      });
      if (moreDocuments.length > 0) {
        // Merge documents uniquely
        const seen = new Set(documents.map((d) => String(d._id)));
        for (const doc of moreDocuments) {
          if (!seen.has(String(doc._id))) {
            documents.push(doc);
            seen.add(String(doc._id));
          }
        }
      }
    }
  }

  const finalDocuments = documents.slice(0, 8);

  // Step 5: Grounded Generation
  const finalAnswer = await answer(query, finalDocuments, history);

  return {
    answer: finalAnswer,
    sources: finalDocuments.map((d) => ({
      id: String(d._id),
      source: d.source,
      documentId: d.documentId,
      chunkIndex: d.chunkIndex,
      score: d.score != null ? Math.round(d.score * 100) / 100 : null,
      preview: d.text.slice(0, 240),
    })),
    trace,
  };
}

module.exports = { runAgent, plan, grade, answer };
