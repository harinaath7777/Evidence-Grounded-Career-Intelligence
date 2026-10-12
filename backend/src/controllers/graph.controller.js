const mongoose = require("mongoose");
const KnowledgeGraph = require("../models/KnowledgeGraph");
const Resume = require("../models/Resume");
const { extractKnowledgeGraph } = require("../services/graph/graphExtractor.service");
const { analyzeGraph } = require("../services/graph/graphAnalytics.service");
const { enrichGraphWithPublicData } = require("../services/graph/githubEnrichment.service");
const { predictCompetencyLinks } = require("../services/graph/gnnClient.service");

// Helper to check ownership of resume
async function getOwnedResume(resumeId, userId) {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) return null;
  return Resume.findOne({ _id: resumeId, user: userId });
}

// Atomic & concurrency-safe get-or-create helper
async function getOrCreateGraph(resume, userId, customJobDesc = "") {
  let graph = await KnowledgeGraph.findOne({ resume: resume._id, user: userId });
  if (graph) return graph;

  const sourceText = [
    resume.content ? JSON.stringify(resume.content) : "",
    resume.sourceText,
  ].filter(Boolean).join("\n\n");

  const jobDesc = customJobDesc || resume.jobDescription || "";

  const extracted = await extractKnowledgeGraph({
    resumeText: sourceText || "Software Engineer",
    resumeContent: resume.content,
    jobDescription: jobDesc,
  });

  try {
    graph = await KnowledgeGraph.create({
      user: userId,
      resume: resume._id,
      nodes: extracted.nodes,
      edges: extracted.edges,
      stats: extracted.stats,
      targetRole: extracted.targetRole,
      summary: extracted.summary,
    });
  } catch (err) {
    if (err.code === 11000) {
      graph = await KnowledgeGraph.findOne({ resume: resume._id, user: userId });
      if (graph) return graph;
    }
    throw err;
  }

  // Enrich with GitHub public data if repos found
  try {
    await enrichGraphWithPublicData(graph, sourceText);
    await graph.save();
  } catch (err) {
    console.warn("Auto public enrichment warning:", err.message);
  }

  return graph;
}

async function getGraph(req, res, next) {
  try {
    const resume = await getOwnedResume(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    const graph = await getOrCreateGraph(resume, req.user.id);
    const analysis = analyzeGraph(graph);

    res.json({ graph, analysis });
  } catch (error) { next(error); }
}

async function rebuildGraph(req, res, next) {
  try {
    const resume = await getOwnedResume(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    const sourceText = [
      resume.content ? JSON.stringify(resume.content) : "",
      resume.sourceText,
    ].filter(Boolean).join("\n\n");

    const jobDesc = (req.body && req.body.jobDescription) ? req.body.jobDescription : (resume.jobDescription || "");

    const extracted = await extractKnowledgeGraph({
      resumeText: sourceText || "Software Engineer",
      resumeContent: resume.content,
      jobDescription: jobDesc,
    });

    let graph = await KnowledgeGraph.findOne({ resume: resume._id, user: req.user.id });

    if (!graph) {
      graph = new KnowledgeGraph({
        user: req.user.id,
        resume: resume._id,
      });
    }

    graph.nodes = extracted.nodes;
    graph.edges = extracted.edges;
    graph.stats = extracted.stats;
    graph.targetRole = extracted.targetRole;
    graph.summary = extracted.summary;

    // Enrich with public GitHub data
    try {
      await enrichGraphWithPublicData(graph, sourceText);
    } catch (err) {
      console.warn("Public enrichment warning:", err.message);
    }

    await graph.save();
    const analysis = analyzeGraph(graph);

    res.json({ graph, analysis, message: "Knowledge Graph rebuilt successfully." });
  } catch (error) { next(error); }
}

async function getGraphAnalysis(req, res, next) {
  try {
    const resume = await getOwnedResume(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    const graph = await getOrCreateGraph(resume, req.user.id);
    const report = analyzeGraph(graph);
    res.json({ analysis: report, stats: graph.stats, targetRole: graph.targetRole });
  } catch (error) { next(error); }
}

async function enrichWithGitHub(req, res, next) {
  try {
    const resume = await getOwnedResume(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    const graph = await getOrCreateGraph(resume, req.user.id);

    const sourceText = [
      resume.content ? JSON.stringify(resume.content) : "",
      resume.sourceText,
      resume.content?.website || "",
    ].filter(Boolean).join("\n\n");

    const customUsername = req.body?.githubUsername || req.body?.username || "";

    const enrichmentResult = await enrichGraphWithPublicData(graph, sourceText, customUsername);
    await graph.save();
    const analysis = analyzeGraph(graph);

    res.json({
      graph,
      analysis,
      enrichmentResult,
      message: enrichmentResult.enrichedCount > 0
        ? `Successfully enriched ${enrichmentResult.enrichedCount} GitHub repository node(s).`
        : "No public GitHub repositories found to enrich.",
    });
  } catch (error) { next(error); }
}

async function getGnnPredictions(req, res, next) {
  try {
    const resume = await getOwnedResume(req.params.id, req.user.id);
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    const graph = await getOrCreateGraph(resume, req.user.id);
    const result = await predictCompetencyLinks(graph);
    res.json(result);
  } catch (error) { next(error); }
}

module.exports = {
  getGraph,
  rebuildGraph,
  getGraphAnalysis,
  enrichWithGitHub,
  getGnnPredictions,
};
