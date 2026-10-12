/**
 * Public Data Enrichment Service
 * Safely enriches Knowledge Graph repository nodes with verified public GitHub metadata.
 * Complies with rate-limiting, caching, and provenance rules.
 */

const cache = new Map(); // url -> { data, timestamp }
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

/**
 * Extracts candidate repository URLs from raw text
 */
function extractGitHubRepos(text = "") {
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\.-]+)\/([a-zA-Z0-9_\.-]+)/gi;
  const repos = [];
  const seen = new Set();
  const reserved = new Set(["features", "pricing", "marketplace", "topics", "pulls", "issues", "explore", "settings", "search", "login", "join"]);

  let match;
  while ((match = regex.exec(text)) !== null) {
    const owner = match[1];
    let repo = match[2].replace(/\.git$/i, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/, ""); // strip .git and trailing punctuation
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    if (!seen.has(key) && !reserved.has(owner.toLowerCase())) {
      seen.add(key);
      repos.push({ owner, repo, url: `https://github.com/${owner}/${repo}` });
    }
  }

  return repos;
}

/**
 * Extracts candidate GitHub profile username from text (e.g. github.com/username)
 */
function extractGitHubProfiles(text = "") {
  const profileRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\.-]+)(?:\/|\s|$|[^\/a-zA-Z0-9_\.-])/gi;
  const usernames = [];
  const reserved = new Set(["features", "pricing", "marketplace", "topics", "pulls", "issues", "explore", "settings", "search", "login", "join"]);
  let match;
  while ((match = profileRegex.exec(text)) !== null) {
    const user = match[1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/, "");
    if (user && !reserved.has(user.toLowerCase()) && !usernames.includes(user.toLowerCase())) {
      usernames.push(user);
    }
  }
  return usernames;
}

/**
 * Fetches public repositories for a user from GitHub REST API
 */
async function fetchUserPublicRepos(username) {
  if (!username) return [];
  const cacheKey = `user:${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "ResumeAI-CareerHub-PublicEnricher/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const repos = await response.json();
    if (!Array.isArray(repos)) return [];

    const results = repos.slice(0, 5).map(data => ({
      owner: data.owner?.login || username,
      repo: data.name,
      url: data.html_url || `https://github.com/${data.owner?.login || username}/${data.name}`,
    }));

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (err) {
    console.warn(`Could not fetch user repos for ${username}:`, err.message);
    return [];
  }
}

/**
 * Safely queries GitHub REST API for public repo metadata
 */
async function fetchPublicRepoInfo(owner, repo) {
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "ResumeAI-CareerHub-PublicEnricher/1.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });

    if (response.status === 404) {
      const notFoundData = { notFound: true, isPublic: false };
      cache.set(cacheKey, { data: notFoundData, timestamp: Date.now() });
      return notFoundData;
    }

    if (response.status === 403 || response.status === 429) {
      console.warn(`GitHub API rate limit reached for repo ${owner}/${repo}`);
      return cached ? cached.data : { rateLimited: true };
    }

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = {
      owner: data.owner?.login || owner,
      repo: data.name || repo,
      description: data.description || "",
      primaryLanguage: data.language || "",
      topics: Array.isArray(data.topics) ? data.topics : [],
      license: data.license?.spdx_id || data.license?.name || "None",
      defaultBranch: data.default_branch || "main",
      isArchived: Boolean(data.archived),
      createdAt: data.created_at,
      pushedAt: data.pushed_at,
      isPublic: !data.private,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn(`Could not enrich GitHub repo ${owner}/${repo}:`, err.message);
    return cached ? cached.data : { error: err.message };
  }
}

/**
 * Enriches an existing Knowledge Graph with public repository facts
 */
