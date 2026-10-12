const { GoogleGenAI } = require("@google/genai");

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("AI is not configured. Add GEMINI_API_KEY to backend/.env.");
    error.status = 503;
    throw error;
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function generateText(prompt, { json = false } = {}) {
  const ai = getClient();
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: json ? { responseMimeType: "application/json" } : undefined,
        });
        if (response.text) return response.text;
      } catch (err) {
        lastError = err;
        const msg = err.message || "";
        const is503 = msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE");
        const is404 = msg.includes("404") || msg.includes("NOT_FOUND");
        const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");

        if (is503 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        if (is404 || is503 || is429) {
          break; // move to next fallback model
        }
        throw err;
      }
    }
  }

  throw lastError || new Error("The AI service is currently busy. Please try again in a few moments.");
}

async function generateJson(prompt) {
  const raw = await generateText(prompt, { json: true });
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); }
  catch {
    const error = new Error("The AI returned an unreadable response. Please try again.");
    error.status = 502;
    throw error;
  }
}

module.exports = { generateText, generateJson };

