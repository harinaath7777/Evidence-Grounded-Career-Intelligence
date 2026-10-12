const { evaluateTurnResponse, generateFinalSimulationReport } = require("./responseEvaluator");
const { generateNextTurnPrompt, generateHint } = require("./adaptationEngine");

/**
 * Handles the state machine transition for a candidate's turn
 */
async function processTurn(session, candidateAnswer) {
  if (session.status !== "active") {
    const error = new Error("This simulation session is already finished.");
    error.status = 400;
    throw error;
  }

  const currentTurnIdx = session.turns.length - 1;
  if (currentTurnIdx < 0) {
    const error = new Error("Simulation has no active turn.");
    error.status = 500;
    throw error;
  }

  const currentTurn = session.turns[currentTurnIdx];
  currentTurn.candidateAnswer = String(candidateAnswer || "").trim();

  // 1. Evaluate candidate answer against explicit scenario rubric
  const evaluation = await evaluateTurnResponse({
    scenario: session.scenario,
    turnNumber: currentTurn.turnNumber,
    turnPrompt: currentTurn.prompt,
    candidateAnswer: currentTurn.candidateAnswer,
    injectedConstraint: currentTurn.injectedConstraint || "",
    priorTurns: session.turns.slice(0, currentTurnIdx),
  });

  currentTurn.evaluation = evaluation;

  // 2. Determine state transition: advance turn or complete session
  if (session.currentTurn < session.scenario.maxTurns) {
    const nextTurnNumber = session.currentTurn + 1;
    const { nextPrompt, injectedConstraint } = await generateNextTurnPrompt({
      session,
      completedTurnNumber: currentTurn.turnNumber,
      lastCandidateAnswer: currentTurn.candidateAnswer,
      lastEvaluation: evaluation,
    });

    session.turns.push({
      turnNumber: nextTurnNumber,
      prompt: nextPrompt,
      candidateAnswer: "",
      injectedConstraint,
      hintProvided: "",
      timestamp: new Date(),
    });

    session.currentTurn = nextTurnNumber;
  } else {
    // Reached final milestone -> finalize session
    session.status = "completed";
    session.finalReport = await generateFinalSimulationReport(session);
  }

  await session.save();
  return session;
}

/**
 * Provides a hint for the current turn
 */
async function provideHint(session) {
  if (session.status !== "active") {
    const error = new Error("Session is not active.");
    error.status = 400;
    throw error;
  }

  const currentTurn = session.turns[session.turns.length - 1];
  if (!currentTurn) {
    const error = new Error("No active turn found.");
    error.status = 400;
    throw error;
  }

  if (currentTurn.hintProvided) {
    return { hint: currentTurn.hintProvided, alreadyCached: true };
  }

  const hint = await generateHint({
    session,
    currentTurnPrompt: currentTurn.prompt,
    candidateNotes: currentTurn.candidateAnswer,
  });

  currentTurn.hintProvided = hint;
  await session.save();

  return { hint, alreadyCached: false };
}

module.exports = {
  processTurn,
  provideHint,
};
