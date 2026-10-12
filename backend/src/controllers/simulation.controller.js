const SimulationSession = require("../models/SimulationSession");
const Resume = require("../models/Resume");
const { generateScenario } = require("../services/simulation/scenarioGenerator");
const { processTurn, provideHint } = require("../services/simulation/turnController");
const { generateFinalSimulationReport } = require("../services/simulation/responseEvaluator");
const { syncSimulationToGraph } = require("../services/simulation/graphSimulationSync.service");

// Session owner filter helper
const sessionOwnerFilter = (req) => ({ _id: req.params.id, user: req.user.id });

async function listSessions(req, res, next) {
  try {
    const query = { user: req.user.id };
    if (req.query.resumeId) query.resume = req.query.resumeId;

    const sessions = await SimulationSession.find(query)
      .select("competencyTarget scenarioType difficulty scenario.title status currentTurn finalReport createdAt")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ sessions });
  } catch (error) { next(error); }
}

async function getSession(req, res, next) {
  try {
    const session = await SimulationSession.findOne(sessionOwnerFilter(req));
    if (!session) return res.status(404).json({ message: "Simulation session not found." });
    res.json({ session });
  } catch (error) { next(error); }
}

async function startSimulation(req, res, next) {
  try {
    const {
      resumeId,
      competencyTarget,
      scenarioType = "production_outage",
      difficulty = "Senior",
      roleContext = "Software Engineer",
    } = req.body;

    if (!competencyTarget || !String(competencyTarget).trim()) {
      return res.status(400).json({ message: "Competency target is required." });
    }

    let resumeContext = "";
    let jobDescription = "";
    let resumeRef = null;

    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.user.id });
      if (resume) {
        resumeRef = resume._id;
        jobDescription = resume.jobDescription || "";
        resumeContext = [
          resume.content?.summary || "",
          (resume.content?.skills || []).join(", "),
          resume.sourceText ? resume.sourceText.slice(0, 2000) : "",
        ].filter(Boolean).join("\n\n");
      }
    }

    const scenarioSpec = await generateScenario({
      competencyTarget: String(competencyTarget).trim(),
      scenarioType,
      difficulty,
      roleContext,
      resumeContext,
      jobDescription,
    });

    const session = await SimulationSession.create({
      user: req.user.id,
      resume: resumeRef,
      competencyTarget: String(competencyTarget).trim(),
      scenarioType,
      difficulty,
      roleContext,
      scenario: {
        title: scenarioSpec.title,
        description: scenarioSpec.description,
        systemContext: scenarioSpec.systemContext,
        initialTelemetry: scenarioSpec.initialTelemetry,
        constraints: scenarioSpec.constraints,
        expectedMilestones: scenarioSpec.expectedMilestones,
        rubric: scenarioSpec.rubric,
        maxTurns: scenarioSpec.maxTurns,
      },
      status: "active",
      currentTurn: 1,
      turns: [
        {
          turnNumber: 1,
          prompt: scenarioSpec.turn1Prompt,
          candidateAnswer: "",
          injectedConstraint: "",
          hintProvided: "",
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json({ session });
  } catch (error) { next(error); }
}

async function submitTurn(req, res, next) {
  try {
    const { answer } = req.body;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({ message: "Answer cannot be empty." });
    }

    const session = await SimulationSession.findOne(sessionOwnerFilter(req));
    if (!session) return res.status(404).json({ message: "Simulation session not found." });

    const updatedSession = await processTurn(session, answer);
    res.json({ session: updatedSession });
  } catch (error) { next(error); }
}

async function requestHint(req, res, next) {
  try {
    const session = await SimulationSession.findOne(sessionOwnerFilter(req));
    if (!session) return res.status(404).json({ message: "Simulation session not found." });

    const hintData = await provideHint(session);
    res.json(hintData);
  } catch (error) { next(error); }
}

async function completeSimulation(req, res, next) {
  try {
    const session = await SimulationSession.findOne(sessionOwnerFilter(req));
    if (!session) return res.status(404).json({ message: "Simulation session not found." });

    if (session.status !== "completed") {
      session.status = "completed";
      session.finalReport = await generateFinalSimulationReport(session);
      await session.save();
    }

    res.json({ session });
  } catch (error) { next(error); }
}

async function syncToGraph(req, res, next) {
  try {
    const session = await SimulationSession.findOne(sessionOwnerFilter(req));
    if (!session) return res.status(404).json({ message: "Simulation session not found." });

    const syncResult = await syncSimulationToGraph(session);
    res.json({ syncResult, session });
  } catch (error) { next(error); }
}

module.exports = {
  listSessions,
  getSession,
  startSimulation,
  submitTurn,
  requestHint,
  completeSimulation,
  syncToGraph,
};
