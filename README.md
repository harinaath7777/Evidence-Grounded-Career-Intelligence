# CareerCanvas — AI Resume Studio

A full-stack starter project built around the supplied React/Vite frontend and Express/Mongoose backend. It includes JWT authentication with server-side token revocation, PDF resume upload and analysis, a section editor, an ATS-friendly PDF export, and resume-grounded AI chat.

## Stack

- **Frontend:** React 19, Vite, React Router, Axios, Lucide icons, plain CSS
- **Backend:** Node.js, Express 5, MongoDB/Mongoose, JWT, bcryptjs, Multer
- **AI:** Google Gemini via `@google/genai`
- **PDF:** `pdf-parse` text extraction and Puppeteer HTML-to-PDF export

## Features

- Register, sign in, check current session, and sign out.
- HttpOnly session cookie; JWT is verified on protected routes.
- SHA-256 hashed JWT blacklist entries with MongoDB TTL expiry on logout.
- Upload text-based PDFs and optionally provide a job description.
- Gemini extracts resume facts into structured sections and returns resume feedback, skill alignment, ATS heuristic findings, and interview question outlines.
- Edit contact details, summary, skills, experience, projects, education, certifications, and target job description.
- Save edits to MongoDB and export an A4 PDF with ATS-conscious formatting.
- Resume chat retrieves relevant chunks from the saved resume and job description before generating a response. The chat advises but does not silently mutate saved resume fields; copy a draft into the editor and save it.
- Users can only read/update/export/delete their own resume records.

## Requirements

- Node.js 20+ recommended
- MongoDB running locally or a MongoDB connection string
- A Google Gemini API key for AI analysis and chat
- Puppeteer may need system libraries on Linux hosts; use a compatible deployment image.

## Setup

1. Create your local backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`. Never commit `.env`.

3. Install dependencies from the project root:

   ```bash
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

4. Start both development servers:

   ```bash
   npm run dev
   ```

   Frontend: `http://localhost:5173`  
   API: `http://localhost:3001/api`  
   Health check: `http://localhost:3001/api/health`

5. Create an account in the UI, upload a selectable-text PDF, and optionally paste the job description for role-specific insights.

## Useful commands

```bash
npm run dev                 # backend + frontend
npm run build               # production frontend build
npm --prefix backend start  # start API (configure backend/.env first)
npm --prefix frontend run lint
```

## API routes

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/logout` | Yes | Revoke current JWT and clear cookie |
| GET | `/api/resumes` | Yes | List user's resumes |
| POST | `/api/resumes` | Yes | Create an empty resume |
| POST | `/api/resumes/analyze` | Yes | Upload `resume` PDF plus optional `jobDescription` |
| GET | `/api/resumes/:id` | Yes | Get resume |
| PUT | `/api/resumes/:id` | Yes | Save title, content, and/or job description |
| POST | `/api/resumes/:id/analyze` | Yes | Re-run analysis on saved content |
| GET | `/api/resumes/:id/export.pdf` | Yes | Export PDF |
| DELETE | `/api/resumes/:id` | Yes | Delete resume |
| POST | `/api/chat` | Yes | Body: `{ "resumeId": "...", "question": "...", "history": [] }` |
| **Research A** | **Knowledge Graph** | | |
| GET | `/api/graph/resume/:id` | Yes | Retrieve evidence-grounded knowledge graph |
| POST | `/api/graph/resume/:id/rebuild` | Yes | Re-extract & normalize knowledge graph from resume |
| GET | `/api/graph/resume/:id/analysis` | Yes | Graph traversal, evidence quality & competency gaps report |
| POST | `/api/graph/resume/:id/enrich-github` | Yes | Public GitHub repository metadata enrichment with caching |
| GET | `/api/graph/resume/:id/gnn-predict` | Yes | GNN research link prediction (or fallback baseline) |
| **Research B** | **Simulation Studio** | | |
| GET | `/api/simulations` | Yes | List candidate's simulation sessions |
| POST | `/api/simulations/start` | Yes | Generate tailored scenario, constraints & explicit rubric |
| GET | `/api/simulations/:id` | Yes | Get active simulation state and conversation timeline |
| POST | `/api/simulations/:id/turn` | Yes | Submit answer, score against rubric, advance turn/inject constraints |
| POST | `/api/simulations/:id/hint` | Yes | Request contextual diagnostic hint |
| POST | `/api/simulations/:id/complete` | Yes | Finalize session and synthesize comprehensive report |
| POST | `/api/simulations/:id/sync-to-graph` | Yes | Sync simulation outcome into Knowledge Graph as verified evidence |

## Security and implementation notes

- Use a unique, long `JWT_SECRET`; keep the Gemini key only on the server.
- The JWT is stored in an HttpOnly cookie. If deploying across sites, configure `SameSite`/`Secure` and CSRF protection to fit the deployment topology.
- The token blacklist stores a SHA-256 digest, not the raw token, and TTL cleanup follows the token expiration timestamp.
- File upload is memory-backed with an 8 MB default limit. For high-volume deployment, move uploads to private object storage and add rate limiting.
- PDF text extraction only reads selectable text. Scanned/image-only PDFs need OCR, which this starter does not include.
- The ATS score is an AI-generated heuristic, not a guarantee of passing any employer's ATS.
- Gemini output can be inaccurate. Verify every suggested fact and never add untrue metrics or credentials.
- RAG here is lightweight retrieval over chunks from each resume/job description, selected by lexical overlap and passed to Gemini as context. It is not a vector database implementation. For a production-scale corpus, use embeddings/vector search and access controls.
- No generated PDF or uploaded file is publicly hosted; export is streamed only after ownership checks.

## Troubleshooting

- **MongoDB connection error:** confirm MongoDB is running and `MONGODB_URI` is correct.
- **AI not configured:** set `GEMINI_API_KEY` in `backend/.env`, then restart the API.
- **No text found in PDF:** try a text-selectable PDF or add OCR support.
- **Puppeteer launch error:** use a deployment image with Chromium dependencies and allow the required sandbox configuration.
- **Browser cannot reach API:** confirm the API is on port 3001 and set `CLIENT_URL` to the exact frontend origin.
