const { GoogleGenAI } = require('@google/genai');

let aiClient;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    const error = new Error('Missing GEMINI_API_KEY or API_KEY in environment');
    error.status = 503;
    throw error;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
}

async function generateText(contents, config = {}) {
  const ai = getAI();
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError;
  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        return response.text || '';
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const is503 = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE');
        const is404 = msg.includes('404') || msg.includes('NOT_FOUND');
        const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');

        if (is503 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        if (is404 || is503 || is429) {
          break; // Try next fallback model
        }
        throw err;
      }
    }
  }

  throw lastError || new Error('The AI service is currently unavailable. Please try again.');
}

async function embedText(text) {
  const ai = getAI();
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  const response = await ai.models.embedContent({
    model,
    contents: text,
    config: { outputDimensionality: 768 },
  });

  const values = response.embeddings?.[0]?.values || response.embedding?.values;
  if (!values?.length) throw new Error('Gemini returned no embedding');
  return values;
}

async function embedTexts(texts) {
  if (!texts.length) return [];
  const ai = getAI();
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  
  // Embed sequentially or in parallel batches to handle API limits
  const results = [];
  for (const text of texts) {
    const res = await ai.models.embedContent({
      model,
      contents: text,
      config: { outputDimensionality: 768 },
    });
    const vals = res.embeddings?.[0]?.values || res.embedding?.values;
    if (vals) results.push(vals);
  }

  return results;
}

module.exports = { generateText, embedText, embedTexts };
