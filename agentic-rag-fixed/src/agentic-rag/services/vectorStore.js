const RagChunk = require('../models/RagChunk');
const { embedText, embedTexts } = require('./gemini');

async function indexDocument({ documentId, ownerId = null, source, text, metadata = {} }) {
  const { chunkText } = require('./chunker');
  const chunks = chunkText(text, {
    size: Number(process.env.RAG_CHUNK_SIZE || 1200),
    overlap: Number(process.env.RAG_CHUNK_OVERLAP || 180),
  });

  if (!chunks.length) throw new Error('Document contains no indexable text');

  const embeddings = [];
  const batchSize = 20;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = await embedTexts(chunks.slice(i, i + batchSize));
    embeddings.push(...batch);
  }

  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding count does not match chunk count');
  }

  await RagChunk.deleteMany({ documentId });

  await RagChunk.insertMany(
    chunks.map((chunk, index) => ({
      documentId,
      ownerId,
      source,
      chunkIndex: index,
      text: chunk,
      embedding: embeddings[index],
      metadata,
    }))
  );

  return { documentId, source, chunks: chunks.length };
}

async function vectorSearch({ query, ownerId = null, limit = 8 }) {
  const embedding = await embedText(query);
  const filter = ownerId
    ? { ownerId: { $eq: ownerId } }
    : undefined;

  const pipeline = [
    {
      $vectorSearch: {
        index: process.env.MONGO_VECTOR_INDEX || 'rag_vector_index',
        path: 'embedding',
        queryVector: embedding,
        numCandidates: Math.max(limit * 20, 100),
        limit,
        ...(filter ? { filter } : {}),
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

  return RagChunk.aggregate(pipeline);
}

module.exports = { indexDocument, vectorSearch };
