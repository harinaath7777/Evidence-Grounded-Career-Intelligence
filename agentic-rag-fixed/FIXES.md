# Backend fixes

## 1. pdf-parse v2 API
Your project has pdf-parse 2.4.5. The old RAG controller used `pdfParse(buffer)`, which is not the v2 API. The fixed controller uses:

```js
const { PDFParse } = require('pdf-parse');
const parser = new PDFParse({ data: req.file.buffer });
const parsed = await parser.getText();
```

## 2. Register RAG routes
Your existing `src/app.js` only registers auth and interview routes. Add:

```js
const agenticRagRouter = require('./agentic-rag/routes/agenticRagRoutes');
app.use('/api/rag', agenticRagRouter);
```

`APP.JS.PATCH.js` is a complete replacement based on your uploaded app.js.

## 3. Existing interview controller bug
The uploaded controller has:

```js
.find({user:req.user.id}.sort(...))
```

The `.sort()` must be chained after `.find()`:

```js
.find({ user: req.user.id })
.sort({ createdAt: -1 })
```

`interview.controller.PATCH.js` contains the corrected function.

## 4. Node version
Your lockfile shows `pdf-parse` 2.4.5 requires Node >=20.16.0 (or >=22.3.0), while the installed Google GenAI SDK requires Node >=20.0. Use Node 22 LTS or a compatible Node 20 release.

## 5. Environment
Keep your existing Gemini key variable. The RAG code accepts `GEMINI_API_KEY` and falls back to `API_KEY`.

Do not commit `.env`.
