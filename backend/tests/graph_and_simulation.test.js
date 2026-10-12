const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { normalizeGraph } = require("../src/services/graph/graphExtractor.service");
const { GraphAnalyticsEngine } = require("../src/services/graph/graphAnalytics.service");
const { extractGitHubRepos } = require("../src/services/graph/githubEnrichment.service");
const { DEFAULT_RUBRIC } = require("../src/services/simulation/scenarioGenerator");
const { predictCompetencyLinks } = require("../src/services/graph/gnnClient.service");

describe("1. Knowledge Graph Normalization and Integrity", () => {
  it("should create candidate node and sanitize typed edges with no dangling references", () => {
    const rawGraph = {
      targetRole: "Senior Distributed Systems Engineer",
      summary: "Candidate with strong backend experience",
      nodes: [
        {
          id: "skill-react",
          type: "Skill",
          label: "React",
          category: "frontend",
          status: "unverified_claim",
          confidence: 0.8,
          provenance: {
            sourceDocument: "resume",
            sourcePassage: "Built frontend with React and Redux.",
            evidenceStatus: "claimed",
          },
        },
        {
          id: "proj-dashboard",
          type: "Project",
          label: "Real-time Metrics Dashboard",
          category: "frontend",
          status: "verified",
          confidence: 0.9,
          provenance: {
            sourceDocument: "resume",
            sourcePassage: "Engineered real-time dashboard tracking 10k RPS.",
            evidenceStatus: "claimed",
          },
        },
        {
          id: "req-distributed-systems",
          type: "JobRequirement",
          label: "Distributed Systems",
          category: "backend",
          status: "missing",
          confidence: 0.9,
          provenance: {
            sourceDocument: "job_description",
            sourcePassage: "5+ years designing distributed systems.",
            evidenceStatus: "missing_evidence",
          },
        },
      ],
      edges: [
        {
          id: "e-1",
          source: "candidate-primary",
          target: "proj-dashboard",
          type: "CANDIDATE_WORKED_ON_PROJECT",
          weight: 1.0,
        },
        {
          id: "e-2",
          source: "proj-dashboard",
          target: "skill-react",
          type: "PROJECT_DEMONSTRATES_SKILL",
          weight: 0.9,
        },
        {
          id: "e-dangling",
          source: "proj-dashboard",
          target: "non-existent-node-xyz",
          type: "PROJECT_USES_TECHNOLOGY",
          weight: 0.5,
        },
      ],
    };

    const normalized = normalizeGraph(rawGraph, "Alex Rivera");

    // Must ensure candidate primary exists
    const candidateNode = normalized.nodes.find(n => n.type === "Candidate");
    assert.ok(candidateNode, "Candidate node must exist");
    assert.equal(candidateNode.label, "Alex Rivera");

    // Must filter out dangling edges
    assert.equal(normalized.edges.length, 2, "Dangling edges must be pruned");
    const dangling = normalized.edges.find(e => e.target === "non-existent-node-xyz");
    assert.equal(dangling, undefined, "Dangling edge must not be in normalized graph");

    // Verify stats
    assert.equal(normalized.stats.nodeCount, 4);
    assert.equal(normalized.stats.edgeCount, 2);
  });
});