async function enrichGraphWithPublicData(knowledgeGraph, sourceText = "", customUsername = "") {
  const existingRepos = knowledgeGraph.nodes.filter(n => n.type === "Repository");
  const textRepos = extractGitHubRepos(sourceText);

  // Combine found repos
  const targets = [];
  for (const r of textRepos) {
    targets.push(r);
  }
  for (const node of existingRepos) {
    if (node.provenance?.sourceUrl) {
      const match = node.provenance.sourceUrl.match(/github\.com\/([a-zA-Z0-9_\.-]+)\/([a-zA-Z0-9_\.-]+)/i);
      if (match && !targets.some(t => t.owner === match[1] && t.repo === match[2])) {
        targets.push({ owner: match[1], repo: match[2], url: node.provenance.sourceUrl, existingNodeId: node.id });
      }
    }
  }

  // If custom username or profile found in text, query user public repositories
  const usernamesToQuery = [];
  if (customUsername && String(customUsername).trim()) {
    const cleanUser = String(customUsername).trim().replace(/^https?:\/\/github\.com\//i, "");
    if (cleanUser.includes("/")) {
      const [uOwner, uRepo] = cleanUser.split("/").map(s => s.trim());
      if (uOwner && uRepo && !targets.some(t => t.owner.toLowerCase() === uOwner.toLowerCase() && t.repo.toLowerCase() === uRepo.toLowerCase())) {
        targets.push({ owner: uOwner, repo: uRepo, url: `https://github.com/${uOwner}/${uRepo}` });
      }
    } else {
      usernamesToQuery.push(cleanUser);
    }
  }

  if (targets.length === 0) {
    const profileUsers = extractGitHubProfiles(sourceText);
    usernamesToQuery.push(...profileUsers);
  }

  for (const u of usernamesToQuery) {
    const userRepos = await fetchUserPublicRepos(u);
    for (const ur of userRepos) {
      if (!targets.some(t => t.owner.toLowerCase() === ur.owner.toLowerCase() && t.repo.toLowerCase() === ur.repo.toLowerCase())) {
        targets.push(ur);
      }
    }
  }

  let enrichedCount = 0;

  for (const target of targets.slice(0, 5)) { // Limit to 5 repos per resume to be polite with rate limits
    const info = await fetchPublicRepoInfo(target.owner, target.repo);
    if (!info || info.notFound || info.error || info.rateLimited) continue;

    // Find or create repo node
    let repoNode = knowledgeGraph.nodes.find(
      n => n.type === "Repository" && (n.label.includes(target.repo) || n.properties?.repo === target.repo)
    );

    if (!repoNode) {
      repoNode = {
        id: `repo-${target.owner}-${target.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        type: "Repository",
        label: `${target.owner}/${target.repo}`,
        category: "public_evidence",
        status: "verified",
        confidence: 0.95,
        properties: {
          owner: info.owner,
          repo: info.repo,
          primaryLanguage: info.primaryLanguage,
          topics: info.topics,
          license: info.license,
          isPublic: true,
        },
        provenance: {
          sourceDocument: "github_public_api",
          sourcePassage: `Public GitHub repository: ${info.description || target.repo}`,
          sourceUrl: target.url,
          retrievalTimestamp: new Date(),
          evidenceStatus: "verified_by_repo",
        },
      };
      knowledgeGraph.nodes.push(repoNode);
    } else {
      repoNode.status = "verified";
      repoNode.confidence = 0.95;
      repoNode.properties = {
        ...repoNode.properties,
        primaryLanguage: info.primaryLanguage,
        topics: info.topics,
        license: info.license,
        isPublic: true,
      };
      repoNode.provenance.evidenceStatus = "verified_by_repo";
      repoNode.provenance.retrievalTimestamp = new Date();
    }

    // Connect repository to primary language if present
    if (info.primaryLanguage) {
      const langSlug = `tech-${info.primaryLanguage.toLowerCase()}`;
      let techNode = knowledgeGraph.nodes.find(n => n.type === "Technology" && n.label.toLowerCase() === info.primaryLanguage.toLowerCase());
      if (!techNode) {
        techNode = {
          id: langSlug,
          type: "Technology",
          label: info.primaryLanguage,
          category: "languages",
          status: "verified",
          confidence: 0.9,
          properties: { verifiedByRepo: true },
          provenance: {
            sourceDocument: "github_public_api",
            sourcePassage: `Verified primary language in ${target.owner}/${target.repo}`,
            sourceUrl: target.url,
            retrievalTimestamp: new Date(),
            evidenceStatus: "verified_by_repo",
          },
        };
        knowledgeGraph.nodes.push(techNode);
      }

      // Add edge REPOSITORY_CONTAINS_EVIDENCE
      const edgeId = `edge-repo-${repoNode.id}-${techNode.id}`;
      if (!knowledgeGraph.edges.some(e => e.id === edgeId || (e.source === repoNode.id && e.target === techNode.id))) {
        knowledgeGraph.edges.push({
          id: edgeId,
          source: repoNode.id,
          target: techNode.id,
          type: "REPOSITORY_CONTAINS_EVIDENCE",
          weight: 0.9,
          metadata: { verifiedFact: true, language: info.primaryLanguage },
          provenance: {
            sourcePassage: `Public code repository written primarily in ${info.primaryLanguage}`,
            timestamp: new Date(),
          },
        });
      }
    }

    // Connect candidate to repository if candidate node exists
    const candidateNode = knowledgeGraph.nodes.find(n => n.type === "Candidate");
    if (candidateNode) {
      const candEdgeId = `edge-cand-${candidateNode.id}-${repoNode.id}`;
      if (!knowledgeGraph.edges.some(e => e.id === candEdgeId || (e.source === candidateNode.id && e.target === repoNode.id))) {
        knowledgeGraph.edges.push({
          id: candEdgeId,
          source: candidateNode.id,
          target: repoNode.id,
          type: "REPOSITORY_CONTAINS_EVIDENCE",
          weight: 0.85,
          metadata: { verifiedPublicRepo: true },
          provenance: {
            sourcePassage: `Candidate's declared public repository`,
            timestamp: new Date(),
          },
        });
      }
    }

    enrichedCount++;
  }

  knowledgeGraph.lastEnrichedAt = new Date();
  return { enrichedCount, totalRepos: targets.length };
}

module.exports = {
  extractGitHubRepos,
  fetchPublicRepoInfo,
  enrichGraphWithPublicData,
};
