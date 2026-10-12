import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileUp, FileText, Mic, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import gsap from "gsap";
import api from "../../lib/api";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

export default function UploadPage() {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    gsap.fromTo(
      ".gsap-upload-step",
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power2.out" }
    );
    gsap.fromTo(
      ".upload-zone",
      { opacity: 0, scale: 0.95, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.5)", delay: 0.1 }
    );
    gsap.fromTo(
      ".job-description-panel",
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.2 }
    );
  }, []);

  function selectFile(next) {
    setError("");
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) return setError("Please choose a PDF file.");
    if (next.size > 8 * 1024 * 1024) return setError("File must be 8 MB or smaller.");
    setFile(next);

    // GSAP celebration bounce on file drop
    gsap.fromTo(".upload-zone", { scale: 0.98 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
  }

  async function analyze() {
    if (!file) return setError("Choose a PDF resume first.");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("jobDescription", jobDescription);
      const { data } = await api.post("/resumes/analyze", form, { headers: { "Content-Type": "multipart/form-data" } });
      navigate(`/resume/${data.resume._id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap narrow-page" style={{ perspective: "1200px" }}>
      <header className="topbar">
        <div>
          <span className="breadcrumb">Workspace <span>/</span> New Analysis</span>
          <h1>Upload Your Resume <em>&amp; Get Started</em></h1>
          <p>Let's build your success story! Upload your PDF and our AI companion will craft a custom review.</p>
        </div>
      </header>

      <div className="step-row">
        <span className="step-number gsap-upload-step">01</span>
        <div className="gsap-upload-step">
          <b>Upload your resume</b>
          <small>PDF format · Up to 8 MB</small>
        </div>
        <span className="step-line"></span>
        <span className="step-number step-muted gsap-upload-step">02</span>
        <div className="step-muted-text gsap-upload-step">
          <b>Review insights &amp; prep</b>
          <small>ATS, skills, 10 speech interview questions</small>
        </div>
      </div>

      <Gsap3DCard maxTilt={5}>
        <section
          className={`upload-zone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selectFile(e.dataTransfer.files?.[0]);
          }}
        >
          {file ? (
            <>
              <div className="upload-symbol success-symbol">
                <CheckCircle2 size={32} />
              </div>
              <h2>{file.name}</h2>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze with 3D AI companion</p>
              <button
                className="text-link"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Choose a different file
              </button>
            </>
          ) : (
            <>
              <div className="upload-symbol">
                <FileUp size={32} />
              </div>
              <h2>Drop your resume here</h2>
              <p>Drag and drop your PDF or click browse to import your career experience.</p>
              <button className="button button-secondary" onClick={() => inputRef.current?.click()}>
                Browse files <ArrowRight size={16} />
              </button>
              <span className="upload-footnote">PDF only · Maximum 8 MB · Safe &amp; private</span>
            </>
          )}
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => selectFile(e.target.files?.[0])} />
        </section>
      </Gsap3DCard>

      <section className="job-description-panel">
        <div className="panel-heading">
          <div className="panel-icon">
            <FileText size={20} />
          </div>
          <div>
            <h3>Targeting a specific role?</h3>
            <p>Paste the job description for pinpoint ATS keyword matching and role-specific interview prep.</p>
          </div>
          <span className="optional-tag">OPTIONAL</span>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the target job description or role requirements here…"
          rows={5}
          maxLength={10000}
        />
        <div className="textarea-meta">
          <span>We'll calculate match percentage and missing keywords.</span>
          <span>{jobDescription.length.toLocaleString()}/10,000</span>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      <button className="button button-orange button-full analyze-button" disabled={!file || busy} onClick={analyze}>
        {busy ? (
          <>
            <span className="spinner spinner-light" /> Analyzing with 3D AI companion…
          </>
        ) : (
          <>
            <Sparkles size={18} /> Analyze with AI <ArrowRight size={18} />
          </>
        )}
      </button>

      <div className="privacy-note">
        <ShieldCheck size={18} />
        <span>
          <b>Your resume stays private.</b> Documents are stored securely and associated only with your account.
        </span>
      </div>

      <div className="what-you-get">
        <span className="eyebrow">WHAT YOU'LL UNLOCK</span>
        <div className="benefit-grid">
          <Gsap3DCard maxTilt={8} style={{ background: "#FFFFFF", padding: "16px", borderRadius: "18px", boxShadow: "var(--clay-shadow-sm)" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <CheckCircle2 size={20} color="var(--clay-teal)" />
              <div>
                <b>3D Resume Score</b>
                <small style={{ display: "block", color: "var(--ink-secondary)", marginTop: "4px" }}>
                  Actionable score with strengths &amp; priority fixes
                </small>
              </div>
            </div>
          </Gsap3DCard>

          <Gsap3DCard maxTilt={8} style={{ background: "#FFFFFF", padding: "16px", borderRadius: "18px", boxShadow: "var(--clay-shadow-sm)" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <CheckCircle2 size={20} color="var(--clay-teal)" />
              <div>
                <b>ATS Keyword Insights</b>
                <small style={{ display: "block", color: "var(--ink-secondary)", marginTop: "4px" }}>
                  Matched and missing skills for your target role
                </small>
              </div>
            </div>
          </Gsap3DCard>

          <Gsap3DCard maxTilt={8} style={{ background: "#FFFFFF", padding: "16px", borderRadius: "18px", boxShadow: "var(--clay-shadow-sm)" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <Mic size={20} color="var(--clay-purple)" />
              <div>
                <b>10 Voice Interview Qs</b>
                <small style={{ display: "block", color: "var(--ink-secondary)", marginTop: "4px" }}>
                  Speech-enabled mock practice with AI feedback
                </small>
              </div>
            </div>
          </Gsap3DCard>
        </div>
      </div>
    </div>
  );
}
