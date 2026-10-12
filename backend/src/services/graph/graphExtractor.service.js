const { generateJson } = require("../gemini.service");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the prompt for Gemini structured extraction
 */
function buildExtractionPrompt(resumeText, jobDescription = "") {
  return `You are a Principal AI Knowledge Graph Engineer.
Analyze the following resume and target job description to construct an EVIDENCE-GROUNDED Knowledge Graph.

CRITICAL RULES:
1. Ground every extracted entity and claim in the actual source text.
2. DO NOT invent collaborators, project metrics, revenue figures, or unmentioned achievements.
3. For every extracted claim or skill, extract the verbatim or near-verbatim "sourcePassage" from the resume as provenance evidence.
4. If a public repository URL (e.g. github.com/username/project) or portfolio link is mentioned, create a Repository node.
5. Identify target job requirements from the job description (if provided). Mark whether the candidate provides evidence for them.

NODE TYPES TO EXTRACT:
- Candidate: Exactly 1 node representing the candidate.
- Skill: Technical or domain competencies (e.g. "React", "Python", "System Design", "Kubernetes").
- Project: Named projects mentioned in the resume.
- Employer: Organizations and companies where the candidate worked.
- Technology: Tools, libraries, databases, or infrastructure mentioned.
- Repository: Public repository or portfolio URLs found in the text.
- JobRequirement: Concrete required skills, qualifications, or architectural domains from the job description.
- Evidence: Specific quoted bullet points or achievements that provide backing proof.

EDGE TYPES TO ESTABLISH:
- CANDIDATE_WORKED_ON_PROJECT (Candidate -> Project)
- PROJECT_USES_TECHNOLOGY (Project -> Technology)
- PROJECT_DEMONSTRATES_SKILL (Project -> Skill)
- CANDIDATE_CLAIMS_SKILL (Candidate -> Skill)
- EMPLOYER_ASSOCIATED_WITH_ROLE (Employer -> Project or Candidate)
- REPOSITORY_CONTAINS_EVIDENCE (Repository -> Project or Technology)
- SKILL_MATCHES_REQUIREMENT (Skill -> JobRequirement)
- EVIDENCE_SUPPORTS_COMPETENCY (Evidence -> Skill or Project)

Return a strictly valid JSON object matching this schema:
{
  "targetRole": "Extracted target title or candidate's primary domain",
  "summary": "2-3 sentence overview of the candidate's verified graph coverage and gaps",
  "nodes": [
    {
      "id": "unique-id (e.g., cand-1, skill-react, proj-ecommerce, req-distributed-systems)",
      "type": "Candidate" | "Skill" | "Project" | "Employer" | "Technology" | "Repository" | "JobRequirement" | "Evidence",
      "label": "Short human readable label",
      "category": "frontend" | "backend" | "devops" | "data" | "leadership" | "architecture" | "general",
      "status": "matched" | "partially_matched" | "missing" | "unverified_claim" | "verified",
      "confidence": 0.85, // number between 0.0 and 1.0
      "properties": {
        // e.g., "yearsOfExperience": 3, "role": "Senior Engineer", "dates": "2021-2023", "url": "https://..."
      },
      "provenance": {
        "sourceDocument": "resume" | "job_description",
        "sourcePassage": "exact quote from source supporting this node",
        "sourceUrl": "optional URL",
        "evidenceStatus": "claimed" | "verified_by_repo" | "verified_by_simulation" | "inferred" | "missing_evidence"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-id-1",
      "target": "node-id-2",
      "type": "CANDIDATE_WORKED_ON_PROJECT" | "PROJECT_USES_TECHNOLOGY" | "PROJECT_DEMONSTRATES_SKILL" | "CANDIDATE_CLAIMS_SKILL" | "EMPLOYER_ASSOCIATED_WITH_ROLE" | "REPOSITORY_CONTAINS_EVIDENCE" | "SKILL_MATCHES_REQUIREMENT" | "EVIDENCE_SUPPORTS_COMPETENCY",
      "weight": 1.0,
      "metadata": {
        "reason": "Brief explanation of relationship"
      },
      "provenance": {
        "sourcePassage": "supporting quote if applicable"
      }
    }
  ]
}

RESUME TEXT:
${resumeText.slice(0, 24000)}

TARGET JOB DESCRIPTION:
${jobDescription ? jobDescription.slice(0, 10000) : "(No job description provided; analyze general engineering competencies and self-consistency)"}`;
}

/**
 * Validates and normalizes nodes and edges to guarantee graph integrity
 */
