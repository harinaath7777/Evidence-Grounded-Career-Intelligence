const Resume = require("../models/Resume");
const { extractPdfText } = require("../services/pdf.service");
const { 
  analyzeResume, 
  generateTop10InterviewQuestions, 
  evaluateInterviewAnswer, 
  structureResume 
} = require("../services/resume.service");
const { renderResumePdf } = require("../services/export.service");

const ownerFilter = (req) => ({ _id: req.params.id, user: req.user.id });

async function listResumes(req, res, next) {
  try {
    const resumes = await Resume.find({ user: req.user.id }).select("title analysis createdAt updatedAt content.fullName").sort({ updatedAt: -1 });
    res.json({ resumes });
  } catch (error) { next(error); }
}

async function getResume(req, res, next) {
  try {
    const resume = await Resume.findOne(ownerFilter(req));
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    res.json({ resume });
  } catch (error) { next(error); }
}

async function createResume(req, res, next) {
  try {
    const resume = await Resume.create({
      user: req.user.id,
      title: String(req.body.title || "My resume").trim().slice(0, 120),
      jobDescription: String(req.body.jobDescription || "").slice(0, 10000),
      content: req.body.content || {},
    });
    res.status(201).json({ resume });
  } catch (error) { next(error); }
}

async function updateResume(req, res, next) {
  try {
    const allowed = {};
    if (typeof req.body.title === "string") allowed.title = req.body.title.trim().slice(0, 120);
    if (typeof req.body.jobDescription === "string") allowed.jobDescription = req.body.jobDescription.slice(0, 10000);
    if (req.body.content && typeof req.body.content === "object") allowed.content = req.body.content;
    const resume = await Resume.findOneAndUpdate(ownerFilter(req), { $set: allowed }, { new: true, runValidators: true });
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    res.json({ resume });
  } catch (error) { next(error); }
}

async function uploadAndAnalyze(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a PDF file to upload." });
    const text = await extractPdfText(req.file.buffer);
    if (!text.trim()) return res.status(422).json({ message: "No selectable text was found. Scanned PDFs need OCR before analysis." });
    const jobDescription = String(req.body.jobDescription || "").slice(0, 10000);
    const [content, analysis] = await Promise.all([
      structureResume(text),
      analyzeResume({ resumeText: text, jobDescription }),
    ]);
    const resume = await Resume.create({
      user: req.user.id,
      title: content.fullName ? `${content.fullName}'s resume` : req.file.originalname.replace(/\.pdf$/i, "").slice(0, 120),
      sourceText: text.slice(0, 50000),
      jobDescription,
      content,
      analysis,
    });

    // Asynchronously index in background for Agentic RAG
    try {
      const { indexDocument } = require("../agentic-rag/services/vectorStore");
      indexDocument({
        documentId: String(resume._id),
        ownerId: String(req.user.id),
        source: resume.title,
        text: [text, jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : ""].filter(Boolean).join("\n\n"),
      }).catch(err => console.warn("Background Agentic RAG index notice:", err.message));
    } catch {}

    res.status(201).json({ resume });
  } catch (error) { next(error); }
}

function formatStructuredResume(content) {
  if (!content) return "";
  const parts = [];
  if (content.fullName) parts.push(`Full Name: ${content.fullName}`);
  if (content.email || content.phone || content.location) {
    parts.push(`Contact: ${[content.email, content.phone, content.location, content.website].filter(Boolean).join(" · ")}`);
  }
  if (content.summary) parts.push(`Professional Summary:\n${content.summary}`);
  if (content.skills?.length) parts.push(`Skills:\n${content.skills.join(", ")}`);
  if (content.experience?.length) {
    parts.push("Work Experience:\n" + content.experience.map(e => `${e.role || "Role"} at ${e.company || "Company"} (${e.startDate || ""} - ${e.endDate || ""})\n${(e.bullets || []).join("\n")}`).join("\n\n"));
  }
  if (content.projects?.length) {
    parts.push("Projects:\n" + content.projects.map(p => `${p.name || "Project"} (${(p.technologies || []).join(", ")})\n${(p.bullets || []).join("\n")}`).join("\n\n"));
  }
  if (content.education?.length) {
    parts.push("Education:\n" + content.education.map(ed => `${ed.degree || "Degree"} at ${ed.institution || "Institution"} (${ed.startDate || ""} - ${ed.endDate || ""})\n${(ed.details || []).join("\n")}`).join("\n\n"));
  }
  if (content.certifications?.length) {
    parts.push(`Certifications:\n${content.certifications.join("\n")}`);
  }
  return parts.join("\n\n");
}