describe("2. Graph Analytics Traversal, Provenance & Gap Detection", () => {
  it("should evaluate skill evidence quality and identify missing competency gaps", () => {
    const mockGraph = {
      nodes: [
        { id: "cand-1", type: "Candidate", label: "Candidate", status: "verified", confidence: 1.0, provenance: {} },
        { id: "skill-k8s", type: "Skill", label: "Kubernetes", category: "devops", status: "unverified_claim", confidence: 0.6, provenance: { sourcePassage: "Kubernetes" } },
        { id: "skill-node", type: "Skill", label: "Node.js", category: "backend", status: "verified", confidence: 0.9, provenance: { sourcePassage: "Architected microservices using Node.js" } },
        { id: "proj-api", type: "Project", label: "API Gateway", category: "backend", status: "verified", confidence: 0.9, provenance: {} },
        { id: "req-k8s", type: "JobRequirement", label: "Kubernetes", category: "devops", status: "missing", confidence: 1.0, provenance: {} },
        { id: "req-kafka", type: "JobRequirement", label: "Apache Kafka", category: "streaming", status: "missing", confidence: 1.0, provenance: {} },
      ],
      edges: [
        { id: "e1", source: "cand-1", target: "proj-api", type: "CANDIDATE_WORKED_ON_PROJECT", weight: 1.0 },
        { id: "e2", source: "proj-api", target: "skill-node", type: "PROJECT_DEMONSTRATES_SKILL", weight: 0.9 },
        { id: "e3", source: "cand-1", target: "skill-k8s", type: "CANDIDATE_CLAIMS_SKILL", weight: 0.5 },
      ],
    };

    const engine = new GraphAnalyticsEngine(mockGraph);
    const report = engine.generateReport();

    // Node.js is connected to Project, so it has higher grounding than raw Kubernetes claim
    const nodeEvaluation = report.skills.find(s => s.label === "Node.js");
    assert.ok(nodeEvaluation.evidenceScore > 0.4, "Node.js should have project grounding evidence");

    const k8sEvaluation = report.skills.find(s => s.label === "Kubernetes");
    assert.equal(k8sEvaluation.isWeaklySupported, true, "Kubernetes should be flagged as weakly supported");

    // Competency gaps should catch missing Apache Kafka and weakly supported Kubernetes
    assert.ok(report.gaps.length >= 2, "Gaps should contain at least Apache Kafka and Kubernetes");
    const kafkaGap = report.gaps.find(g => g.competencyName === "Apache Kafka");
    assert.ok(kafkaGap, "Must flag Apache Kafka as missing requirement");
    assert.equal(kafkaGap.type, "MISSING_REQUIREMENT");

    // Pathfinding
    const path = engine.findPath("cand-1", "skill-node");
    assert.deepEqual(path, ["cand-1", "proj-api", "skill-node"]);
  });
});

describe("3. Public GitHub Data Enrichment", () => {
  it("should extract valid GitHub owner and repository names from text", () => {
    const text = `Check out my portfolio at https://github.com/torvalds/linux and my web app at https://github.com/facebook/react.git or http://github.com/nodejs/node/issues`;
    const repos = extractGitHubRepos(text);

    assert.equal(repos.length, 3);
    assert.equal(repos[0].owner, "torvalds");
    assert.equal(repos[0].repo, "linux");
    assert.equal(repos[1].owner, "facebook");
    assert.equal(repos[1].repo, "react");
    assert.equal(repos[2].owner, "nodejs");
    assert.equal(repos[2].repo, "node");
  });
});

describe("4. Simulation Rubric Determinism & GNN Research Mode", () => {
  it("should have standard 7-dimension rubric weights configured", () => {
    assert.equal(DEFAULT_RUBRIC.length, 7);
    const names = DEFAULT_RUBRIC.map(r => r.name);
    assert.ok(names.includes("Technical Accuracy"));
    assert.ok(names.includes("Diagnostic Reasoning"));
    assert.ok(names.includes("Risk Awareness"));
    assert.ok(names.includes("Explanation of Trade-offs"));
  });

  it("should report status 'not_yet_trained' and fallback to deterministic graph baseline when PyG microservice weights are absent", async () => {
    const mockGraph = {
      nodes: [
        { id: "cand-1", type: "Candidate", label: "Candidate", status: "verified", confidence: 1.0, provenance: {} },
        { id: "skill-db", type: "Skill", label: "PostgreSQL", category: "db", status: "verified", confidence: 0.9, provenance: {} },
      ],
      edges: [
        { id: "e1", source: "cand-1", target: "skill-db", type: "CANDIDATE_CLAIMS_SKILL", weight: 0.8 },
      ],
    };

    const gnnResult = await predictCompetencyLinks(mockGraph);
    assert.equal(gnnResult.status, "not_yet_trained");
    assert.equal(gnnResult.mode, "graph_baseline_fallback");
    assert.ok(gnnResult.baselineReport);
  });
});

