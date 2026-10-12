const mongoose = require("mongoose");

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      "Candidate",
      "Skill",
      "Project",
      "Employer",
      "Technology",
      "Repository",
      "JobRequirement",
      "Evidence"
    ],
  },
  label: { type: String, required: true, trim: true },
  category: { type: String, default: "general", trim: true },
  status: {
    type: String,
    enum: ["matched", "partially_matched", "missing", "unverified_claim", "verified"],
    default: "unverified_claim",
  },
  confidence: { type: Number, default: 0.7, min: 0, max: 1 },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  provenance: {
    sourceDocument: { type: String, default: "resume" },
    sourcePassage: { type: String, default: "" },
    sourceUrl: { type: String, default: "" },
    retrievalTimestamp: { type: Date, default: Date.now },
    evidenceStatus: {
      type: String,
      enum: ["claimed", "verified", "verified_by_repo", "verified_by_simulation", "inferred", "missing_evidence"],
      default: "claimed",
    },
  },
}, { _id: false });

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      "CANDIDATE_WORKED_ON_PROJECT",
      "PROJECT_USES_TECHNOLOGY",
      "PROJECT_DEMONSTRATES_SKILL",
      "CANDIDATE_CLAIMS_SKILL",
      "EMPLOYER_ASSOCIATED_WITH_ROLE",
      "REPOSITORY_CONTAINS_EVIDENCE",
      "SKILL_MATCHES_REQUIREMENT",
      "EVIDENCE_SUPPORTS_COMPETENCY",
      "SIMULATION_OBSERVED_PERFORMANCE",
    ],
  },
  weight: { type: Number, default: 1.0, min: 0, max: 1 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  provenance: {
    sourcePassage: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
}, { _id: false });

const knowledgeGraphSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, unique: true, index: true },
  nodes: { type: [nodeSchema], default: [] },
  edges: { type: [edgeSchema], default: [] },
  stats: {
    nodeCount: { type: Number, default: 0 },
    edgeCount: { type: Number, default: 0 },
    coverageScore: { type: Number, default: 0 }, // 0 to 100
    matchedSkillsCount: { type: Number, default: 0 },
    gapCount: { type: Number, default: 0 },
    verifiedCount: { type: Number, default: 0 },
  },
  targetRole: { type: String, default: "" },
  summary: { type: String, default: "" },
  lastEnrichedAt: { type: Date, default: null },
}, { timestamps: true });

knowledgeGraphSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("KnowledgeGraph", knowledgeGraphSchema);
