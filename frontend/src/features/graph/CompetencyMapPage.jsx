import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Compass, Cpu, ExternalLink, Filter, GitBranch,
  Layers, Play, RefreshCw, Search, ShieldCheck, Sparkles,
  Zap, ZoomIn, ZoomOut, CheckCircle2, AlertCircle, HelpCircle, FileText
} from "lucide-react";
import api from "../../lib/api";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

const NODE_COLORS = {
  Candidate: { bg: "#7C3AED", border: "#6D28D9", text: "#FFFFFF" },
  Skill: { bg: "#0D9488", border: "#0F766E", text: "#FFFFFF" },
  Project: { bg: "#FF6B4A", border: "#EA580C", text: "#FFFFFF" },
  Employer: { bg: "#2563EB", border: "#1D4ED8", text: "#FFFFFF" },
  Technology: { bg: "#0284C7", border: "#0369A1", text: "#FFFFFF" },
  Repository: { bg: "#334155", border: "#1E293B", text: "#FFFFFF" },
  JobRequirement: { bg: "#DC2626", border: "#B91C1C", text: "#FFFFFF" },
  Evidence: { bg: "#059669", border: "#047857", text: "#FFFFFF" },
};

export default function CompetencyMapPage() {
  const { id: paramResumeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(paramResumeId || searchParams.get("resumeId") || "");
  const [graph, setGraph] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [gnnInfo, setGnnInfo] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // UI state
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("graph"); // "graph" | "list"
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Sync selected resume from URL params if route changes
  useEffect(() => {
    const urlId = paramResumeId || searchParams.get("resumeId");
    if (urlId && urlId !== selectedResumeId) {
      setSelectedResumeId(urlId);
    }
  }, [paramResumeId, searchParams]);

  // Load user's resumes
  useEffect(() => {
    api.get("/resumes")
      .then(({ data }) => {
        const list = data.resumes || [];
        setResumes(list);
        if (!selectedResumeId && list.length > 0) {
          setSelectedResumeId(list[0]._id);
        } else if (list.length === 0) {
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch graph & analysis when selected resume changes
  useEffect(() => {
    if (!selectedResumeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setSelectedNode(null);

    Promise.all([
      api.get(`/graph/resume/${selectedResumeId}`),
      api.get(`/graph/resume/${selectedResumeId}/gnn-predict`).catch(() => ({ data: null })),
    ])
      .then(([graphRes, gnnRes]) => {
        setGraph(graphRes.data.graph);
        setAnalysis(graphRes.data.analysis);
        if (gnnRes?.data) setGnnInfo(gnnRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedResumeId]);

  // Rebuild graph
  const handleRebuild = async () => {
    if (!selectedResumeId) return;
    setRebuilding(true);
    setError("");
    setSuccessMessage("");
    try {
      const { data } = await api.post(`/graph/resume/${selectedResumeId}/rebuild`, {});
      setGraph(data.graph);
      if (data.analysis) setAnalysis(data.analysis);
      setSuccessMessage("Knowledge Graph rebuilt and normalized successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setRebuilding(false);
    }
  };

  // Enrich with GitHub
  const handleEnrichGitHub = async () => {
    if (!selectedResumeId) return;
    setEnriching(true);
    setError("");
    setSuccessMessage("");
    try {
      const hasRepos = graph?.nodes?.some(n => n.type === "Repository" || n.provenance?.sourceUrl?.includes("github.com"));
      let githubUsername = "";
      if (!hasRepos) {
        const input = window.prompt("Enter your GitHub username or repository (e.g. 'octocat' or 'username/repo') to fetch verified public code facts:", "");
        if (input && input.trim()) githubUsername = input.trim();
      }
      const { data } = await api.post(`/graph/resume/${selectedResumeId}/enrich-github`, { githubUsername });
      setGraph(data.graph);
      if (data.analysis) setAnalysis(data.analysis);
      setSuccessMessage(data.message || "GitHub enrichment complete.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnriching(false);
    }
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graph?.nodes) return [];
    return graph.nodes.filter(n => {
      const matchesType = filterType === "ALL" || n.type === filterType;
      const matchesSearch = !searchQuery ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [graph?.nodes, filterType, searchQuery]);

  // Compute 2D layout positions for nodes
  const nodePositions = useMemo(() => {
    if (!graph?.nodes) return new Map();
    const map = new Map();
    const width = 1000;
    const height = 600;

    // Categorize nodes into columns
    const columns = {
      Candidate: [],
      Employer: [],
      Project: [],
      Skill: [],
      Technology: [],
      Evidence: [],
      Repository: [],
      JobRequirement: [],
    };

    graph.nodes.forEach(n => {
      if (columns[n.type]) columns[n.type].push(n);
      else columns.Skill.push(n);
    });

    const xSlots = {
      Candidate: 80,
      Employer: 220,
      Project: 380,
      Skill: 560,
      Technology: 560,
      Evidence: 740,
      Repository: 740,
      JobRequirement: 900,
    };

    Object.entries(columns).forEach(([type, list]) => {
      const x = xSlots[type] || 500;
      const total = list.length;
      list.forEach((n, idx) => {
        const step = height / (total + 1);
        const y = step * (idx + 1) + (idx % 2 === 0 ? -12 : 12);
        map.set(n.id, { x, y });
      });
    });

    return map;
  }, [graph?.nodes]);

  // Zoom / Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.tagName === "g") {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Quick launch simulation from gap or node
  const launchSimulation = (competencyName, scenarioType = "production_outage") => {
    navigate(`/simulations?resumeId=${selectedResumeId}&competency=${encodeURIComponent(competencyName)}&type=${scenarioType}`);
  };

  return (
    <div className="page-wrap graph-page-layout">
      {/* Topbar Header */}
      <header className="topbar">
        <div>
          <span className="breadcrumb">
            <Link to="/">Workspace</Link> <span>/</span> Industry Knowledge Graph
          </span>
          <h1>Competency Intelligence <em>&amp; Evidence Graph</em></h1>
          <p>
            Grounding skills, shipped projects, public repository facts, and target job requirements with verbatim provenance citations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {resumes.length > 1 && (
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              style={{
                padding: "9px 14px",
                borderRadius: "12px",
                border: "1px solid #E2D9CC",
                background: "#FAF7F2",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              {resumes.map(r => (
                <option key={r._id} value={r._id}>
                  {r.title || r.content?.fullName || "Resume"}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRebuild}
            disabled={rebuilding || loading}
            className="button button-white"
            title="Re-extract and normalize knowledge graph from resume"
          >
            <RefreshCw size={16} className={rebuilding ? "spin" : ""} />
            {rebuilding ? "Extracting…" : "Rebuild Graph"}
          </button>

          <button
            onClick={handleEnrichGitHub}
            disabled={enriching || loading}
            className="button button-teal"
            title="Query public GitHub APIs for repository metadata"
          >
            <GitBranch size={16} className={enriching ? "spin" : ""} />
            {enriching ? "Enriching…" : "Enrich via GitHub"}
          </button>
        </div>
      </header>

      {/* Error notification */}
      {error && (
        <div style={{ padding: "14px 18px", background: "#FFE4E6", color: "#BE123C", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#BE123C", fontWeight: "700" }}>✕</button>
        </div>
      )}

      {/* Success notification */}
      {successMessage && (
        <div style={{ padding: "14px 18px", background: "#ECFDF5", color: "#065F46", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid #A7F3D0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#065F46", fontWeight: "700" }}>✕</button>
        </div>
      )}

      {/* Graph Statistics Header Card */}
      {graph?.stats && (
        <div className="graph-top-controls">
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <small style={{ color: "var(--ink-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Target Role</small>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--ink-primary)" }}>
                {graph.targetRole || "Software Engineering Professional"}
              </div>
            </div>
            <div style={{ width: "1px", height: "30px", background: "#EAE2D5" }} />
            <div>
              <small style={{ color: "var(--ink-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Job Match Coverage</small>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--clay-teal)" }}>
                {graph.stats.coverageScore || 0}%
              </div>
            </div>
            <div>
              <small style={{ color: "var(--ink-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Verified Nodes</small>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#059669" }}>
                {graph.stats.verifiedCount || 0}
              </div>
            </div>
            <div>
              <small style={{ color: "var(--ink-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Competency Gaps</small>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#E11D48" }}>
                {analysis?.gaps?.length || graph.stats.gapCount || 0}
              </div>
            </div>
          </div>

          {/* Research indicator pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {gnnInfo && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "5px 12px",
                  borderRadius: "9999px",
                  background: gnnInfo.status === "trained" ? "#ECFDF5" : "#FEF3C7",
                  color: gnnInfo.status === "trained" ? "#047857" : "#B45309",
                  border: "1px solid rgba(0,0,0,0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title={gnnInfo.description || "GNN Layer status"}
              >
                <Cpu size={14} />
                {gnnInfo.status === "trained" ? "GNN Layer: Active" : "GNN Layer: Baseline Traversal"}
              </span>
            )}

            <div style={{ display: "flex", background: "#EFE8DC", borderRadius: "10px", padding: "3px" }}>
              <button
                className={`graph-filter-btn ${viewMode === "graph" ? "active" : ""}`}
                style={{ padding: "5px 12px", border: "none" }}
                onClick={() => setViewMode("graph")}
              >
                Graph View
              </button>
              <button
                className={`graph-filter-btn ${viewMode === "list" ? "active" : ""}`}
                style={{ padding: "5px 12px", border: "none" }}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="graph-top-controls" style={{ padding: "10px 18px" }}>
        <div className="graph-filters">
          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", marginRight: "6px" }}>
            <Filter size={13} style={{ display: "inline", verticalAlign: "middle" }} /> FILTER:
          </span>
          {["ALL", "Skill", "Project", "Technology", "JobRequirement", "Evidence", "Repository"].map(type => (
            <button
              key={type}
              className={`graph-filter-btn ${filterType === type ? "active" : ""}`}
              onClick={() => setFilterType(type)}
            >
              {type === "JobRequirement" ? "Requirements" : type}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={16} color="var(--ink-muted)" />
          <input
            type="text"
            placeholder="Search nodes & claims…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              border: "1px solid #E2D9CC",
              background: "#FAF7F2",
              borderRadius: "10px",
              padding: "7px 12px",
              fontSize: "13px",
              width: "200px",
            }}
          />
        </div>
      </div>

      {/* Interactive Visual Canvas or List Fallback */}
      {!loading && resumes.length === 0 ? (
        <div className="clay-panel-card" style={{ padding: "48px 32px", textAlign: "center", alignItems: "center", maxWidth: "600px", margin: "40px auto" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "#EDE9FE", color: "#7C3AED", display: "grid", placeItems: "center", marginBottom: "16px" }}>
            <FileText size={32} />
          </div>
          <h2 style={{ fontSize: "22px", margin: "0 0 10px", color: "var(--ink-primary)" }}>No Resumes Found</h2>
          <p style={{ fontSize: "14px", color: "var(--ink-secondary)", margin: "0 0 24px", lineHeight: "1.6" }}>
            Upload or analyze your resume to automatically construct an evidence-grounded Industry Knowledge Graph connecting skills, projects, and target job requirements.
          </p>
          <Link to="/upload" className="button button-orange">
            Upload &amp; Analyze Resume ↗
          </Link>
        </div>
      ) : loading ? (
        <div className="app-loading" style={{ height: "400px" }}>
          <span className="spinner" /> Constructing Evidence-Grounded Knowledge Graph…
        </div>
      ) : (!graph || !graph.nodes || graph.nodes.length === 0) ? (
        <div className="clay-panel-card" style={{ padding: "48px 32px", textAlign: "center", alignItems: "center", maxWidth: "600px", margin: "40px auto" }}>
          <h2 style={{ fontSize: "20px", margin: "0 0 10px", color: "var(--ink-primary)" }}>No Graph Nodes Generated</h2>
          <p style={{ fontSize: "14px", color: "var(--ink-secondary)", margin: "0 0 20px" }}>
            We haven't extracted graph entities for this resume yet. Click below to generate it now.
          </p>
          <button onClick={handleRebuild} disabled={rebuilding} className="button button-teal">
            <RefreshCw size={16} className={rebuilding ? "spin" : ""} />
            {rebuilding ? "Extracting Nodes…" : "Generate Knowledge Graph"}
          </button>
        </div>
      ) : viewMode === "graph" ? (
        <div className="graph-interactive-area" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          {/* HUD zoom controls */}
          <div className="graph-hud-overlay">
            <button className="graph-hud-btn" onClick={() => setZoom(z => Math.min(2.2, z + 0.15))}>
              <ZoomIn size={14} /> Zoom In
            </button>
            <button className="graph-hud-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}>
              <ZoomOut size={14} /> Zoom Out
            </button>
            <button className="graph-hud-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              Reset View
            </button>
          </div>

          {/* SVG Canvas with Typed Edges and Interactive Nodes */}
          <svg
            ref={svgRef}
            className="graph-svg-canvas"
            viewBox="0 0 1000 600"
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#B4A899" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0D9488" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {graph?.edges?.map((edge, idx) => {
                const sPos = nodePositions.get(edge.source);
                const tPos = nodePositions.get(edge.target);
                if (!sPos || !tPos) return null;

                const isConnectedToSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                const isSimulationEdge = edge.type === "SIMULATION_OBSERVED_PERFORMANCE";

                return (
                  <g key={edge.id || idx}>
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={isConnectedToSelected ? "#0D9488" : isSimulationEdge ? "#7C3AED" : "#D8CEBE"}
                      strokeWidth={isConnectedToSelected ? 2.5 : isSimulationEdge ? 2 : 1.2}
                      strokeDasharray={isSimulationEdge ? "4 3" : undefined}
                      markerEnd={isConnectedToSelected ? "url(#arrow-active)" : "url(#arrow)"}
                      opacity={selectedNode && !isConnectedToSelected ? 0.25 : 0.85}
                    />
                    {isConnectedToSelected && (
                      <text
                        x={(sPos.x + tPos.x) / 2}
                        y={(sPos.y + tPos.y) / 2 - 6}
                        fill="#0F766E"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {edge.type.replace(/_/g, " ")}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map(node => {
                const pos = nodePositions.get(node.id) || { x: 500, y: 300 };
                const isSelected = selectedNode?.id === node.id;
                const colors = NODE_COLORS[node.type] || NODE_COLORS.Skill;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                  >
                    {/* Outer glow ring on selection */}
                    {isSelected && (
                      <circle
                        r="24"
                        fill="none"
                        stroke="var(--clay-teal)"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r="16"
                      fill={colors.bg}
                      stroke={isSelected ? "#FFFFFF" : colors.border}
                      strokeWidth="2.5"
                      style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.18))" }}
                    />

                    {/* Node Type Initial */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill={colors.text}
                      fontSize="10"
                      fontWeight="800"
                      style={{ pointerEvents: "none" }}
                    >
                      {node.type[0]}
                    </text>

                    {/* Node Label */}
                    <text
                      y="26"
                      textAnchor="middle"
                      fill="var(--ink-primary)"
                      fontSize="11"
                      fontWeight={isSelected ? "800" : "600"}
                      style={{ pointerEvents: "none", textShadow: "0 1px 2px #FFF" }}
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Canvas Bottom Legend */}
          <div className="graph-legend">
            <span style={{ fontWeight: "700", color: "var(--ink-primary)" }}>Node Types:</span>
            {Object.entries(NODE_COLORS).map(([type, c]) => (
              <span key={type} className="graph-legend-item">
                <span className="legend-dot" style={{ background: c.bg }} />
                {type}
              </span>
            ))}
          </div>

          {/* Node Detail Drawer */}
          {selectedNode && (
            <aside className="graph-drawer">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className={`node-status-pill ${selectedNode.status}`}>
                    {selectedNode.status.replace(/_/g, " ")}
                  </span>
                  <h3 style={{ margin: "8px 0 2px", fontSize: "18px", color: "var(--ink-primary)" }}>
                    {selectedNode.label}
                  </h3>
                  <small style={{ color: "var(--ink-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "700" }}>
                    Type: {selectedNode.type} · Category: {selectedNode.category}
                  </small>
                </div>
                <button
                  className="icon-button"
                  style={{ width: "28px", height: "28px", fontSize: "14px" }}
                  onClick={() => setSelectedNode(null)}
                >
                  ✕
                </button>
              </div>

              {/* Confidence & Evidence Meter */}
              <div style={{ background: "#FAF7F2", padding: "12px 14px", borderRadius: "12px", border: "1px solid #EAE2D5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                  <span>Grounding Confidence</span>
                  <span>{Math.round((selectedNode.confidence || 0.7) * 100)}%</span>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#E5DDD0", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((selectedNode.confidence || 0.7) * 100)}%`, height: "100%", background: "var(--clay-teal)" }} />
                </div>
                <small style={{ fontSize: "11px", color: "var(--ink-secondary)", marginTop: "6px", display: "block" }}>
                  Evidence Status: <b>{selectedNode.provenance?.evidenceStatus || "claimed"}</b>
                </small>
              </div>

              {/* Verbatim Source Provenance Citation */}
              {selectedNode.provenance?.sourcePassage && (
                <div>
                  <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 6px" }}>
                    Source Citation Provenance
                  </h4>
                  <div className="evidence-quote-box">
                    "{selectedNode.provenance.sourcePassage}"
                  </div>
                  {selectedNode.provenance.sourceUrl && (
                    <a
                      href={selectedNode.provenance.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: "var(--clay-teal)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px" }}
                    >
                      <ExternalLink size={12} /> View External Source
                    </a>
                  )}
                </div>
              )}

              {/* Direct Simulation Launch Action for Skills / Requirements */}
              {(selectedNode.type === "Skill" || selectedNode.type === "JobRequirement") && (
                <div style={{ background: "#FFF8F0", border: "1px solid #FED7AA", padding: "14px", borderRadius: "14px" }}>
                  <b style={{ fontSize: "13px", color: "#9A3412", display: "block", marginBottom: "4px" }}>
                    Empirical Verification
                  </b>
                  <p style={{ fontSize: "12px", color: "#7C2D12", margin: "0 0 10px", lineHeight: "1.4" }}>
                    Test and verify real-world hands-on capability in "{selectedNode.label}" through an adaptive scenario.
                  </p>
                  <button
                    onClick={() => launchSimulation(selectedNode.label)}
                    className="button button-orange"
                    style={{ width: "100%", justifyContent: "center", fontSize: "13px" }}
                  >
                    <Play size={14} /> Launch Adaptive Simulation
                  </button>
                </div>
              )}

              {/* Connected Edges */}
              <div>
                <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 8px" }}>
                  Connected Relationships
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                  {graph.edges
                    ?.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = graph.nodes.find(n => n.id === otherId);
                      return (
                        <div
                          key={idx}
                          style={{
                            fontSize: "12px",
                            padding: "6px 10px",
                            background: "#FAF7F2",
                            borderRadius: "8px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "var(--ink-primary)" }}>
                            {otherNode?.label || otherId}
                          </span>
                          <small style={{ color: "var(--clay-teal)", fontWeight: "700" }}>
                            {e.type.replace(/_/g, " ")}
                          </small>
                        </div>
                      );
                    })}
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* Accessible List-View Fallback */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredNodes.map(node => (
            <Gsap3DCard key={node.id} className="clay-panel-card" style={{ padding: "18px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span className={`node-status-pill ${node.status}`}>
                      {node.status.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", textTransform: "uppercase" }}>
                      {node.type} · {node.category}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "var(--ink-primary)" }}>{node.label}</h3>
                  {node.provenance?.sourcePassage && (
                    <p style={{ margin: "8px 0 0", fontSize: "13px", color: "var(--ink-secondary)", fontStyle: "italic" }}>
                      "{node.provenance.sourcePassage}"
                    </p>
                  )}
                </div>

                {(node.type === "Skill" || node.type === "JobRequirement") && (
                  <button
                    onClick={() => launchSimulation(node.label)}
                    className="button button-orange"
                    style={{ fontSize: "12px", padding: "8px 14px" }}
                  >
                    <Play size={14} /> Test in Simulation
                  </button>
                )}
              </div>
            </Gsap3DCard>
          ))}
        </div>
      )}

      {/* Competency Gaps & Practice Recommendation Section */}
      {analysis?.gaps?.length > 0 && (
        <section style={{ marginTop: "20px" }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow" style={{ color: "#E11D48" }}>GRAPH GAP DETECTION</span>
              <h2>Identified Competency Gaps &amp; Verification Opportunities</h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px", marginTop: "16px" }}>
            {analysis.gaps.map((gap) => (
              <Gsap3DCard key={gap.id} className="clay-panel-card" style={{ padding: "20px 22px", borderLeft: "4px solid #E11D48" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#E11D48" }}>
                    {gap.type.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "#FFE4E6", color: "#9F1239", padding: "2px 8px", borderRadius: "999px" }}>
                    {gap.severity} severity
                  </span>
                </div>
                <h4 style={{ margin: "0 0 6px", fontSize: "16px", color: "var(--ink-primary)" }}>{gap.competencyName}</h4>
                <p style={{ fontSize: "13px", color: "var(--ink-secondary)", margin: "0 0 14px", lineHeight: "1.4" }}>
                  {gap.description}
                </p>
                <button
                  onClick={() => launchSimulation(gap.competencyName, gap.suggestedScenarioType)}
                  className="button button-orange"
                  style={{ width: "100%", justifyContent: "center", fontSize: "13px" }}
                >
                  <Play size={14} /> Launch Targeted Simulation
                </button>
              </Gsap3DCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
