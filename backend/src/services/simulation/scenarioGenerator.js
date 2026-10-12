const { generateJson } = require("../gemini.service");

const DEFAULT_RUBRIC = [
  { name: "Technical Accuracy", weight: 1.2, criteria: "Correctness of engineering principles, syntax, APIs, or architectural patterns." },
  { name: "Diagnostic Reasoning", weight: 1.2, criteria: "Methodical root-cause investigation, isolating variables rather than guessing." },
  { name: "Evidence-Based Decisions", weight: 1.0, criteria: "Grounding decisions in logs, metrics, profiling data, or concrete constraints." },
  { name: "Prioritization", weight: 1.0, criteria: "Triage order: mitigating customer impact before deep refactoring or cleanup." },
  { name: "Risk Awareness", weight: 1.0, criteria: "Anticipating cascading failures, data loss risks, security flaws, or rollback procedures." },
  { name: "Explanation of Trade-offs", weight: 1.0, criteria: "Articulating latency vs throughput, consistency vs availability, speed vs tech debt." },
  { name: "Communication Clarity", weight: 0.8, criteria: "Structured, concise, professional communication appropriate for the scenario role." },
];

/**
 * Generates an adaptive technical or leadership simulation scenario
 */
async function generateScenario({
  competencyTarget,
  scenarioType,
  difficulty = "Senior",
  roleContext = "Software Engineer",
  resumeContext = "",
  jobDescription = "",
}) {
  const prompt = `You are a Principal Technical Simulation Designer.
Create a hyper-realistic, multi-turn technical evaluation simulation for a candidate.

PARAMETERS:
- Target Competency to Assess: "${competencyTarget}"
- Scenario Type: "${scenarioType}" (e.g., production_outage, system_architecture, security_incident, technical_tradeoffs)
- Difficulty Level: "${difficulty}" (Junior | Mid-Level | Senior | Staff/Principal)
- Candidate Role Context: "${roleContext}"
- Candidate Resume Background Snippet: ${resumeContext ? resumeContext.slice(0, 3000) : "General engineering background"}
- Target Job Description (if any): ${jobDescription ? jobDescription.slice(0, 2000) : "Not specified"}

CRITICAL RULES:
1. DO NOT claim that this scenario actually happened to the candidate in their real work history. Frame it as a realistic scenario they are called to handle today.
2. Ground the problem in realistic telemetry, architecture components, error logs, or conflicting stakeholder constraints.
3. Define exactly 3-4 structured turns/milestones that test progressive problem-solving.
4. Provide the opening Turn 1 challenge prompt that places the candidate immediately into the situation.

Return ONLY a JSON object conforming to this schema:
{
  "title": "Engaging scenario title (e.g. Critical P0: Kafka Consumer Lag & Payment Idempotency Failure)",
  "description": "2-3 sentences setting up the business context and current high-stakes situation.",
  "systemContext": "Brief technical architecture diagram description or stack overview (e.g. Node.js microservices, PostgreSQL, Kafka, Redis, AWS ECS).",
  "initialTelemetry": "Realistic logs, alerts, metrics or incident channel snippet showing the initial symptom.",
  "constraints": [
    "e.g. Database cannot be restarted during active trading hours",
    "e.g. Max allowable downstream latency SLA is 200ms",
    "e.g. Must preserve event idempotency without dropping messages"
  ],
  "expectedMilestones": [
    "Turn 1: Triage initial alert, verify root cause hypotheses using telemetry, stabilize blast radius.",
    "Turn 2: Formulate safe mitigation plan, address edge cases and concurrency locks.",
    "Turn 3: Permanent architectural resolution and post-mortem prevention mechanism."
  ],
  "turn1Prompt": "The realistic prompt/question presented to the candidate for Turn 1."
}`;

  const generated = await generateJson(prompt);

  return {
    title: generated.title || `Adaptive Scenario: ${competencyTarget}`,
    description: generated.description || `Assessment simulation evaluating hands-on proficiency in ${competencyTarget}.`,
    systemContext: generated.systemContext || "Standard distributed service architecture.",
    initialTelemetry: generated.initialTelemetry || "Alert: High latency threshold exceeded (p99 > 2.4s).",
    constraints: Array.isArray(generated.constraints) && generated.constraints.length ? generated.constraints : [
      "Zero customer downtime permitted during remediation.",
      "All actions must follow change management safety standards.",
    ],
    expectedMilestones: Array.isArray(generated.expectedMilestones) ? generated.expectedMilestones : [
      "Diagnose incident symptoms and isolate root cause",
      "Formulate mitigation with risk trade-offs",
      "Propose long-term architectural prevention",
    ],
    rubric: DEFAULT_RUBRIC,
    maxTurns: 3,
    turn1Prompt: generated.turn1Prompt || `You have been paged for an urgent incident involving ${competencyTarget}. How do you begin your investigation and what telemetry will you inspect first?`,
  };
}

module.exports = {
  generateScenario,
  DEFAULT_RUBRIC,
};
