const { generateJson } = require("../gemini.service");

/**
 * Adaptation Engine
 * Inspects prior turn performance and generates dynamic context-sensitive next turns,
 * including injecting realistic real-time constraints, follow-up challenges, or pivoting.
 */

async function generateNextTurnPrompt({
  session,
  completedTurnNumber,
  lastCandidateAnswer,
  lastEvaluation,
}) {
  const scenario = session.scenario;
  const nextTurnNumber = completedTurnNumber + 1;
  const isFinalTurn = nextTurnNumber >= scenario.maxTurns;

  const milestoneHint = scenario.expectedMilestones[nextTurnNumber - 1] || "Permanent architectural resolution and post-mortem safeguards.";

  const prompt = `You are a Principal Engineering Lead conducting an interactive incident/system simulation.
The candidate has completed Turn ${completedTurnNumber} of ${scenario.maxTurns}.

SCENARIO TITLE: ${scenario.title}
INITIAL CONTEXT: ${scenario.description}
TARGET COMPETENCY: ${session.competencyTarget}

CANDIDATE'S LAST ANSWER:
${lastCandidateAnswer}

EVALUATOR'S OBSERVATIONS ON LAST ANSWER:
- Strengths: ${JSON.stringify(lastEvaluation.strengths)}
- Gaps / Risks: ${JSON.stringify(lastEvaluation.gapsObserved)}
- Score: ${lastEvaluation.turnScore}/100

TARGET MILESTONE FOR TURN ${nextTurnNumber}:
${milestoneHint}

TASK:
1. React realistically to what the candidate actually said in their previous response.
2. If they performed well (>80), raise the bar by introducing an unexpected complication or realistic production constraint (e.g., secondary alert, replication lag spike, or budget constraint).
3. If they struggled (<70), probe more specifically into the missed dimension or provide telemetry that gently narrows the problem space.
4. If this is the final turn (${isFinalTurn ? "YES" : "NO"}), push for long-term resolution, architectural resilience, or stakeholder post-mortem communication.

Return ONLY a JSON object with this schema:
{
  "injectedConstraint": "Brief description of any new constraint or complication introduced (or empty string)",
  "nextPrompt": "The realistic message/question for Turn ${nextTurnNumber} addressing the candidate."
}`;

  try {
    const result = await generateJson(prompt);
    return {
      nextPrompt: result.nextPrompt || `Now moving to Turn ${nextTurnNumber}: How will you implement permanent safeguards for ${session.competencyTarget}?`,
      injectedConstraint: result.injectedConstraint || "",
    };
  } catch (err) {
    console.warn("Adaptation Engine fallback notice:", err.message);
    return {
      nextPrompt: `Based on your actions in the previous turn, how do you verify the stability of the system and prevent recurrence?`,
      injectedConstraint: "",
    };
  }
}

/**
 * Generates an adaptive hint tailored to the current challenge without giving away the complete solution
 */
async function generateHint({ session, currentTurnPrompt, candidateNotes = "" }) {
  const prompt = `You are an engineering mentor observing a technical simulation.
The candidate is requesting a hint for this challenge:

SCENARIO: ${session.scenario.title}
COMPETENCY: ${session.competencyTarget}
CURRENT CHALLENGE:
${currentTurnPrompt}

TASK:
Provide a constructive, 2-3 sentence guidance hint.
Guide their diagnostic mindset, point toward relevant telemetry or architectural trade-offs, but DO NOT give away the full final solution directly.

Return ONLY a JSON object:
{
  "hint": "..."
}`;

  try {
    const result = await generateJson(prompt);
    return result.hint || "Consider checking upstream consumer lag and verifying if database transaction locks are blocking the queue.";
  } catch {
    return "Focus on isolating the blast radius first, then inspect whether the bottleneck is compute, I/O, or concurrency locking.";
  }
}

module.exports = {
  generateNextTurnPrompt,
  generateHint,
};
