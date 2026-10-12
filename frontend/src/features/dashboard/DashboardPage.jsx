import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileText, Network, Plus, Sparkles, Target, Terminal, TrendingUp } from "lucide-react";
import gsap from "gsap";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import Gsap3DHero from "./Gsap3DHero";
import Gsap3DPlayground from "./Gsap3DPlayground";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const statsContainerRef = useRef(null);

  useEffect(() => {
    api.get("/resumes")
      .then(({ data }) => setResumes(data.resumes))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // GSAP Entrance Animations for Stats and Grid
  useEffect(() => {
    if (!loading && statsContainerRef.current) {
      if (document.querySelectorAll(".gsap-stat-card").length > 0) {
        gsap.fromTo(
          ".gsap-stat-card",
          { opacity: 0, y: 35, rotateX: 15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            stagger: 0.12,
            duration: 0.7,
            ease: "back.out(1.5)",
            delay: 0.2,
          }
        );
      }

      if (document.querySelectorAll(".gsap-resume-card").length > 0) {
        gsap.fromTo(
          ".gsap-resume-card",
          { opacity: 0, y: 30, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.08,
            duration: 0.6,
            ease: "power2.out",
            delay: 0.4,
          }
        );
      }
    }
  }, [loading, resumes.length]);

  const analyzed = resumes.filter((r) => r.analysis).length;
  const avg = analyzed
    ? Math.round(
        resumes
          .filter((r) => r.analysis)
          .reduce((sum, r) => sum + Number(r.analysis.overallScore || 0), 0) / analyzed
      )
    : 0;

  return (
    <div className="page-wrap">
      {/* Topbar Header */}
      <header className="topbar">
        <div>
          <span className="breadcrumb">Workspace <span>/</span> 3D AI Studio</span>
          <h1>AI Resume Builder <em>&amp; Career Hub</em></h1>
          <p>Let's build your success story, {user?.name?.split(" ")[0] || "there"}! Ready to craft your standout profile.</p>
        </div>
        <Link to="/upload" className="button button-orange">
          <Plus size={18} /> New analysis
        </Link>
      </header>

      {/* 1. GSAP 3D Interactive Hero with Real-Time Parallax */}
      <Gsap3DHero />

      {/* 2. 3D Clay Stats Grid with GSAP Tilt & Specular Glare */}
      <section ref={statsContainerRef} className="stats-grid">
        <Gsap3DCard className="stat-card gsap-stat-card">
          <div className="stat-icon violet">
            <FileText size={22} />
          </div>
          <span>Saved resumes</span>
          <b>{loading ? "—" : resumes.length}</b>
          <small>Your portfolios in one place</small>
        </Gsap3DCard>

        <Gsap3DCard className="stat-card gsap-stat-card">
          <div className="stat-icon peach">
            <Target size={22} />
          </div>
          <span>Analyses completed</span>
          <b>{loading ? "—" : analyzed}</b>
          <small>Deep ATS &amp; keyword reviews</small>
        </Gsap3DCard>

        <Gsap3DCard className="stat-card gsap-stat-card">
          <div className="stat-icon mint">
            <TrendingUp size={22} />
          </div>
          <span>Average resume score</span>
          <b>{loading || !analyzed ? "—" : `${avg}/100`}</b>
          <small>{analyzed ? "Calculated across analyzed files" : "Upload your first resume"}</small>
        </Gsap3DCard>
      </section>

      {/* Career Intelligence Feature Highlights */}
      <section className="section-block" style={{ marginTop: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <Gsap3DCard
            className="research-highlight-card"
            style={{
              background: "linear-gradient(135deg, #FFFDF9 0%, #F5FBF9 100%)",
              border: "1.5px solid #C6EADB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="sim-badge teal" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Network size={14} /> RESEARCH CONTRIBUTION A
              </span>
            </div>
            <h3>Industry Knowledge Graph</h3>
            <p>
              Visualize evidence-grounded entity relationships connecting candidate skills, shipped projects, public GitHub repositories, and target job requirements with verbatim provenance citations.
            </p>
            <Link to="/graph" className="button button-teal" style={{ alignSelf: "flex-start", fontSize: "13px" }}>
              Explore Competency Graph ↗
            </Link>
          </Gsap3DCard>

          <Gsap3DCard
            className="research-highlight-card"
            style={{
              background: "linear-gradient(135deg, #FFFDF9 0%, #FFF8F5 100%)",
              border: "1.5px solid #FED7AA",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="sim-badge orange" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Terminal size={14} /> RESEARCH CONTRIBUTION B
              </span>
            </div>
            <h3>Adaptive Simulation Studio</h3>
            <p>
              Engage in multi-turn, stateful simulations testing real-world incident diagnostics, architectural trade-offs, and dynamic constraints evaluated against explicit rubric dimensions.
            </p>
            <Link to="/simulations" className="button button-orange" style={{ alignSelf: "flex-start", fontSize: "13px" }}>
              Launch Simulation Studio ↗
            </Link>
          </Gsap3DCard>
        </div>
      </section>

      {/* 3. GSAP 3D Interactive Architecture Showcase / Playground */}
      <Gsap3DPlayground />

      {/* 4. Recent Resumes with 3D Card Hover Depth */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2>Recent resumes</h2>
          </div>
          <Link className="text-link" to="/upload">
            Start new upload <ArrowUpRight size={16} />
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="empty-state">
            <span className="spinner" /> Loading your resumes…
          </div>
        ) : resumes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={28} />
            </div>
            <h3>Your next version starts here.</h3>
            <p>Upload a PDF resume to get grounded AI review, keyword insights, and 10 turn-by-turn speech interview questions.</p>
            <Link to="/upload" className="button button-orange">
              <Plus size={18} /> Analyze a resume
            </Link>
          </div>
        ) : (
          <div className="resume-grid">
            {resumes.map((resume) => (
              <Gsap3DCard key={resume._id} className="gsap-resume-card" maxTilt={10}>
                <Link className="resume-card" to={`/resume/${resume._id}`} style={{ border: "none", boxShadow: "none", height: "100%" }}>
                  <div className="resume-card-top">
                    <div className="document-icon">
                      <FileText size={22} />
                    </div>
                    <span className={`status-pill ${resume.analysis ? "status-ready" : ""}`}>
                      {resume.analysis ? `Score ${resume.analysis.overallScore ?? "—"}/100` : "Draft"}
                    </span>
                  </div>
                  <h3>{resume.title}</h3>
                  <p>{resume.content?.fullName || "Resume workspace"}</p>
                  <div className="resume-card-footer">
                    <span>{resume.analysis ? "Reviewed & Ready" : "Pending analysis"}</span>
                    <ArrowUpRight size={18} />
                  </div>
                </Link>
              </Gsap3DCard>
            ))}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>✨ Resume AI — GSAP 3D Interactive Platform</span>
        <span>Let's Build Your Success Story!</span>
      </footer>
    </div>
  );
}