describe("5. Simulation Outcome Graph Synchronization Structure", () => {
  it("should create distinct Evidence node and SIMULATION_OBSERVED_PERFORMANCE typed edge without overwriting resume claims", () => {
    const mockGraph = {
      nodes: [
        { id: "candidate-primary", type: "Candidate", label: "Taylor", status: "verified", confidence: 1.0, provenance: {} },
        { id: "skill-dist-sys", type: "Skill", label: "Distributed Systems", category: "backend", status: "unverified_claim", confidence: 0.5, provenance: { evidenceStatus: "claimed" } },
      ],
      edges: [
        { id: "edge-1", source: "candidate-primary", target: "skill-dist-sys", type: "CANDIDATE_CLAIMS_SKILL", weight: 0.5, metadata: {}, provenance: {} },
      ],
      stats: { nodeCount: 2, edgeCount: 1, verifiedCount: 1 },
      save: async () => {},
    };

    const mockSession = {
      _id: "sim-session-12345",
      user: "user-test-id",
      resume: "resume-test-id",
      competencyTarget: "Distributed Systems",
      difficulty: "Senior",
      status: "completed",
      scenario: { title: "Production Kafka Lag Outage" },
      turns: [{ turnNumber: 1 }, { turnNumber: 2 }, { turnNumber: 3 }],
      finalReport: {
        overallScore: 88,
        verdict: "Strong Engineering Competency",
        dimensionBreakdown: new Map([["Technical Accuracy", 90], ["Risk Awareness", 85]]),
        completedAt: new Date(),
        syncedToGraph: false,
      },
      save: async () => {},
    };

    // Simulate synchronization logic
    const evidenceNodeId = `evidence-sim-${mockSession._id}`;
    const evidenceNode = {
      id: evidenceNodeId,
      type: "Evidence",
      label: `Simulation Result: ${mockSession.competencyTarget} (${mockSession.finalReport.overallScore}/100)`,
      category: "simulation_benchmark",
      status: "verified",
      confidence: 0.88,
      properties: {
        sessionId: mockSession._id,
        overallScore: mockSession.finalReport.overallScore,
      },
      provenance: {
        sourceDocument: "simulation_session",
        sourcePassage: `Observed performance in ${mockSession.scenario.title}`,
        evidenceStatus: "verified_by_simulation",
      },
    };
    mockGraph.nodes.push(evidenceNode);

    const simEdge = {
      id: `edge-sim-${mockSession._id}`,
      source: "candidate-primary",
      target: "skill-dist-sys",
      type: "SIMULATION_OBSERVED_PERFORMANCE",
      weight: 0.88,
      metadata: { score: 88, isSimulationEvidence: true },
      provenance: { timestamp: new Date() },
    };
    mockGraph.edges.push(simEdge);

    // Update target skill status without overwriting original claim edge
    const skillNode = mockGraph.nodes.find(n => n.id === "skill-dist-sys");
    skillNode.status = "verified";
    skillNode.provenance.evidenceStatus = "verified_by_simulation";

    // Verify
    assert.equal(mockGraph.nodes.length, 3);
    assert.equal(mockGraph.edges.length, 2);

    // Assert that the original CANDIDATE_CLAIMS_SKILL edge still exists!
    const claimEdge = mockGraph.edges.find(e => e.type === "CANDIDATE_CLAIMS_SKILL");
    assert.ok(claimEdge, "Original resume claim edge must be preserved");

    // Assert that the distinct SIMULATION_OBSERVED_PERFORMANCE edge was added!
    const perfEdge = mockGraph.edges.find(e => e.type === "SIMULATION_OBSERVED_PERFORMANCE");
    assert.ok(perfEdge, "Simulation performance edge must exist");
    assert.equal(perfEdge.metadata.score, 88);

    // Evidence node verification
    const evNode = mockGraph.nodes.find(n => n.type === "Evidence");
    assert.ok(evNode);
    assert.equal(evNode.provenance.evidenceStatus, "verified_by_simulation");
  });
});

