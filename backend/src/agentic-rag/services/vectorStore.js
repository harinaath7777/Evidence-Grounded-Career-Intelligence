const RagChunk = require('../models/RagChunk');
const { embedText, embedTexts } = require('./gemini');
const { chunkText } = require('./chunker');

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function indexDocument({ documentId, ownerId = null, source, text, metadata = {} }) {
  const chunks = chunkText(text, {
    size: Number(process.env.RAG_CHUNK_SIZE || 1200),
    overlap: Number(process.env.RAG_CHUNK_OVERLAP || 180),
  });

  if (!chunks.length) throw new Error('Document contains no indexable text');

  const embeddings = await embedTexts(chunks);

  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding count does not match chunk count');
  }

  await RagChunk.deleteMany({ documentId });

  const docs = chunks.map((chunk, index) => ({
    documentId: String(documentId),
    ownerId: ownerId ? String(ownerId) : null,
    source,
    chunkIndex: index,
    text: chunk,
    embedding: embeddings[index],
    metadata,
  }));

  await RagChunk.insertMany(docs);

  return { documentId, source, chunks: chunks.length };
}

async function vectorSearch({ query, ownerId = null, documentId = null, limit = 8 }) {
  const embedding = await embedText(query);
  const filter = {};
  if (ownerId) filter.ownerId = String(ownerId);
  if (documentId) filter.documentId = String(documentId);

  // 1. Try Atlas $vectorSearch if available
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: process.env.MONGO_VECTOR_INDEX || 'rag_vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: Math.max(limit * 20, 100),
          limit,
          ...(Object.keys(filter).length ? { filter } : {}),
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          source: 1,
          chunkIndex: 1,
          text: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];
    const results = await RagChunk.aggregate(pipeline);
    if (results && results.length > 0) return results;
  } catch (err) {
    // Atlas $vectorSearch not supported on local standalone or in-memory MongoDB
    // Graceful fallback to exact cosine similarity below
  }

  // 2. Exact Cosine Similarity fallback for local/in-memory MongoDB
  const queryFilter = {};
  if (documentId) queryFilter.documentId = String(documentId);
  else if (ownerId) queryFilter.ownerId = String(ownerId);

  const chunks = await RagChunk.find(queryFilter).lean();
  if (!chunks.length && (documentId || ownerId)) {
    // If filtered search returned nothing, check if there are chunks without documentId
    const anyChunks = await RagChunk.find({}).limit(50).lean();
    if (anyChunks.length) chunks.push(...anyChunks);
  }

  const scored = chunks.map((c) => ({
    _id: c._id,
    documentId: c.documentId,
    source: c.source,
    chunkIndex: c.chunkIndex,
    text: c.text,
    metadata: c.metadata,
    score: cosineSimilarity(embedding, c.embedding || []),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

module.exports = { indexDocument, vectorSearch, cosineSimilarity };