function normalizeGraph(rawGraph, candidateName = "Candidate") {
  const nodes = Array.isArray(rawGraph?.nodes) ? rawGraph.nodes : [];
  const edges = Array.isArray(rawGraph?.edges) ? rawGraph.edges : [];

  const validTypes = new Set([
    "Candidate",
    "Skill",
    "Project",
    "Employer",
    "Technology",
    "Repository",
    "JobRequirement",
    "Evidence"
  ]);

  const validEdgeTypes = new Set([
    "CANDIDATE_WORKED_ON_PROJECT",
    "PROJECT_USES_TECHNOLOGY",
    "PROJECT_DEMONSTRATES_SKILL",
    "CANDIDATE_CLAIMS_SKILL",
    "EMPLOYER_ASSOCIATED_WITH_ROLE",
    "REPOSITORY_CONTAINS_EVIDENCE",
    "SKILL_MATCHES_REQUIREMENT",
    "EVIDENCE_SUPPORTS_COMPETENCY",
    "SIMULATION_OBSERVED_PERFORMANCE",
  ]);

  const nodeMap = new Map();

  // Ensure candidate node exists
  let candidateNode = nodes.find(n => n.type === "Candidate");
  if (!candidateNode) {
    candidateNode = {
      id: "candidate-primary",
      type: "Candidate",
      label: candidateName || "Candidate",
      category: "general",
      status: "verified",
      confidence: 1.0,
      properties: {},
      provenance: {
        sourceDocument: "resume",
        sourcePassage: candidateName,
        sourceUrl: "",
        retrievalTimestamp: new Date(),
        evidenceStatus: "claimed",
      },
    };
    nodes.unshift(candidateNode);
  }

  // Deduplicate and sanitize nodes
  const sanitizedNodes = [];
  for (const rawNode of nodes) {
    if (!rawNode || typeof rawNode !== "object") continue;
    let id = String(rawNode.id || slugify(rawNode.label) || `node-${sanitizedNodes.length + 1}`).trim();
    if (nodeMap.has(id)) {
      id = `${id}-${sanitizedNodes.length + 1}`;
    }

    const type = validTypes.has(rawNode.type) ? rawNode.type : "Skill";
    const label = String(rawNode.label || id).trim();
    const category = String(rawNode.category || "general").trim();
    
    // Status normalization
    let status = rawNode.status;
    if (!["matched", "partially_matched", "missing", "unverified_claim", "verified"].includes(status)) {
      status = type === "JobRequirement" ? "missing" : "unverified_claim";
    }

    let evidenceStatus = String(rawNode.provenance?.evidenceStatus || "claimed").trim();
    const validEvidenceStatuses = new Set([
      "claimed",
      "verified",
      "verified_by_repo",
      "verified_by_simulation",
      "inferred",
      "missing_evidence",
    ]);
    if (!validEvidenceStatuses.has(evidenceStatus)) {
      if (evidenceStatus.includes("repo")) evidenceStatus = "verified_by_repo";
      else if (evidenceStatus.includes("simulation")) evidenceStatus = "verified_by_simulation";
      else if (evidenceStatus.startsWith("verif")) evidenceStatus = "verified";
      else if (evidenceStatus.includes("miss")) evidenceStatus = "missing_evidence";
      else if (evidenceStatus.includes("infer")) evidenceStatus = "inferred";
      else evidenceStatus = "claimed";
    }

    const confidence = Math.min(1, Math.max(0, Number(rawNode.confidence) || 0.7));

    const nodeObj = {
      id,
      type,
      label,
      category,
      status,
      confidence,
      properties: typeof rawNode.properties === "object" && rawNode.properties ? rawNode.properties : {},
      provenance: {
        sourceDocument: rawNode.provenance?.sourceDocument || "resume",
        sourcePassage: String(rawNode.provenance?.sourcePassage || "").slice(0, 500),
        sourceUrl: String(rawNode.provenance?.sourceUrl || "").slice(0, 300),
        retrievalTimestamp: new Date(),
        evidenceStatus,
      },
    };

    nodeMap.set(id, nodeObj);
    sanitizedNodes.push(nodeObj);
  }

  // Filter and sanitize edges (no dangling endpoints)
  const sanitizedEdges = [];
  const edgeIdSet = new Set();

  for (let i = 0; i < edges.length; i++) {
    const rawEdge = edges[i];
    if (!rawEdge || typeof rawEdge !== "object") continue;
    const source = String(rawEdge.source || "").trim();
    const target = String(rawEdge.target || "").trim();

    if (!nodeMap.has(source) || !nodeMap.has(target) || source === target) {
      continue; // Drop dangling or self-looping invalid edges
    }

    let edgeId = String(rawEdge.id || `edge-${source}-${target}-${i}`);
    if (edgeIdSet.has(edgeId)) edgeId = `edge-${i}-${Date.now()}`;
    edgeIdSet.add(edgeId);

    const type = validEdgeTypes.has(rawEdge.type) ? rawEdge.type : "PROJECT_DEMONSTRATES_SKILL";
    const weight = Math.min(1, Math.max(0, Number(rawEdge.weight) || 1.0));

    sanitizedEdges.push({
      id: edgeId,
      source,
      target,
      type,
      weight,
      metadata: typeof rawEdge.metadata === "object" && rawEdge.metadata ? rawEdge.metadata : {},
      provenance: {
        sourcePassage: String(rawEdge.provenance?.sourcePassage || "").slice(0, 500),
        timestamp: new Date(),
      },
    });
  }

  // Compute graph statistics
  const skillNodes = sanitizedNodes.filter(n => n.type === "Skill");
  const reqNodes = sanitizedNodes.filter(n => n.type === "JobRequirement");
  const matchedSkills = skillNodes.filter(n => n.status === "matched" || n.status === "verified");
  const missingReqs = reqNodes.filter(n => n.status === "missing");
  const verifiedNodes = sanitizedNodes.filter(n => n.status === "verified" || n.provenance.evidenceStatus.startsWith("verified"));

  let coverageScore = 0;
  if (reqNodes.length > 0) {
    const matchedCount = reqNodes.filter(r => r.status === "matched").length;
    coverageScore = Math.round((matchedCount / reqNodes.length) * 100);
  } else if (skillNodes.length > 0) {
    coverageScore = Math.min(100, Math.round((matchedSkills.length / skillNodes.length) * 100));
  }

  const stats = {
    nodeCount: sanitizedNodes.length,
    edgeCount: sanitizedEdges.length,
    coverageScore,
    matchedSkillsCount: matchedSkills.length,
    gapCount: missingReqs.length,
    verifiedCount: verifiedNodes.length,
  };

  return {
    targetRole: String(rawGraph?.targetRole || "Software Professional"),
    summary: String(rawGraph?.summary || "Evidence-based knowledge graph extracted from resume content."),
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    stats,
  };
}

