/**
 * Graph Traversal and Competency Analytics Engine
 * Provides baseline graph intelligence: path analysis, evidence quality scoring,
 * missing connection detection, and competency gap identification.
 */

class GraphAnalyticsEngine {
  constructor(graph) {
    this.nodes = graph.nodes || [];
    this.edges = graph.edges || [];
    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // Build directed and undirected adjacency lists
    this.outAdj = new Map();
    this.inAdj = new Map();
    this.undirectedAdj = new Map();

    for (const node of this.nodes) {
      this.outAdj.set(node.id, []);
      this.inAdj.set(node.id, []);
      this.undirectedAdj.set(node.id, []);
    }

    for (const edge of this.edges) {
      if (!this.nodeMap.has(edge.source) || !this.nodeMap.has(edge.target)) continue;

      this.outAdj.get(edge.source).push({ target: edge.target, edge });
      this.inAdj.get(edge.target).push({ source: edge.source, edge });

      this.undirectedAdj.get(edge.source).push({ neighbor: edge.target, edge, direction: "out" });
      this.undirectedAdj.get(edge.target).push({ neighbor: edge.source, edge, direction: "in" });
    }
  }

  /**
   * Evaluates evidence grounding for all skills
   */
  evaluateSkillEvidenceQuality() {
    const skills = this.nodes.filter(n => n.type === "Skill");
    const evaluatedSkills = [];

    for (const skill of skills) {
      const neighbors = this.undirectedAdj.get(skill.id) || [];
      const connectedProjects = neighbors.filter(n => this.nodeMap.get(n.neighbor)?.type === "Project");
      const connectedEvidence = neighbors.filter(n => this.nodeMap.get(n.neighbor)?.type === "Evidence");
      const connectedRepos = neighbors.filter(n => this.nodeMap.get(n.neighbor)?.type === "Repository");
      const matchedReqs = neighbors.filter(n => this.nodeMap.get(n.neighbor)?.type === "JobRequirement");

      let evidenceScore = 0;
      let evidenceLevel = "low"; // "low" | "medium" | "high" | "verified"

      if (skill.status === "verified" || skill.provenance.evidenceStatus === "verified_by_simulation") {
        evidenceScore = 1.0;
        evidenceLevel = "verified";
      } else {
        // Points for project grounding
        evidenceScore += Math.min(0.4, connectedProjects.length * 0.2);
        // Points for direct passage citation
        if (skill.provenance?.sourcePassage && skill.provenance.sourcePassage.length > 20) {
          evidenceScore += 0.25;
        }
        // Points for evidence nodes
        evidenceScore += Math.min(0.25, connectedEvidence.length * 0.15);
        // Points for public repo evidence
        if (connectedRepos.length > 0) evidenceScore += 0.15;

        evidenceScore = Math.min(1.0, Math.round(evidenceScore * 100) / 100);

        if (evidenceScore >= 0.75) evidenceLevel = "high";
        else if (evidenceScore >= 0.45) evidenceLevel = "medium";
        else evidenceLevel = "low";
      }

      evaluatedSkills.push({
        id: skill.id,
        label: skill.label,
        category: skill.category,
        status: skill.status,
        confidence: skill.confidence,
        evidenceScore,
        evidenceLevel,
        isWeaklySupported: evidenceLevel === "low",
        grounding: {
          projectCount: connectedProjects.length,
          evidenceCount: connectedEvidence.length,
          repoCount: connectedRepos.length,
          requirementMatches: matchedReqs.map(r => this.nodeMap.get(r.neighbor)?.label).filter(Boolean),
        },
        provenance: skill.provenance,
      });
    }

    return evaluatedSkills;
  }

  /**
   * Detects competency gaps:
   * 1. Target requirements with zero candidate match
   * 2. Candidate claims with low/unverified evidence
   */
  detectCompetencyGaps() {
    const jobReqs = this.nodes.filter(n => n.type === "JobRequirement");
    const skillEvaluations = this.evaluateSkillEvidenceQuality();
    const gaps = [];

    // 1. Missing target requirements
    for (const req of jobReqs) {
      const neighbors = this.undirectedAdj.get(req.id) || [];
      const matchingSkills = neighbors.filter(n => this.nodeMap.get(n.neighbor)?.type === "Skill");

      if (matchingSkills.length === 0 || req.status === "missing") {
        gaps.push({
          id: `gap-${req.id}`,
          type: "MISSING_REQUIREMENT",
          competencyName: req.label,
          category: req.category || "core",
          severity: "high",
          description: `Target role requires "${req.label}", but no evidence or claimed skill exists in the candidate's resume.`,
          nodeId: req.id,
          suggestedScenarioType: this._inferScenarioType(req.label, req.category),
          recommendedAction: "Launch Adaptive Generative Simulation to test practical competency in this domain.",
        });
      }
    }

    // 2. Weakly supported claims
    for (const skill of skillEvaluations) {
      if (skill.isWeaklySupported && skill.status !== "verified") {
        gaps.push({
          id: `gap-${skill.id}`,
          type: "WEAKLY_SUPPORTED_CLAIM",
          competencyName: skill.label,
          category: skill.category || "technical",
          severity: "medium",
          description: `Candidate claims competency in "${skill.label}", but it lacks supporting project context, concrete metrics, or repository proof.`,
          nodeId: skill.id,
          suggestedScenarioType: this._inferScenarioType(skill.label, skill.category),
          recommendedAction: "Verify hands-on diagnostic capability via an interactive technical simulation.",
        });
      }
    }

    return gaps;
  }

