const { generateText } = require("./gemini.service");

function chunkText(text, maxChars = 900, overlap = 120) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\n", end);
      if (boundary > start + maxChars * 0.55) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

function retrieveRelevantChunks(text, query, limit = 5) {
  const chunks = chunkText(text);
  const terms = [...new Set(String(query).toLowerCase().match(/[a-z0-9+#.-]{2,}/g) || [])];
  if (!terms.length) return chunks.slice(0, limit);
  return chunks.map((content, index) => {
    const lower = content.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 + Math.min(2, (lower.split(term).length - 1) * 0.15) : 0), 0);
    return { content, index, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.content);
}

async function answerResumeQuestion({ resume, question, history = [] }) {
  const resumeText = [
    resume.sourceText,
    JSON.stringify(resume.content || {}),
    resume.jobDescription ? `TARGET JOB DESCRIPTION:\n${resume.jobDescription}` : ""
  ].filter(Boolean).join("\n\n");
  const context = retrieveRelevantChunks(resumeText, question, 5);
  const transcript = history.slice(-8).map(item => `${item.role === "assistant" ? "Assistant" : "User"}: ${String(item.content || "").slice(0, 1500)}`).join("\n");
  const prompt = `You are a careful resume-writing coach. Use the supplied resume context as the source of truth. Never invent employers, dates, degrees, metrics, skills, or achievements. If facts are missing, say what information is needed and offer a clearly labeled placeholder. You may suggest improved wording and draft resume-ready bullets, but distinguish suggestions from verified facts. Keep the answer practical and concise.

RESUME CONTEXT (retrieved excerpts):
${context.join("\n\n---\n\n") || "No relevant excerpts were found. Ask the user for the missing information rather than inventing details."}

RECENT CONVERSATION:
${transcript || "(none)"}

USER QUESTION:
${question}

When asked to update content, return a useful draft and name the section it belongs in. Do not claim that the saved resume has changed; the user must explicitly save an edit.`;
  return generateText(prompt);
}

module.exports = { chunkText, retrieveRelevantChunks, answerResumeQuestion };
