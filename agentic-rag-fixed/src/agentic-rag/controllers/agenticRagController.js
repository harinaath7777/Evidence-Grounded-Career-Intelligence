const crypto = require('node:crypto');
const { PDFParse } = require('pdf-parse');
const { indexDocument } = require('../services/vectorStore');
const { runAgent } = require('../services/agent');

async function ingest(req, res) {
  try {
    let text = req.body?.text || '';
    let source = req.body?.source || 'manual-text';

    if (req.file) {
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Only PDF files are supported by this endpoint' });
      }

      // pdf-parse v2 uses PDFParse instead of the old pdfParse(buffer) API.
      const parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      text = parsed.text || '';
      source = req.file.originalname;
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Provide text or a PDF file' });
    }

    const documentId = req.body?.documentId || crypto.randomUUID();
    const ownerId = req.user?.id || req.user?._id || req.body?.ownerId || null;

    const result = await indexDocument({
      documentId,
      ownerId: ownerId ? String(ownerId) : null,
      source,
      text,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('RAG ingest error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to index document',
    });
  }
}

async function query(req, res) {
  try {
    const question = String(req.body?.query || '').trim();
    if (!question) {
      return res.status(400).json({ error: 'query is required' });
    }

    const ownerId = req.user?.id || req.user?._id || req.body?.ownerId || null;
    const result = await runAgent({
      query: question,
      ownerId: ownerId ? String(ownerId) : null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Agentic RAG error:', error);
    return res.status(500).json({
      error: error.message || 'Agentic RAG failed',
    });
  }
}

module.exports = { ingest, query };
