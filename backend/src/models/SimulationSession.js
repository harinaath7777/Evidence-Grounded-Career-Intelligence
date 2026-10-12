const mongoose = require("mongoose");

const rubricDimensionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Technical Accuracy", "Diagnostic Reasoning", "Risk Awareness"
  weight: { type: Number, default: 1.0 },
  criteria: { type: String, default: "" },
}, { _id: false });

const turnEvaluationSchema = new mongoose.Schema({
  scores: { type: Map, of: Number, default: {} }, // dimension -> 0-100
  turnScore: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
  strengths: { type: [String], default: [] },
  gapsObserved: { type: [String], default: [] },
  uncertainty: { type: Number, default: 0.1 }, // 0.0 to 1.0 confidence uncertainty
}, { _id: false });

const turnSchema = new mongoose.Schema({
  turnNumber: { type: Number, required: true },
  prompt: { type: String, required: true }, // AI question or scenario challenge
  candidateAnswer: { type: String, default: "" },
  evaluation: { type: turnEvaluationSchema, default: null },
  injectedConstraint: { type: String, default: "" },
  hintProvided: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const simulationSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", default: null, index: true },
  
  // Scenario Config
  competencyTarget: { type: String, required: true }, // e.g. "Distributed Systems", "Incident Response"
  scenarioType: {
    type: String,
    required: true,
    enum: [
      "production_outage",
      "system_architecture",
      "security_incident",
      "project_deadline_conflict",
      "technical_tradeoffs",
      "stakeholder_communication",
      "team_collaboration",
      "debugging_deepdive",
    ],
  },
  difficulty: {
    type: String,
    enum: ["Junior", "Mid-Level", "Senior", "Staff/Principal"],
    default: "Senior",
  },
  roleContext: { type: String, default: "Staff Software Engineer" },

  // Generated Scenario Specification
  scenario: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    systemContext: { type: String, default: "" },
    initialTelemetry: { type: String, default: "" },
    constraints: { type: [String], default: [] },
    expectedMilestones: { type: [String], default: [] },
    rubric: { type: [rubricDimensionSchema], default: [] },
    maxTurns: { type: Number, default: 3 },
  },

  // Stateful Workflow
  status: {
    type: String,
    enum: ["active", "completed", "abandoned"],
    default: "active",
    index: true,
  },
  currentTurn: { type: Number, default: 1 },
  turns: { type: [turnSchema], default: [] },
  
  // Final Completion Report
  finalReport: {
    overallScore: { type: Number, default: null },
    verdict: { type: String, default: "" },
    dimensionBreakdown: { type: Map, of: Number, default: {} },
    keyStrengths: { type: [String], default: [] },
    criticalGaps: { type: [String], default: [] },
    practiceRecommendations: { type: [String], default: [] },
    syncedToGraph: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
}, { timestamps: true });

simulationSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SimulationSession", simulationSessionSchema);