/**
 * Fallback heuristic knowledge graph extractor built directly from structured resume data
 */
function buildHeuristicGraph(resumeContent, resumeText = "", jobDescription = "") {
  const candidateName = resumeContent?.fullName || "Candidate";
  const nodes = [];
  const edges = [];
  const nodeIdSet = new Set();
  const edgeIdSet = new Set();

  function addNode(node) {
    if (!node || !node.id || nodeIdSet.has(node.id)) return;
    nodeIdSet.add(node.id);
    nodes.push(node);
  }

  function addEdge(edge) {
    if (!edge || !edge.id || edgeIdSet.has(edge.id)) return;
    edgeIdSet.add(edge.id);
    edges.push(edge);
  }

  // 1. Candidate Node
  const candidateId = "candidate-primary";
  addNode({
    id: candidateId,
    type: "Candidate",
    label: candidateName,
    category: "general",
    status: "verified",
    confidence: 1.0,
    properties: {
      email: resumeContent?.email || "",
      location: resumeContent?.location || "",
    },
    provenance: {
      sourceDocument: "resume",
      sourcePassage: candidateName,
      sourceUrl: "",
      evidenceStatus: "claimed",
    },
  });

  // 2. Skill Nodes
  const skills = Array.isArray(resumeContent?.skills) ? resumeContent.skills : [];
  const candidateSkillLabels = new Set();

  const skillCategoryMap = {
    react: "frontend", vue: "frontend", angular: "frontend", html: "frontend", css: "frontend", javascript: "frontend", typescript: "frontend",
    node: "backend", express: "backend", python: "backend", django: "backend", fastapi: "backend", java: "backend", spring: "backend", go: "backend", golang: "backend",
    docker: "devops", kubernetes: "devops", aws: "devops", gcp: "devops", azure: "devops", terraform: "devops",
    sql: "data", mongodb: "data", postgres: "data", mysql: "data", redis: "data", kafka: "data",
  };

  skills.forEach((skillName, idx) => {
    const clean = String(skillName || "").trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    candidateSkillLabels.add(lower);
    const skillId = `skill-${slugify(clean) || idx}`;

    let cat = "backend";
    for (const [key, category] of Object.entries(skillCategoryMap)) {
      if (lower.includes(key)) {
        cat = category;
        break;
      }
    }

    addNode({
      id: skillId,
      type: "Skill",
      label: clean,
      category: cat,
      status: "verified",
      confidence: 0.9,
      properties: {},
      provenance: {
        sourceDocument: "resume",
        sourcePassage: `Skill listed in candidate profile: ${clean}`,
        evidenceStatus: "claimed",
      },
    });

    addEdge({
      id: `edge-cand-${skillId}`,
      source: candidateId,
      target: skillId,
      type: "CANDIDATE_CLAIMS_SKILL",
      weight: 1.0,
      metadata: { reason: "Direct skill declaration in resume" },
      provenance: { sourcePassage: clean },
    });
  });

  // 3. Project Nodes
  const projects = Array.isArray(resumeContent?.projects) ? resumeContent.projects : [];
  projects.forEach((proj, idx) => {
    const title = proj.title || proj.name || `Project ${idx + 1}`;
    const projId = `proj-${slugify(title) || idx}`;
    const desc = proj.description || (Array.isArray(proj.highlights) ? proj.highlights.join(" ") : "");

    addNode({
      id: projId,
      type: "Project",
      label: title,
      category: "backend",
      status: "verified",
      confidence: 0.95,
      properties: { description: desc.slice(0, 200) },
      provenance: {
        sourceDocument: "resume",
        sourcePassage: (desc || title).slice(0, 300),
        evidenceStatus: "verified",
      },
    });

    addEdge({
      id: `edge-cand-${projId}`,
      source: candidateId,
      target: projId,
      type: "CANDIDATE_WORKED_ON_PROJECT",
      weight: 1.0,
      metadata: { reason: "Candidate authored project" },
      provenance: { sourcePassage: title },
    });

    const projTechs = Array.isArray(proj.technologies)
      ? proj.technologies
      : (typeof proj.technologies === "string" ? proj.technologies.split(/[,|]/) : []);

    projTechs.forEach((t, tIdx) => {
      const cleanT = String(t || "").trim();
      if (!cleanT) return;
      const techId = `tech-${slugify(cleanT) || tIdx}`;

      addNode({
        id: techId,
        type: "Technology",
        label: cleanT,
        category: "general",
        status: "verified",
        confidence: 0.9,
        properties: {},
        provenance: {
          sourceDocument: "resume",
          sourcePassage: `Used in project: ${title}`,
          evidenceStatus: "verified",
        },
      });

      addEdge({
        id: `edge-${projId}-${techId}`,
        source: projId,
        target: techId,
        type: "PROJECT_USES_TECHNOLOGY",
        weight: 0.9,
        metadata: { reason: "Technology leveraged in project implementation" },
        provenance: { sourcePassage: `${title} utilizes ${cleanT}` },
      });
    });

    if (desc && desc.length > 15) {
      const evId = `ev-proj-${idx}`;
      addNode({
        id: evId,
        type: "Evidence",
        label: `Deliverable: ${title}`,
        category: "general",
        status: "verified",
        confidence: 0.95,
        properties: {},
        provenance: {
          sourceDocument: "resume",
          sourcePassage: desc.slice(0, 400),
          evidenceStatus: "verified",
        },
      });

      addEdge({
        id: `edge-${evId}-${projId}`,
        source: evId,
        target: projId,
        type: "EVIDENCE_SUPPORTS_COMPETENCY",
        weight: 1.0,
        metadata: { reason: "Project delivery demonstrates hands-on implementation" },
        provenance: { sourcePassage: desc.slice(0, 200) },
      });
    }
  });

  // 4. Experience / Employer Nodes
  const experience = Array.isArray(resumeContent?.experience) ? resumeContent.experience : [];
  experience.forEach((job, idx) => {
    const company = job.company || job.employer || `Organization ${idx + 1}`;
    const role = job.title || job.role || "Software Engineer";
    const empId = `emp-${slugify(company) || idx}`;

    addNode({
      id: empId,
      type: "Employer",
      label: company,
      category: "general",
      status: "verified",
      confidence: 0.95,
      properties: { role, duration: job.duration || job.dates || "" },
      provenance: {
        sourceDocument: "resume",
        sourcePassage: `${role} at ${company}`,
        evidenceStatus: "verified",
      },
    });

    addEdge({
      id: `edge-${empId}-${candidateId}`,
      source: empId,
      target: candidateId,
      type: "EMPLOYER_ASSOCIATED_WITH_ROLE",
      weight: 1.0,
      metadata: { reason: "Candidate employment tenure" },
      provenance: { sourcePassage: `${role} at ${company}` },
    });
  });

  // 5. GitHub Public Repositories (regex extract from text)
  const fullText = `${resumeText} ${JSON.stringify(resumeContent || {})}`;
  const repoRegex = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/gi;
  let match;
  let repoIdx = 0;
  while ((match = repoRegex.exec(fullText)) !== null && repoIdx < 4) {
    const owner = match[1];
    const repo = match[2].replace(/[.,;:)]+$/, "");
    const repoId = `repo-${slugify(owner)}-${slugify(repo)}`;
    addNode({
      id: repoId,
      type: "Repository",
      label: `${owner}/${repo}`,
      category: "backend",
      status: "verified",
      confidence: 1.0,
      properties: { url: `https://github.com/${owner}/${repo}` },
      provenance: {
        sourceDocument: "resume",
        sourcePassage: match[0],
        sourceUrl: `https://github.com/${owner}/${repo}`,
        evidenceStatus: "verified_by_repo",
      },
    });

    addEdge({
      id: `edge-${repoId}-${candidateId}`,
      source: repoId,
      target: candidateId,
      type: "REPOSITORY_CONTAINS_EVIDENCE",
      weight: 1.0,
      metadata: { reason: "Public GitHub repository associated with candidate" },
      provenance: { sourcePassage: match[0] },
    });
    repoIdx++;
  }

  // 6. Target Job Requirements (from jobDescription)
  if (jobDescription && jobDescription.trim().length > 10) {
    const jdLines = jobDescription.split(/[\n;.]/).map(s => s.trim()).filter(s => s.length > 5 && s.length < 120);
    const sampleReqs = jdLines.slice(0, 6);
    sampleReqs.forEach((reqText, idx) => {
      const reqId = `req-${idx + 1}`;
      const lowerReq = reqText.toLowerCase();

      let isMatched = false;
      let matchedSkillId = null;
      for (const skillName of candidateSkillLabels) {
        if (lowerReq.includes(skillName) || skillName.includes(lowerReq)) {
          isMatched = true;
          matchedSkillId = `skill-${slugify(skillName)}`;
          break;
        }
      }

      addNode({
        id: reqId,
        type: "JobRequirement",
        label: reqText.length > 35 ? reqText.slice(0, 32) + "…" : reqText,
        category: "general",
        status: isMatched ? "matched" : "missing",
        confidence: 0.9,
        properties: { fullRequirement: reqText },
        provenance: {
          sourceDocument: "job_description",
          sourcePassage: reqText,
          evidenceStatus: isMatched ? "verified" : "missing_evidence",
        },
      });

      if (isMatched && matchedSkillId && nodeIdSet.has(matchedSkillId)) {
        addEdge({
          id: `edge-${matchedSkillId}-${reqId}`,
          source: matchedSkillId,
          target: reqId,
          type: "SKILL_MATCHES_REQUIREMENT",
          weight: 0.95,
          metadata: { reason: "Candidate skill matches required capability" },
          provenance: { sourcePassage: reqText },
        });
      }
    });
  }

  let targetRole = "Software Engineering Professional";
  if (experience.length > 0 && (experience[0].title || experience[0].role)) {
    targetRole = experience[0].title || experience[0].role;
  } else if (projects.length > 0) {
    targetRole = "Full-Stack Software Engineer";
  }

  return {
    targetRole,
    summary: `Evidence-grounded knowledge graph constructed for ${candidateName} covering ${skills.length} skills, ${projects.length} projects, and verified experience.`,
    nodes,
    edges,
  };
}

/**
 * Extracts and returns a validated Knowledge Graph from resume text and target job description
 * with robust deterministic fallback.
 */
async function extractKnowledgeGraph({ resumeText, resumeContent, jobDescription = "" }) {
  const candidateName = resumeContent?.fullName || "Candidate";
  try {
    const prompt = buildExtractionPrompt(resumeText, jobDescription);
    const rawResult = await generateJson(prompt);
    if (rawResult && Array.isArray(rawResult.nodes) && rawResult.nodes.length > 0) {
      return normalizeGraph(rawResult, candidateName);
    }
    throw new Error("AI extraction returned empty nodes structure.");
  } catch (err) {
    console.warn("AI extraction fallback triggered:", err.message);
    const heuristicGraph = buildHeuristicGraph(resumeContent, resumeText, jobDescription);
    return normalizeGraph(heuristicGraph, candidateName);
  }
}

module.exports = {
  extractKnowledgeGraph,
  buildHeuristicGraph,
  normalizeGraph,
};
