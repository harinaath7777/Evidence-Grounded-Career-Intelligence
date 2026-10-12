const { generateJson } = require("../gemini.service");

/**
 * Evaluates candidate answer for a single turn against the explicit scenario rubric
 */
async function evaluateTurnResponse({
  scenario,
  turnNumber,
  turnPrompt,
  candidateAnswer,
  injectedConstraint = "",
  priorTurns = [],
}) {
  const rubricText = scenario.rubric.map(r => `- ${r.name} (weight: ${r.weight}): ${r.criteria}`).join("\n");

  const prompt = `You are a Principal Engineering Assessor.
Evaluate the candidate's response to Turn ${turnNumber} of this simulation.

SCENARIO TITLE: ${scenario.title}
SCENARIO CONTEXT: ${scenario.description}
CONSTRAINTS: ${scenario.constraints.join("; ")}
${injectedConstraint ? `DYNAMIC CONSTRAINT INJECTED THIS TURN: ${injectedConstraint}` : ""}

TURN CHALLENGE:
${turnPrompt}

CANDIDATE'S RESPONSE:
${candidateAnswer || "(Candidate submitted blank response)"}

EVALUATION RUBRIC:
${rubricText}

CRITICAL RULES:
1. Score each rubric dimension from 0 to 100 based strictly on observed reasoning and technical depth.
2. Provide objective, constructive feedback grounded only in engineering practices.
3. Highlight 1-3 specific strengths shown in their answer.
4. Highlight 1-3 concrete missing details, blind spots, or omitted risk factors.
5. Provide an uncertainty metric (between 0.05 and 0.25) reflecting how much information was observable.
6. Do NOT make psychological or general personal worth claims. Evaluate only the demonstrated problem solving in this scenario.

Return ONLY a JSON object with this schema:
{
  "scores": {
    "Technical Accuracy": 85,
    "Diagnostic Reasoning": 80,
    "Evidence-Based Decisions": 75,
    "Prioritization": 90,
    "Risk Awareness": 70,
    "Explanation of Trade-offs": 80,
    "Communication Clarity": 85
  },
  "feedback": "2-3 sentences of direct constructive feedback on their answer.",
  "strengths": ["...", "..."],
  "gapsObserved": ["...", "..."],
  "uncertainty": 0.12
}`;

  const result = await generateJson(prompt);

  // Compute weighted turn score deterministically
  const scoresMap = new Map();
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of scenario.rubric) {
    const rawScore = Number(result?.scores?.[dim.name] ?? 70);
    const clampedScore = Math.min(100, Math.max(0, rawScore));
    scoresMap.set(dim.name, clampedScore);

    const weight = Number(dim.weight || 1.0);
    totalWeight += weight;
    weightedSum += clampedScore * weight;
  }

  const turnScore = Math.round(totalWeight > 0 ? weightedSum / totalWeight : 70);

  return {
    scores: Object.fromEntries(scoresMap),
    turnScore,
    feedback: String(result.feedback || "Evaluated based on standard rubric criteria."),
    strengths: Array.isArray(result.strengths) ? result.strengths : ["Structured approach"],
    gapsObserved: Array.isArray(result.gapsObserved) ? result.gapsObserved : ["Could elaborate on verification steps"],
    uncertainty: Math.min(0.3, Math.max(0.05, Number(result.uncertainty) || 0.1)),
  };
}

/**
 * Compiles a comprehensive final report after all simulation turns
 */
async function generateFinalSimulationReport(session) {
  const turns = session.turns || [];
  if (turns.length === 0) {
    return {
      overallScore: 0,
      verdict: "Incomplete Session",
      dimensionBreakdown: {},
      keyStrengths: [],
      criticalGaps: [],
      practiceRecommendations: ["Complete full turns to receive comprehensive evaluation."],
    };
  }

  // Calculate dimension averages across all turns
  const dimTotals = {};
  const dimCounts = {};
  let totalTurnScores = 0;

  for (const turn of turns) {
    if (!turn.evaluation) continue;
    totalTurnScores += turn.evaluation.turnScore || 0;

    const scores = turn.evaluation.scores || {};
    for (const [dim, val] of Object.entries(scores)) {
      dimTotals[dim] = (dimTotals[dim] || 0) + val;
      dimCounts[dim] = (dimCounts[dim] || 0) + 1;
    }
  }

  const evaluatedTurnsCount = turns.filter(t => t.evaluation).length || 1;
  const overallScore = Math.round(totalTurnScores / evaluatedTurnsCount);

  const dimensionBreakdown = {};
  for (const [dim, total] of Object.entries(dimTotals)) {
    dimensionBreakdown[dim] = Math.round(total / (dimCounts[dim] || 1));
  }

  // Aggregate strengths and gaps
  const allStrengths = turns.flatMap(t => t.evaluation?.strengths || []);
  const allGaps = turns.flatMap(t => t.evaluation?.gapsObserved || []);

  let verdict = "Solid Engineering Competency";
  if (overallScore >= 88) verdict = "Outstanding Technical Mastery";
  else if (overallScore >= 75) verdict = "Strong Professional Competency";
  else if (overallScore >= 60) verdict = "Developing Competency";
  else verdict = "Needs Targeted Practice";

  // Synthesize tailored practice plan recommendations using Gemini
  const prompt = `Synthesize 3-4 concrete practice recommendations for this candidate based on their simulation outcome.
COMPETENCY ASSESSED: ${session.competencyTarget}
SCENARIO: ${session.scenario.title}
OVERALL SCORE: ${overallScore}/100 (${verdict})
OBSERVED GAPS: ${JSON.stringify(allGaps.slice(0, 6))}
STRENGTHS: ${JSON.stringify(allStrengths.slice(0, 6))}

Return ONLY a JSON array of strings:
["Actionable exercise 1", "Specific architecture pattern to study 2", "Hands-on lab recommendation 3"]`;

  let practiceRecommendations = [];
  try {
    const recs = await generateJson(prompt);
    if (Array.isArray(recs)) practiceRecommendations = recs;
  } catch {
    practiceRecommendations = [
      `Review edge-case isolation and failover strategies for ${session.competencyTarget}.`,
      "Practice articulating trade-offs between consistency and latency under high concurrency.",
      "Conduct mock post-mortems with explicit rollback metrics.",
    ];
  }

  return {
    overallScore,
    verdict,
    dimensionBreakdown,
    keyStrengths: Array.from(new Set(allStrengths)).slice(0, 5),
    criticalGaps: Array.from(new Set(allGaps)).slice(0, 5),
    practiceRecommendations,
    syncedToGraph: false,
    completedAt: new Date(),
  };
}

module.exports = {
  evaluateTurnResponse,
  generateFinalSimulationReport,
};
