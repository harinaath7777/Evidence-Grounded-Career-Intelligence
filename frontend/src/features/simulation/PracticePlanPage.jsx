import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award, BookOpen, CheckCircle2, ChevronRight, Flame,
  Layers, Play, Sparkles, Target, Zap
} from "lucide-react";
import api from "../../lib/api";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

export default function PracticePlanPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [gaps, setGaps] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/resumes"),
      api.get("/simulations"),
    ])
      .then(([resumesRes, simRes]) => {
        const rList = resumesRes.data.resumes || [];
        setResumes(rList);
        setSessions(simRes.data.sessions || []);

        if (rList.length > 0) {
          setSelectedResumeId(rList[0]._id);
          fetchGaps(rList[0]._id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchGaps = (resumeId) => {
    setLoading(true);
    api.get(`/graph/resume/${resumeId}/analysis`)
      .then(({ data }) => {
        setGaps(data.analysis?.gaps || []);
      })
      .catch(() => setGaps([]))
      .finally(() => setLoading(false));
  };

  const handleResumeChange = (newId) => {
    setSelectedResumeId(newId);
    fetchGaps(newId);
  };

  const completedSessions = sessions.filter(s => s.status === "completed" && s.finalReport?.overallScore);

  return (
    <div className="page-wrap sim-page-layout">
      {/* Topbar Header */}
      <header className="topbar">
        <div>
          <span className="breadcrumb">
            <Link to="/">Workspace</Link> <span>/</span> Practice Plan
          </span>
          <h1>Personalized <em>Practice Roadmap</em></h1>
          <p>
            Targeted drills generated from your Knowledge Graph competency gaps and empirical simulation outcomes.
          </p>
        </div>

        {resumes.length > 1 && (
          <select
            value={selectedResumeId}
            onChange={e => handleResumeChange(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: "12px", border: "1px solid #E2D9CC", background: "#FAF7F2", fontSize: "13px", fontWeight: "600" }}
          >
            {resumes.map(r => (
              <option key={r._id} value={r._id}>{r.title || "Resume"}</option>
            ))}
          </select>
        )}
      </header>

      {/* Overview Cards */}
      <div className="stats-grid">
        <Gsap3DCard className="stat-card">
          <div className="stat-icon violet">
            <Target size={22} />
          </div>
          <span>Active Gaps</span>
          <b>{gaps.length}</b>
          <small>Unverified claims or missing requirements</small>
        </Gsap3DCard>

        <Gsap3DCard className="stat-card">
          <div className="stat-icon teal">
            <Award size={22} />
          </div>
          <span>Simulations Verified</span>
          <b>{completedSessions.length}</b>
          <small>Observed hands-on performances</small>
        </Gsap3DCard>

        <Gsap3DCard className="stat-card">
          <div className="stat-icon peach">
            <Zap size={22} />
          </div>
          <span>Avg Simulation Score</span>
          <b>
            {completedSessions.length
              ? Math.round(completedSessions.reduce((sum, s) => sum + s.finalReport.overallScore, 0) / completedSessions.length)
              : "—"}
            {completedSessions.length ? "/100" : ""}
          </b>
          <small>Multi-metric rubric rating</small>
        </Gsap3DCard>
      </div>

      {/* Target Competency Drills */}
      <section style={{ marginTop: "20px" }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow" style={{ color: "var(--clay-teal)" }}>RECOMMENDED DRILLS</span>
            <h2>Priority Technical &amp; System Challenges</h2>
          </div>
        </div>

        {loading ? (
          <div className="app-loading" style={{ height: "200px" }}>
            <span className="spinner" /> Analyzing gaps…
          </div>
        ) : gaps.length === 0 ? (
          <div style={{ padding: "30px", background: "var(--clay-card-bg)", borderRadius: "20px", border: "1px solid var(--clay-card-border)", textAlign: "center" }}>
            <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 10px" }} />
            <h3 style={{ margin: "0 0 4px", fontSize: "17px", color: "var(--ink-primary)" }}>All Competencies Well-Grounded!</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-secondary)" }}>
              No critical gaps detected. You can still practice any skill in the Simulation Studio anytime.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}>
            {gaps.map((gap) => (
              <Gsap3DCard key={gap.id} className="clay-panel-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="sim-badge orange" style={{ fontSize: "11px", padding: "2px 8px" }}>
                        {gap.severity} priority
                      </span>
                      <small style={{ color: "var(--ink-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "700" }}>
                        {gap.category}
                      </small>
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "var(--ink-primary)" }}>
                      {gap.competencyName}
                    </h3>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-secondary)", maxWidth: "680px" }}>
                      {gap.description}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/simulations?resumeId=${selectedResumeId}&competency=${encodeURIComponent(gap.competencyName)}&type=${gap.suggestedScenarioType || "production_outage"}`)}
                    className="button button-orange"
                    style={{ fontSize: "13px", padding: "10px 18px" }}
                  >
                    <Play size={15} /> Practice Drill <span>↗</span>
                  </button>
                </div>
              </Gsap3DCard>
            ))}
          </div>
        )}
      </section>

      {/* Completed Verification History */}
      {completedSessions.length > 0 && (
        <section style={{ marginTop: "28px" }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow" style={{ color: "#059669" }}>EMPIRICAL PROOF</span>
              <h2>Verified Simulation Performances</h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", marginTop: "14px" }}>
            {completedSessions.map(cs => (
              <div
                key={cs._id}
                onClick={() => navigate(`/simulations?sessionId=${cs._id}`)}
                style={{
                  background: "var(--clay-card-bg)",
                  border: "1px solid var(--clay-card-border)",
                  borderRadius: "18px",
                  padding: "18px 22px",
                  cursor: "pointer",
                  boxShadow: "var(--clay-shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="sim-badge teal" style={{ fontSize: "11px", padding: "3px 8px" }}>
                    Verified · {cs.difficulty}
                  </span>
                  <b style={{ fontSize: "18px", color: "var(--clay-teal)" }}>
                    {cs.finalReport.overallScore}/100
                  </b>
                </div>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--ink-primary)" }}>
                  {cs.scenario?.title || cs.competencyTarget}
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-secondary)" }}>
                  Verdict: <b>{cs.finalReport.verdict}</b>
                </p>
                {cs.finalReport.syncedToGraph && (
                  <small style={{ color: "#059669", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> Connected to Knowledge Graph
                  </small>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