async function reanalyzeResume(req, res, next) {
  try {
    const resume = await Resume.findOne(ownerFilter(req));
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    if (req.body.content && typeof req.body.content === "object") resume.content = req.body.content;
    if (typeof req.body.jobDescription === "string") resume.jobDescription = req.body.jobDescription;
    if (typeof req.body.title === "string") resume.title = req.body.title;

    const structured = formatStructuredResume(resume.content);
    const source = [structured, resume.sourceText].filter(Boolean).join("\n\n--- ORIGINAL TEXT ---\n\n");

    if (!source.trim()) return res.status(400).json({ message: "Add resume content before analysis." });

    resume.analysis = await analyzeResume({ resumeText: source, jobDescription: resume.jobDescription });
    await resume.save();

    try {
      const { indexDocument } = require("../agentic-rag/services/vectorStore");
      indexDocument({
        documentId: String(resume._id),
        ownerId: String(req.user.id),
        source: resume.title || "Resume",
        text: [source, resume.jobDescription ? `TARGET JOB:\n${resume.jobDescription}` : ""].filter(Boolean).join("\n\n"),
      }).catch(err => console.warn("Agentic RAG re-index notice:", err.message));
    } catch {}

    res.json({ resume });
  } catch (error) { next(error); }
}

async function deleteResume(req, res, next) {
  try {
    const resume = await Resume.findOneAndDelete(ownerFilter(req));
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    res.json({ message: "Resume deleted." });
  } catch (error) { next(error); }
}

async function exportPdf(req, res, next) {
  try {
    const resume = await Resume.findOne(ownerFilter(req));
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    const pdf = await renderResumePdf(resume);
    const rawName = (resume.content?.fullName || resume.title || "resume").replace(/\.pdf$/i, "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-");
    const filename = `${rawName || "resume"}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) { next(error); }
}

async function getInterviewQuestions(req, res, next) {
  try {
    const resume = await Resume.findOne(ownerFilter(req));
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    let questions = resume.analysis?.interviewQuestions || [];
    const forceRegenerate = req.query.fresh === "true" || req.body?.fresh === true;

    if (!questions.length || questions.length < 10 || forceRegenerate) {
      const structured = formatStructuredResume(resume.content);
      const source = [structured, resume.sourceText].filter(Boolean).join("\n\n");
      const generated = await generateTop10InterviewQuestions({
        resumeText: source || "Software Engineer",
        jobDescription: resume.jobDescription || "",
      });

      if (Array.isArray(generated) && generated.length > 0) {
        questions = generated;
        if (!resume.analysis) resume.analysis = {};
        resume.analysis.interviewQuestions = questions;
        await resume.save();
      }
    }

    res.json({ questions });
  } catch (error) { next(error); }
}

async function evaluateInterview(req, res, next) {
  try {
    const { question, reason, sampleAnswerOutline, userAnswer } = req.body;
    if (!question) return res.status(400).json({ message: "Question is required." });

    const evaluation = await evaluateInterviewAnswer({
      question,
      reason,
      sampleAnswerOutline,
      userAnswer,
    });

    res.json({ evaluation });
  } catch (error) { next(error); }
}

module.exports = { 
  listResumes, 
  getResume, 
  createResume, 
  updateResume, 
  uploadAndAnalyze, 
  reanalyzeResume, 
  deleteResume, 
  exportPdf,
  getInterviewQuestions,
  evaluateInterview,
};
