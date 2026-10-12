import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Award, CheckCircle2, ChevronRight,
  Flame, HelpCircle, Lightbulb, Play, RefreshCcw, Send,
  ShieldAlert, Sparkles, Terminal, Volume2, Zap
} from "lucide-react";
import api from "../../lib/api";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

const SCENARIO_TYPES = [
  { id: "production_outage", label: "Production Outage & Debugging", icon: Flame, badge: "orange" },
  { id: "system_architecture", label: "System Architecture & Scalability", icon: Terminal, badge: "purple" },
  { id: "security_incident", label: "Security & Vulnerability Incident", icon: ShieldAlert, badge: "amber" },
  { id: "technical_tradeoffs", label: "Technical Trade-offs & Deadlines", icon: Zap, badge: "teal" },
];

const DIFFICULTIES = ["Junior", "Mid-Level", "Senior", "Staff/Principal"];

export default function SimulationStudioPage() {
  const { id: paramSessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Launcher state
  const [resumes, setResumes] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(searchParams.get("resumeId") || "");
  const [competencyInput, setCompetencyInput] = useState(searchParams.get("competency") || "Distributed Systems");
  const [scenarioType, setScenarioType] = useState(searchParams.get("type") || "production_outage");
  const [difficulty, setDifficulty] = useState("Senior");
  const [starting, setStarting] = useState(false);

  // Active Session state
  const [session, setSession] = useState(null);
  const [candidateResponse, setCandidateResponse] = useState("");
  const [submittingTurn, setSubmittingTurn] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);
  const [syncingGraph, setSyncingGraph] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");

  const chatBottomRef = useRef(null);

  // Load initial options and past sessions
  useEffect(() => {
    api.get("/resumes")
      .then(({ data }) => {
        setResumes(data.resumes || []);
        if (!selectedResumeId && data.resumes?.length > 0) {
          setSelectedResumeId(data.resumes[0]._id);
        }
      })
      .catch(() => {});

    loadPastSessions();
  }, []);

  const loadPastSessions = () => {
    api.get("/simulations")
      .then(({ data }) => setPastSessions(data.sessions || []))
      .catch(() => {});
  };

  // If a session ID is given in URL or selected, load it
  const activeSessionId = paramSessionId || searchParams.get("sessionId");
  useEffect(() => {
    if (!activeSessionId) return;
    setLoadingSession(true);
    setError("");

    api.get(`/simulations/${activeSessionId}`)
      .then(({ data }) => {
        setSession(data.session);
        setSyncedSuccess(Boolean(data.session?.finalReport?.syncedToGraph));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingSession(false));
  }, [activeSessionId]);

  // Scroll to bottom when turns update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session?.turns?.length, submittingTurn]);

  // Start new simulation session
  const handleStartSimulation = async (e) => {
    e?.preventDefault();
    if (!competencyInput.trim()) return;

    setStarting(true);
    setError("");
    try {
      const { data } = await api.post("/simulations/start", {
        resumeId: selectedResumeId || undefined,
        competencyTarget: competencyInput.trim(),
        scenarioType,
        difficulty,
        roleContext: `${difficulty} Engineer`,
      });

      setSession(data.session);
      navigate(`/simulations?sessionId=${data.session._id}`, { replace: true });
      loadPastSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  // Submit candidate answer for active turn
  const handleSubmitTurn = async (e) => {
    e?.preventDefault();
    if (!candidateResponse.trim() || !session) return;

    setSubmittingTurn(true);
    setError("");
    const answer = candidateResponse.trim();
    setCandidateResponse("");

    try {
      const { data } = await api.post(`/simulations/${session._id}/turn`, { answer });
      setSession(data.session);
      loadPastSessions();
    } catch (err) {
      setError(err.message);
      setCandidateResponse(answer); // preserve input on error
    } finally {
      setSubmittingTurn(false);
    }
  };

  // Request hint
  const handleRequestHint = async () => {
    if (!session || requestingHint) return;
    setRequestingHint(true);
    try {
      const { data } = await api.post(`/simulations/${session._id}/hint`);
      // Update local session turns hint
      setSession(prev => {
        if (!prev) return prev;
        const updatedTurns = [...prev.turns];
        const lastIdx = updatedTurns.length - 1;
        if (lastIdx >= 0) {
          updatedTurns[lastIdx] = { ...updatedTurns[lastIdx], hintProvided: data.hint };
        }
        return { ...prev, turns: updatedTurns };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestingHint(false);
    }
  };

  // Sync final simulation score to Knowledge Graph
  const handleSyncToGraph = async () => {
    if (!session) return;
    setSyncingGraph(true);
    setError("");
    try {
      await api.post(`/simulations/${session._id}/sync-to-graph`);
      setSyncedSuccess(true);
      setSession(prev => ({
        ...prev,
        finalReport: { ...prev.finalReport, syncedToGraph: true },
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingGraph(false);
    }
  };

  const currentTurn = session?.turns?.[session.turns.length - 1];
  const isCompleted = session?.status === "completed";

  return (
    <div className="page-wrap sim-page-layout">
      {/* Topbar Header */}
      <header className="topbar">
        <div>
          <span className="breadcrumb">
            <Link to="/">Workspace</Link> <span>/</span> Simulation Studio
          </span>
          <h1>Adaptive Generative <em>Simulation Studio</em></h1>
          <p>
            Multi-turn stateful simulations that evaluate realistic diagnostic reasoning, trade-offs, and technical problem-solving.
          </p>
        </div>

        {session && (
          <button
            onClick={() => {
              setSession(null);
              navigate("/simulations", { replace: true });
            }}
            className="button button-white"
          >
            <RefreshCcw size={16} /> New Scenario Setup
          </button>
        )}
      </header>

      {error && (
        <div style={{ padding: "14px 18px", background: "#FFE4E6", color: "#BE123C", borderRadius: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW A: SCENARIO LAUNCHER (If no active session) */}
      {!session && !loadingSession && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
          <div className="clay-panel-card" style={{ padding: "30px 34px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ marginBottom: "8px" }}>
              <span className="eyebrow">DIAGNOSTIC BENCHMARK</span>
              <h2 style={{ margin: "4px 0 8px", fontSize: "22px", color: "var(--ink-primary)" }}>
                Configure an Adaptive Evaluation
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--ink-secondary)" }}>
                Select a resume competency gap, challenge domain, and seniority tier to generate a tailored scenario.
              </p>
            </div>

            <form onSubmit={handleStartSimulation} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Resume Selector */}
              {resumes.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", marginBottom: "6px", textTransform: "uppercase" }}>
                    Associated Resume Context
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={e => setSelectedResumeId(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "12px", border: "1px solid #E2D9CC", background: "#FAF7F2", fontSize: "14px" }}
                  >
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.title || r.content?.fullName || "Resume"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Competency Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", marginBottom: "6px", textTransform: "uppercase" }}>
                  Target Competency to Assess
                </label>
                <input
                  type="text"
                  value={competencyInput}
                  onChange={e => setCompetencyInput(e.target.value)}
                  placeholder="e.g. Distributed Systems, Kafka Lag, Database Sharding, Incident Response"
                  required
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #E2D9CC", background: "#FAF7F2", fontSize: "14px" }}
                />
              </div>

              {/* Scenario Type Selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Scenario Archetype
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {SCENARIO_TYPES.map(st => {
                    const Icon = st.icon;
                    const isSelected = scenarioType === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setScenarioType(st.id)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "14px",
                          border: isSelected ? "2px solid var(--clay-teal)" : "1px solid #E2D9CC",
                          background: isSelected ? "#F0FDF4" : "#FAF7F2",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Icon size={18} color={isSelected ? "var(--clay-teal)" : "var(--ink-secondary)"} />
                        <span style={{ fontSize: "13px", fontWeight: isSelected ? "700" : "600", color: "var(--ink-primary)" }}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--ink-muted)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Evaluation Difficulty Level
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {DIFFICULTIES.map(diff => (
                    <button
                      type="button"
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`graph-filter-btn ${difficulty === diff ? "active" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={starting || !competencyInput.trim()}
                className="button button-orange"
                style={{ marginTop: "12px", justifyContent: "center", padding: "14px", fontSize: "15px" }}
              >
                <Play size={18} />
                {starting ? "Generating Scenario & Rubric…" : "Generate Scenario & Begin Simulation"}
              </button>
            </form>
          </div>

          {/* Past Sessions List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: "4px 0 0", fontSize: "18px", color: "var(--ink-primary)" }}>
              Recent Simulation Records
            </h3>
            {pastSessions.length === 0 ? (
              <div style={{ padding: "26px", background: "var(--clay-card-bg)", borderRadius: "18px", border: "1px solid var(--clay-card-border)", textAlign: "center", color: "var(--ink-muted)" }}>
                No simulations completed yet. Launch your first scenario to test and verify skills!
              </div>
            ) : (
              pastSessions.map(ps => (
                <div
                  key={ps._id}
                  onClick={() => navigate(`/simulations?sessionId=${ps._id}`)}
                  style={{
                    padding: "16px 20px",
                    background: "var(--clay-card-bg)",
                    border: "1px solid var(--clay-card-border)",
                    borderRadius: "16px",
                    boxShadow: "var(--clay-shadow-sm)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="sim-badge teal" style={{ fontSize: "10px", padding: "2px 8px" }}>
                        {ps.difficulty}
                      </span>
                      <small style={{ color: "var(--ink-muted)", fontSize: "11px" }}>
                        {new Date(ps.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <b style={{ fontSize: "14px", color: "var(--ink-primary)", display: "block" }}>
                      {ps.scenario?.title || ps.competencyTarget}
                    </b>
                    <small style={{ color: "var(--ink-secondary)" }}>
                      Target: {ps.competencyTarget}
                    </small>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {ps.finalReport?.overallScore ? (
                      <div>
                        <b style={{ fontSize: "18px", color: "var(--clay-teal)" }}>
                          {ps.finalReport.overallScore}/100
                        </b>
                        <small style={{ display: "block", color: "#059669", fontSize: "11px", fontWeight: "700" }}>
                          {ps.finalReport.verdict}
                        </small>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#D97706", fontWeight: "600" }}>
                        In progress (Turn {ps.currentTurn})
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW B: ACTIVE SIMULATION SESSION */}
      {session && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Briefing Banner */}
          <div className="sim-briefing-banner">
            <div className="sim-badge-row">
              <span className="sim-badge orange">
                <Flame size={14} /> {session.scenarioType.replace(/_/g, " ")}
              </span>
              <span className="sim-badge purple">
                {session.difficulty} Difficulty
              </span>
              <span className="sim-badge teal">
                Role: {session.roleContext}
              </span>
              <span className="sim-badge amber">
                {session.status === "completed" ? "Simulation Concluded" : `Turn ${session.currentTurn} of ${session.scenario.maxTurns}`}
              </span>
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: "22px", color: "var(--ink-primary)" }}>
              {session.scenario.title}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--ink-secondary)", lineHeight: "1.5" }}>
              {session.scenario.description}
            </p>

            {/* Architecture / Telemetry Snapshot */}
            {session.scenario.initialTelemetry && (
              <div style={{ background: "#211E2E", borderRadius: "12px", padding: "14px 18px", color: "#A7F3D0", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.5", overflowX: "auto" }}>
                <span style={{ color: "#F472B6", fontWeight: "700" }}>[INCIDENT TELEMETRY STREAM]</span>
                <br />
                {session.scenario.initialTelemetry}
              </div>
            )}

            {/* Active Constraints */}
            {session.scenario.constraints?.length > 0 && (
              <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--ink-muted)", textTransform: "uppercase" }}>
                  Operational Constraints:
                </span>
                {session.scenario.constraints.map((c, i) => (
                  <span key={i} style={{ fontSize: "12px", background: "#FAF7F2", border: "1px solid #EAE0D0", borderRadius: "8px", padding: "4px 10px", color: "var(--ink-primary)" }}>
                    • {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline of Turns */}
          <div className="sim-timeline">
            {session.turns.map((turn, idx) => {
              const isCurrentTurn = idx === session.turns.length - 1 && !isCompleted;

              return (
                <div
                  key={idx}
                  className={`sim-turn-card ${isCurrentTurn ? "active-turn" : ""}`}
                >
                  <div className="sim-turn-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--clay-teal)", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px" }}>
                        {turn.turnNumber}
                      </span>
                      <b style={{ fontSize: "15px", color: "var(--ink-primary)" }}>
                        Stage {turn.turnNumber}: Incident Challenge
                      </b>
                    </div>
                    {turn.evaluation && (
                      <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--clay-teal)", background: "#CCFBF1", padding: "4px 12px", borderRadius: "999px" }}>
                        Score: {turn.evaluation.turnScore}/100
                      </span>
                    )}
                  </div>

                  {/* AI Challenge Prompt */}
                  <div style={{ fontSize: "15px", color: "var(--ink-primary)", lineHeight: "1.6", fontWeight: "500" }}>
                    {turn.prompt}
                  </div>

                  {/* Dynamic Constraint Alert if Injected */}
                  {turn.injectedConstraint && (
                    <div className="sim-injected-alert">
                      <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <b>Dynamic System Complication Injected:</b>
                        <div>{turn.injectedConstraint}</div>
                      </div>
                    </div>
                  )}

                  {/* Hint banner if requested */}
                  {turn.hintProvided && (
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "12px 16px", color: "#1E40AF", display: "flex", gap: "10px", fontSize: "13px" }}>
                      <Lightbulb size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <b>Diagnostic Hint:</b>
                        <div>{turn.hintProvided}</div>
                      </div>
                    </div>
                  )}

                  {/* Candidate Submitted Answer */}
                  {turn.candidateAnswer && (
                    <div style={{ background: "#FAF7F2", borderLeft: "3px solid var(--clay-purple)", padding: "12px 16px", borderRadius: "0 12px 12px 0" }}>
                      <small style={{ color: "var(--clay-purple)", fontWeight: "800", textTransform: "uppercase", fontSize: "11px", display: "block", marginBottom: "4px" }}>
                        Your Submitted Response
                      </small>
                      <div style={{ fontSize: "14px", color: "var(--ink-primary)", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {turn.candidateAnswer}
                      </div>
                    </div>
                  )}

                  {/* Evaluator Rubric Feedback */}
                  {turn.evaluation && (
                    <div className="sim-rubric-card">
                      <b style={{ fontSize: "13px", color: "var(--ink-primary)", display: "block", marginBottom: "6px" }}>
                        Evaluator Assessment:
                      </b>
                      <p style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--ink-secondary)", lineHeight: "1.4" }}>
                        {turn.evaluation.feedback}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "10px 0" }}>
                        <div style={{ background: "#F0FDF4", padding: "10px 12px", borderRadius: "10px", border: "1px solid #DCFCE7" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#15803D", textTransform: "uppercase" }}>Strengths Observed</span>
                          <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", color: "#166534" }}>
                            {turn.evaluation.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div style={{ background: "#FFF1F2", padding: "10px 12px", borderRadius: "10px", border: "1px solid #FFE4E6" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "#BE123C", textTransform: "uppercase" }}>Blind Spots / Missing Details</span>
                          <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", color: "#9F1239" }}>
                            {turn.evaluation.gapsObserved?.map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        </div>
                      </div>

                      {/* Rubric Dimension Breakdown Bars */}
                      <div className="sim-dimension-grid">
                        {Object.entries(turn.evaluation.scores || {}).map(([dim, score]) => (
                          <div key={dim} className="sim-dimension-item">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700" }}>
                              <span style={{ color: "var(--ink-secondary)" }}>{dim}</span>
                              <span style={{ color: "var(--clay-teal)" }}>{score}%</span>
                            </div>
                            <div className="sim-dimension-bar-track">
                              <div className="sim-dimension-bar-fill" style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response Input for Active Turn */}
                  {isCurrentTurn && (
                    <form onSubmit={handleSubmitTurn} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                      <textarea
                        rows={5}
                        placeholder="Detail your diagnostic steps, root cause hypothesis, specific telemetry inspected, and concrete mitigation actions…"
                        value={candidateResponse}
                        onChange={e => setCandidateResponse(e.target.value)}
                        required
                        disabled={submittingTurn}
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          borderRadius: "14px",
                          border: "1px solid #D8CEBE",
                          background: "#FAF7F2",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={handleRequestHint}
                          disabled={requestingHint || submittingTurn}
                          className="button button-white"
                          style={{ fontSize: "13px" }}
                        >
                          <Lightbulb size={16} />
                          {requestingHint ? "Generating Hint…" : "Request Guided Hint"}
                        </button>

                        <button
                          type="submit"
                          disabled={submittingTurn || !candidateResponse.trim()}
                          className="button button-orange"
                          style={{ fontSize: "14px", padding: "10px 22px" }}
                        >
                          <Send size={16} />
                          {submittingTurn ? "Evaluating with Rubric…" : "Submit Diagnostic Answer"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* FINAL COMPLETION REPORT CARD */}
          {isCompleted && session.finalReport && (
            <div className="sim-report-hero">
              <Award size={48} color="var(--clay-teal)" />
              <div style={{ maxWidth: "600px" }}>
                <span className="eyebrow" style={{ color: "var(--clay-teal)" }}>SIMULATION BENCHMARK COMPLETE</span>
                <h2 style={{ fontSize: "28px", margin: "6px 0 10px", color: "var(--ink-primary)" }}>
                  {session.finalReport.verdict}
                </h2>
                <div style={{ fontSize: "36px", fontWeight: "900", color: "var(--clay-teal)", marginBottom: "8px" }}>
                  {session.finalReport.overallScore}<span style={{ fontSize: "20px", color: "var(--ink-muted)" }}>/100</span>
                </div>
                <p style={{ fontSize: "14px", color: "var(--ink-secondary)", lineHeight: "1.5" }}>
                  Demonstrated hands-on proficiency in <b>{session.competencyTarget}</b> across all {session.turns.length} diagnostic stages.
                </p>
              </div>

              {/* Action: Sync to Knowledge Graph */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px" }}>
                {syncedSuccess ? (
                  <div className="sim-sync-badge">
                    <CheckCircle2 size={16} /> Synced as Empirical Evidence in Knowledge Graph!
                  </div>
                ) : (
                  <button
                    onClick={handleSyncToGraph}
                    disabled={syncingGraph}
                    className="button button-teal"
                    style={{ fontSize: "14px", padding: "12px 24px" }}
                  >
                    <Sparkles size={16} />
                    {syncingGraph ? "Syncing Evidence…" : "Sync Outcome into Knowledge Graph"}
                  </button>
                )}

                <Link to="/practice-plan" className="button button-white" style={{ fontSize: "14px" }}>
                  View Practice Plan ↗
                </Link>
              </div>

              {/* Practice Recommendations */}
              {session.finalReport.practiceRecommendations?.length > 0 && (
                <div style={{ width: "100%", maxWidth: "740px", textAlign: "left", background: "#FAF7F2", border: "1px solid #EAE0D0", borderRadius: "18px", padding: "20px 24px", marginTop: "14px" }}>
                  <b style={{ fontSize: "14px", color: "var(--ink-primary)", display: "block", marginBottom: "8px" }}>
                    Personalized Practice Recommendations:
                  </b>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--ink-secondary)", lineHeight: "1.6" }}>
                    {session.finalReport.practiceRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
