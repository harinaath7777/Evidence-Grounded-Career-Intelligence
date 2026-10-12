const KnowledgeGraph = require("../../models/KnowledgeGraph");

/**
 * Synchronizes a completed simulation performance record into the candidate's Knowledge Graph
 * Creates distinct Evidence node and SIMULATION_OBSERVED_PERFORMANCE typed edge.
 */
async function syncSimulationToGraph(session) {
  if (session.status !== "completed" || !session.finalReport?.overallScore) {
    const error = new Error("Session must be completed with final report before syncing.");
    error.status = 400;
    throw error;
  }

  if (!session.resume) {
    return { synced: false, reason: "No resume associated with this simulation session." };
  }

  const graph = await KnowledgeGraph.findOne({ resume: session.resume, user: session.user });
  if (!graph) {
    return { synced: false, reason: "Knowledge Graph not found for associated resume." };
  }

  const competencyName = session.competencyTarget;
  const score = session.finalReport.overallScore;
  const verdict = session.finalReport.verdict;

  // 1. Locate candidate node
  const candidateNode = graph.nodes.find(n => n.type === "Candidate") || { id: "candidate-primary" };

  // 2. Locate or create targeted Skill / Requirement node
  let targetSkillNode = graph.nodes.find(
    n => (n.type === "Skill" || n.type === "JobRequirement") &&
      n.label.toLowerCase() === competencyName.toLowerCase()
  );

  if (!targetSkillNode) {
    targetSkillNode = {
      id: `skill-${competencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      type: "Skill",
      label: competencyName,
      category: "simulation_verified",
      status: score >= 70 ? "verified" : "partially_matched",
      confidence: Math.min(1.0, score / 100),
      properties: { verifiedBySimulation: true },
      provenance: {
        sourceDocument: "interactive_simulation",
        sourcePassage: `Assessed via simulation session ${session._id}`,
        sourceUrl: "",
        retrievalTimestamp: new Date(),
        evidenceStatus: "verified_by_simulation",
      },
    };
    graph.nodes.push(targetSkillNode);
  } else {
    // Update existing node status if demonstrated successfully
    if (score >= 70) {
      targetSkillNode.status = "verified";
      targetSkillNode.confidence = Math.max(targetSkillNode.confidence, score / 100);
      targetSkillNode.provenance.evidenceStatus = "verified_by_simulation";
      targetSkillNode.provenance.retrievalTimestamp = new Date();
    }
  }

  // 3. Create discrete Evidence node for the simulation test
  const evidenceNodeId = `evidence-sim-${session._id}`;
  let evidenceNode = graph.nodes.find(n => n.id === evidenceNodeId);

  if (!evidenceNode) {
    evidenceNode = {
      id: evidenceNodeId,
      type: "Evidence",
      label: `Simulation Result: ${competencyName} (${score}/100)`,
      category: "simulation_benchmark",
      status: "verified",
      confidence: Math.min(1.0, score / 100),
      properties: {
        sessionId: String(session._id),
        scenarioTitle: session.scenario.title,
        overallScore: score,
        verdict,
        difficulty: session.difficulty,
        dimensionBreakdown: Object.fromEntries(session.finalReport.dimensionBreakdown || new Map()),
        completedAt: session.finalReport.completedAt,
      },
      provenance: {
        sourceDocument: "simulation_session",
        sourcePassage: `Observed performance: ${verdict} (${score}/100) in scenario "${session.scenario.title}" across ${session.turns.length} turns.`,
        sourceUrl: "",
        retrievalTimestamp: new Date(),
        evidenceStatus: "verified_by_simulation",
      },
    };
    graph.nodes.push(evidenceNode);
  }

  // 4. Create SIMULATION_OBSERVED_PERFORMANCE typed edge (Candidate -> Skill)
  const simEdgeId = `edge-sim-perf-${candidateNode.id}-${targetSkillNode.id}-${session._id}`;
  if (!graph.edges.some(e => e.id === simEdgeId)) {
    graph.edges.push({
      id: simEdgeId,
      source: candidateNode.id,
      target: targetSkillNode.id,
      type: "SIMULATION_OBSERVED_PERFORMANCE",
      weight: score / 100,
      metadata: {
        sessionId: String(session._id),
        score,
        verdict,
        difficulty: session.difficulty,
        isSimulationEvidence: true,
      },
      provenance: {
        sourcePassage: `Multi-turn simulation assessment verified competency.`,
        timestamp: new Date(),
      },
    });
  }

  // 5. Connect Evidence node to Skill node
  const evidenceEdgeId = `edge-evid-supp-${evidenceNode.id}-${targetSkillNode.id}`;
  if (!graph.edges.some(e => e.id === evidenceEdgeId)) {
    graph.edges.push({
      id: evidenceEdgeId,
      source: evidenceNode.id,
      target: targetSkillNode.id,
      type: "EVIDENCE_SUPPORTS_COMPETENCY",
      weight: 1.0,
      metadata: {
        score,
        verdict,
      },
      provenance: {
        sourcePassage: `Rubric-evaluated simulation performance data.`,
        timestamp: new Date(),
      },
    });
  }

  // 6. Recalculate stats
  const verifiedCount = graph.nodes.filter(
    n => n.status === "verified" || n.provenance?.evidenceStatus?.startsWith("verified")
  ).length;

  graph.stats.nodeCount = graph.nodes.length;
  graph.stats.edgeCount = graph.edges.length;
  graph.stats.verifiedCount = verifiedCount;

  await graph.save();

  session.finalReport.syncedToGraph = true;
  await session.save();

  return {
    synced: true,
    graphId: graph._id,
    targetSkillNode: targetSkillNode.label,
    evidenceNodeId,
    overallScore: score,
  };
}

module.exports = {
  syncSimulationToGraph,
};
