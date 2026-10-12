# Agentic RAG integration

This patch is designed for the existing CommonJS Express backend. Your current backend already has `@google/genai`, `mongoose`, `multer`, and `pdf-parse`, so no new runtime dependency is required.

## 1. Copy the folder

Copy `src/agentic-rag` into your backend's `src/` directory.

## 2. Register the routes

In your existing `src/app.js`, add:

```js
const agenticRagRoutes = require('./agentic-rag/routes/agenticRagRoutes')
app.use('/api/rag', agenticRagRoutes)
```

Keep your existing auth middleware in front of these routes if your application already has authentication. The controller automatically uses `req.user.id` / `req.user._id` as `ownerId` when present.

## 3. Environment

Your project already loads dotenv in `server.js`. Keep that. Add these values to `.env`:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
MONGO_VECTOR_INDEX=rag_vector_index
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=180
RAG_MIN_SCORE=0.55
```

You can keep your existing `API_KEY`; the integration uses `GEMINI_API_KEY` first and falls back to `API_KEY`.

## 4. Create the MongoDB Atlas vector index

Create a Search/Vector Search index on the collection created by Mongoose: `ragchunks`.

Index name:
`rag_vector_index`

Definition:

```json
{
  "fields": [
    {
      "numDimensions": 768,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "ownerId",
      "type": "filter"
    }
  ]
}
```

The supplied `MONGO_VECTOR_INDEX.json` contains the same definition.

## 5. Ingest a PDF

```bash
curl -X POST http://localhost:3001/api/rag/ingest \\
  -F "file=@./resume.pdf"
```

Or ingest text:

```bash
curl -X POST http://localhost:3001/api/rag/ingest \\
  -H "Content-Type: application/json" \\
  -d '{"source":"interview-guide","text":"Your knowledge base text here"}'
```

## 6. Query the agent

```bash
curl -X POST http://localhost:3001/api/rag/query \\
  -H "Content-Type: application/json" \\
  -d '{"query":"What skills does this candidate have?"}'
```

Response contains:
- `answer`: grounded answer
- `sources`: retrieved chunks with scores
- `trace`: agent decisions (plan, retrieval, grading, optional rewrite/retrieval)

## Agent flow

1. Planner creates a retrieval query.
2. Vector retriever searches MongoDB Atlas.
3. Grader checks whether the retrieved context can answer the question.
4. If insufficient, the agent rewrites the search query and retrieves again.
5. Generator answers only from the retrieved context and cites `[SOURCE n]`.

This is deliberately framework-light so it fits your existing Express/Mongoose codebase and is easy to debug.
