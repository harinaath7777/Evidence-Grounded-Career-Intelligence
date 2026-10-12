const Resume = require("../models/Resume");
const { answerResumeQuestion } = require("../services/rag.service");
const RagChunk = require("../agentic-rag/models/RagChunk");
const { indexDocument } = require("../agentic-rag/services/vectorStore");
const { runAgent } = require("../agentic-rag/services/agent");

async function chat(req, res, next) {
  try {
    const resumeId = String(req.body.resumeId || "");
    const question = String(req.body.question || "").trim();
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];
    if (!question) return res.status(400).json({ message: "Enter a question or resume-writing request." });
    if (question.length > 4000) return res.status(400).json({ message: "Question must be 4,000 characters or fewer." });
    const resume = await Resume.findOne({ _id: resumeId, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    // Ensure resume is indexed in Agentic RAG vector store
    const chunkCount = await RagChunk.countDocuments({ documentId: String(resume._id) });
    if (chunkCount === 0) {
      const fullText = [
        resume.sourceText,
        JSON.stringify(resume.content || {}),
        resume.jobDescription ? `TARGET JOB DESCRIPTION:\n${resume.jobDescription}` : ""
      ].filter(Boolean).join("\n\n");

      if (fullText.trim()) {
        try {
          await indexDocument({
            documentId: String(resume._id),
            ownerId: String(req.user.id),
            source: resume.title || "Resume",
            text: fullText,
          });
        } catch (idxErr) {
          console.warn("Agentic RAG on-demand index warning:", idxErr.message);
        }
      }
    }

    try {
      const agentResult = await runAgent({
        query: question,
        ownerId: String(req.user.id),
        documentId: String(resume._id),
        history,
      });

      return res.json({
        answer: agentResult.answer,
        sources: agentResult.sources,
        trace: agentResult.trace,
        engine: "agentic-rag",
      });
    } catch (agentErr) {
      console.warn("Agentic RAG fallback to lexical RAG:", agentErr.message);
      const answer = await answerResumeQuestion({ resume, question, history });
      return res.json({ answer, engine: "lexical-fallback" });
    }
  } catch (error) { next(error); }
}

module.exports = { chat };
