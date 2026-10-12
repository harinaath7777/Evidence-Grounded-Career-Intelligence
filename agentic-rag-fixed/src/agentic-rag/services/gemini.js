let aiClient;

async function getAI() {
  if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error('Missing API_KEY or GEMINI_API_KEY in environment');
  }

  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
    });
  }

  return aiClient;
}

async function generateText(contents, config = {}) {
  const ai = await getAI();
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents,
    config,
  });

  return response.text || '';
}

async function embedText(text) {
  const ai = await getAI();
  const response = await ai.models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error('Gemini returned no embedding');
  return values;
}

async function embedTexts(texts) {
  if (!texts.length) return [];
  const ai = await getAI();
  const response = await ai.models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    contents: texts,
    config: { outputDimensionality: 768 },
  });

  return (response.embeddings || []).map((embedding) => embedding.values);
}

module.exports = { generateText, embedText, embedTexts };