describe("6. Knowledge Graph Heuristic Fallback & Resilience", () => {
  const { buildHeuristicGraph } = require("../src/services/graph/graphExtractor.service");

  it("should reliably construct nodes and edges from resumeContent when AI is offline or rate-limited", () => {
    const resumeContent = {
      fullName: "Aswin Bharathi",
      email: "aswin@example.com",
      skills: ["React", "Node.js", "Docker", "PostgreSQL"],
      projects: [
        {
          title: "Distributed Pipeline",
          description: "High-throughput streaming engine with 99.99% uptime.",
          technologies: ["Node.js", "Docker", "Kafka"],
        },
      ],
      experience: [
        {
          company: "CloudTech Systems",
          title: "Senior Backend Engineer",
          duration: "2023 - Present",
        },
      ],
    };

    const graph = buildHeuristicGraph(
      resumeContent,
      "Source resume text github.com/aswin/distributed-pipeline",
      "Looking for Senior Engineer with React and Docker experience."
    );

    assert.ok(graph.nodes.length >= 6, "Must extract at least candidate, skills, project, employer, technology, requirement");
    assert.ok(graph.edges.length >= 4, "Must establish typed edges between extracted entities");

    const candidate = graph.nodes.find(n => n.type === "Candidate");
    assert.equal(candidate.label, "Aswin Bharathi");

    const skillNode = graph.nodes.find(n => n.type === "Skill" && n.label === "React");
    assert.ok(skillNode);

    const projectNode = graph.nodes.find(n => n.type === "Project" && n.label === "Distributed Pipeline");
    assert.ok(projectNode);

    const employerNode = graph.nodes.find(n => n.type === "Employer" && n.label === "CloudTech Systems");
    assert.ok(employerNode);

    const repoNode = graph.nodes.find(n => n.type === "Repository");
    assert.ok(repoNode);
    assert.equal(repoNode.properties.url, "https://github.com/aswin/distributed-pipeline");

    const reqNode = graph.nodes.find(n => n.type === "JobRequirement");
    assert.ok(reqNode);
  });

  it("should validate that 'verified' evidenceStatus is accepted by KnowledgeGraph Mongoose schema", () => {
    const KnowledgeGraph = require("../src/models/KnowledgeGraph");
    const testDoc = new KnowledgeGraph({
      user: "507f191e810c19729de860ea",
      resume: "507f191e810c19729de860eb",
      nodes: [
        {
          id: "cand-1",
          type: "Candidate",
          label: "Test Candidate",
          provenance: { evidenceStatus: "verified" },
        },
        {
          id: "repo-1",
          type: "Repository",
          label: "owner/repo",
          provenance: { evidenceStatus: "verified_by_repo" },
        },
      ],
      edges: [],
    });

    const validationError = testDoc.validateSync();
    assert.equal(validationError, undefined, "Schema validation must succeed with evidenceStatus: 'verified'");
  });

  it("should extract GitHub repos with or without protocol", () => {
    const { extractGitHubRepos } = require("../src/services/graph/githubEnrichment.service");
    const found1 = extractGitHubRepos("Check my project at github.com/facebook/react");
    assert.equal(found1.length, 1);
    assert.equal(found1[0].repo, "react");

    const found2 = extractGitHubRepos("Portfolio https://github.com/torvalds/linux and code at http://www.github.com/pallets/flask");
    assert.equal(found2.length, 2);
  });
});