  /**
   * In-memory Breadth-First-Search (BFS) shortest path finder
   */
  findPath(startNodeId, targetNodeId) {
    if (!this.nodeMap.has(startNodeId) || !this.nodeMap.has(targetNodeId)) return null;
    if (startNodeId === targetNodeId) return [startNodeId];

    const queue = [[startNodeId]];
    const visited = new Set([startNodeId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const neighbors = this.undirectedAdj.get(current) || [];
      for (const { neighbor } of neighbors) {
        if (neighbor === targetNodeId) {
          return [...path, neighbor];
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  }

  /**
   * Extracts k-hop subgraph around a focal node (for detail inspection)
   */
  getSubgraph(centerNodeId, hops = 1) {
    if (!this.nodeMap.has(centerNodeId)) return { nodes: [], edges: [] };

    const visitedNodes = new Set([centerNodeId]);
    let currentFrontier = [centerNodeId];

    for (let h = 0; h < hops; h++) {
      const nextFrontier = [];
      for (const nodeId of currentFrontier) {
        const neighbors = this.undirectedAdj.get(nodeId) || [];
        for (const { neighbor } of neighbors) {
          if (!visitedNodes.has(neighbor)) {
            visitedNodes.add(neighbor);
            nextFrontier.push(neighbor);
          }
        }
      }
      currentFrontier = nextFrontier;
    }

    const subgraphNodes = Array.from(visitedNodes).map(id => this.nodeMap.get(id)).filter(Boolean);
    const subgraphEdges = this.edges.filter(
      e => visitedNodes.has(e.source) && visitedNodes.has(e.target)
    );

    return {
      nodes: subgraphNodes,
      edges: subgraphEdges,
    };
  }

  /**
   * Helper to map a skill/requirement to a realistic simulation scenario type
   */
  _inferScenarioType(label = "", category = "") {
    const l = (label + " " + category).toLowerCase();
    if (l.includes("debug") || l.includes("outage") || l.includes("performance") || l.includes("memory") || l.includes("latency")) {
      return "production_outage";
    }
    if (l.includes("system") || l.includes("architect") || l.includes("scale") || l.includes("distributed") || l.includes("microservice")) {
      return "system_architecture";
    }
    if (l.includes("security") || l.includes("auth") || l.includes("vulnerability") || l.includes("crypto") || l.includes("jwt")) {
      return "security_incident";
    }
    if (l.includes("lead") || l.includes("deadline") || l.includes("trade-off") || l.includes("priorit") || l.includes("stakeholder")) {
      return "technical_tradeoffs";
    }
    return "debugging_deepdive";
  }

  /**
   * Generates a comprehensive Graph Analysis Report
   */
  generateReport() {
    const skillEvaluations = this.evaluateSkillEvidenceQuality();
    const gaps = this.detectCompetencyGaps();
    const totalSkills = skillEvaluations.length;
    const verifiedOrHigh = skillEvaluations.filter(s => s.evidenceLevel === "high" || s.evidenceLevel === "verified").length;
    const weaklySupported = skillEvaluations.filter(s => s.isWeaklySupported).length;

    const candidateNode = this.nodes.find(n => n.type === "Candidate");

    return {
      summary: {
        totalNodes: this.nodes.length,
        totalEdges: this.edges.length,
        totalSkills,
        verifiedOrHighGrounding: verifiedOrHigh,
        weaklySupportedSkills: weaklySupported,
        totalGapsIdentified: gaps.length,
        candidateName: candidateNode?.label || "Candidate",
      },
      skills: skillEvaluations,
      gaps,
    };
  }
}

function analyzeGraph(knowledgeGraph) {
  const engine = new GraphAnalyticsEngine(knowledgeGraph);
  return engine.generateReport();
}

module.exports = {
  GraphAnalyticsEngine,
  analyzeGraph,
};
