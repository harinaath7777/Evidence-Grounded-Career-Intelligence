import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeft, Check, ChevronDown, ChevronUp, MessageCircle, Network, Plus, Save, Sparkles, Terminal, Trash2, Wand2 } from "lucide-react";
import gsap from "gsap";
import api from "../../lib/api";
import ResumeChat from "./ResumeChat";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

const emptyContent = { fullName: "", email: "", phone: "", location: "", website: "", summary: "", skills: [], experience: [], education: [], projects: [], certifications: [] };

function InputField({ label, value, onChange, placeholder = "" }) {
  return <label className="editor-field">{label}<input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function AnimatedScoreRing({ score = 0 }) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const ringRef = useRef(null);

  useEffect(() => {
    const targetScore = Number(score) || 0;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: targetScore,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => setDisplayedScore(Math.round(obj.val)),
    });

    if (ringRef.current) {
      gsap.fromTo(
        ringRef.current,
        { scale: 0.88, rotateZ: -15 },
        { scale: 1, rotateZ: 0, duration: 1, ease: "elastic.out(1, 0.45)" }
      );
    }
  }, [score]);

  return (
    <div
      ref={ringRef}
      className="score-ring"
      style={{
        "--score": `${displayedScore}%`,
        willChange: "transform",
      }}
    >
      <div>
        <b>{score ? displayedScore : "—"}</b>
        <small>/100</small>
      </div>
    </div>
  );
}

export default function ResumeEditorPage() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [content, setContent] = useState(emptyContent);
  const [title, setTitle] = useState("My resume");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("content");
  const [chatOpen, setChatOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/resumes/${id}`);
      setResume(data.resume); setContent({ ...emptyContent, ...data.resume.content }); setTitle(data.resume.title); setJobDescription(data.resume.jobDescription || "");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function change(key, value) { setContent(current => ({ ...current, [key]: value })); setSaved(false); }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const { data } = await api.put(`/resumes/${id}`, { title, jobDescription, content });
      setResume(data.resume); setContent({ ...emptyContent, ...data.resume.content }); setSaved(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function exportPdf() {
    setError("");
    setExporting(true);
    try {
      await save();
      const response = await api.get(`/resumes/${id}/export.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const cleanName = (content.fullName || title || "resume").replace(/\.pdf$/i, "").replace(/\s+/g, "-");
      link.href = url;
      link.download = `${cleanName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          setError(parsed.message || "Export failed.");
        } catch { setError(e.message); }
      } else {
        setError(e.message);
      }
    } finally {
      setExporting(false);
    }
  }

  async function reanalyze(switchToInsights = false) {
    setError("");
    setAnalyzing(true);
    try {
      await save();
      const { data } = await api.post(`/resumes/${id}/analyze`, {
        title,
        jobDescription,
        content,
      });
      setResume(data.resume);
      if (switchToInsights) {
        setTab("insights");
      }
    } catch (e) {
      setError(e.message || "Could not analyze resume.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <div className="app-loading"><span className="spinner" /> Loading resume…</div>;
  if (!resume) return <div className="page-wrap"><div className="alert alert-error">{error || "Resume not found."}</div><Link to="/" className="text-link"><ArrowLeft size={15} /> Back to workspace</Link></div>;

  return (
    <div className="page-wrap editor-page">
      <header className="topbar editor-topbar"><div><Link to="/" className="back-link"><ArrowLeft size={15} /> All resumes</Link><div className="title-edit-row"><input className="title-input" value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} /><span className={`save-state ${saved ? "saved" : ""}`}>{saved ? <><Check size={13} /> Saved</> : "Unsaved changes"}</span></div><p>Make every section earn its place.</p></div><div className="topbar-actions"><button className="button button-secondary" onClick={() => setChatOpen(v => !v)}><MessageCircle size={16} /> AI writing coach</button><button className="button button-primary" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button></div></header>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="editor-tabs">
        <button className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>Resume editor</button>
        <button className={tab === "insights" ? "active" : ""} onClick={() => setTab("insights")}>AI insights {resume.analysis && <span className="tab-dot" />}</button>
        <button className={tab === "target" ? "active" : ""} onClick={() => setTab("target")}>Target role</button>
        <div className="tabs-spacer"></div>
        <Link to={`/resume/${id}/graph`} className="export-tab" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Network size={14} /> Knowledge Graph
        </Link>
        <Link to={`/simulations?resumeId=${id}`} className="export-tab" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Terminal size={14} /> Simulation Studio
        </Link>
        <button className="export-tab" onClick={exportPdf} disabled={exporting}>
          <ArrowDownToLine size={15} /> {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </div>
      {tab === "content" && <div className="editor-layout">
        <div className="editor-main">
          <section className="editor-section"><div className="editor-section-heading"><div><span className="eyebrow">01 / CONTACT</span><h2>Start with the basics</h2></div><span className="section-count">Your details</span></div><div className="fields-grid"><InputField label="Full name" value={content.fullName} onChange={v => change("fullName", v)} placeholder="Your full name" /><InputField label="Email" value={content.email} onChange={v => change("email", v)} placeholder="you@example.com" /><InputField label="Phone" value={content.phone} onChange={v => change("phone", v)} placeholder="+1 555 000 0000" /><InputField label="Location" value={content.location} onChange={v => change("location", v)} placeholder="City, Country" /><InputField label="Website / LinkedIn" value={content.website} onChange={v => change("website", v)} placeholder="linkedin.com/in/you" /></div></section>
          <section className="editor-section"><div className="editor-section-heading"><div><span className="eyebrow">02 / POSITIONING</span><h2>Professional summary</h2></div><button className="mini-action" onClick={() => setChatOpen(true)}><Sparkles size={14} /> Improve with AI</button></div><textarea className="editor-textarea" value={content.summary || ""} onChange={e => change("summary", e.target.value)} placeholder="Write 2–4 lines that connect your strengths to the role you want…" rows={5} /><span className="field-hint">Keep it specific. Use real strengths and avoid generic claims.</span></section>
          <section className="editor-section"><div className="editor-section-heading"><div><span className="eyebrow">03 / CAPABILITIES</span><h2>Skills</h2></div></div><textarea className="editor-textarea" value={(content.skills || []).join(", ")} onChange={e => change("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="React, Node.js, SQL, project management…" rows={3} /><span className="field-hint">Separate skills with commas.</span></section>
          <DynamicSection title="Experience" eyebrow="04 / EXPERIENCE" items={content.experience || []} fields={[["role","Role / title"],["company","Company"],["location","Location"],["startDate","Start date"],["endDate","End date"]]} listKey="bullets" listLabel="Impact bullets" onChange={items => change("experience", items)} />
          <DynamicSection title="Projects" eyebrow="05 / SELECTED PROJECTS" items={content.projects || []} fields={[["name","Project name"]]} listKey="bullets" listLabel="Project bullets" extraKey="technologies" extraLabel="Technologies (comma separated)" onChange={items => change("projects", items)} />
          <DynamicSection title="Education" eyebrow="06 / EDUCATION" items={content.education || []} fields={[["degree","Degree / program"],["institution","Institution"],["location","Location"],["startDate","Start date"],["endDate","End date"]]} listKey="details" listLabel="Details" onChange={items => change("education", items)} />
          <section className="editor-section"><div className="editor-section-heading"><div><span className="eyebrow">07 / CREDENTIALS</span><h2>Certifications</h2></div></div><textarea className="editor-textarea" rows={2} value={(content.certifications || []).join("\n")} onChange={e => change("certifications", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} placeholder="One certification per line" /></section>
          <div className="editor-bottom-actions"><button className="button button-secondary" onClick={save} disabled={saving || exporting}><Save size={16} /> Save draft</button><button className="button button-primary" onClick={exportPdf} disabled={exporting || saving}><ArrowDownToLine size={16} /> {exporting ? "Generating PDF…" : "Export ATS-friendly PDF"}</button></div>
        </div>
        <aside className="editor-aside"><Gsap3DCard maxTilt={8} className="aside-card score-card"><span className="eyebrow">RESUME SCORE</span><AnimatedScoreRing score={resume.analysis?.overallScore} /><p>{resume.analysis ? "A useful baseline. Focus on the highest-priority improvements first." : "Run an analysis to get personalized feedback."}</p><button className="button button-orange button-full" onClick={() => reanalyze(false)} disabled={analyzing || saving}><Sparkles size={15} /> {analyzing ? "Analyzing resume…" : (resume.analysis ? "Refresh analysis" : "Analyze resume")}</button></Gsap3DCard><div className="aside-card"><span className="eyebrow">QUICK CHECK</span><Checklist content={content} /></div><Gsap3DCard maxTilt={8} className="aside-card assistant-card"><div className="assistant-orb" style={{ overflow: "hidden", padding: 0 }}><img src="/clay-robot-mascot.png" alt="3D Mascot" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div><h3>3D AI Assistant</h3><p>Need stronger bullet points? Ask your 3D coach for grounded suggestions.</p><button className="text-link" onClick={() => setChatOpen(true)}>Open writing coach <ArrowRightIcon /></button></Gsap3DCard></aside>
      </div>}
      {tab === "insights" && <Insights analysis={resume.analysis} onAnalyze={() => reanalyze(false)} analyzing={analyzing} />}
      {tab === "target" && <section className="editor-section target-panel"><div className="editor-section-heading"><div><span className="eyebrow">ROLE ALIGNMENT</span><h2>Job description</h2></div></div><p className="muted">Paste the role you're applying for. Analysis compares this description with your resume and suggests keywords to consider honestly.</p><textarea className="editor-textarea" value={jobDescription} onChange={e => { setJobDescription(e.target.value); setSaved(false); }} rows={12} maxLength={10000} placeholder="Paste the job description here…" /><div className="target-footer"><span className="field-hint">{jobDescription.length.toLocaleString()}/10,000 characters</span><button className="button button-primary" onClick={() => reanalyze(true)} disabled={analyzing || saving}><Sparkles size={15} /> {analyzing ? "Analyzing role alignment…" : "Analyze role alignment"}</button></div></section>}
      {chatOpen && <ResumeChat resumeId={id} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

function ArrowRightIcon() { return <span aria-hidden="true">↗</span>; }

function Checklist({ content }) {
  const checks = [
    ["Contact details", Boolean(content.fullName && content.email)],
    ["Professional summary", Boolean(content.summary?.trim())],
    ["Skills section", Boolean(content.skills?.length)],
    ["Experience or projects", Boolean(content.experience?.length || content.projects?.length)],
    ["Education", Boolean(content.education?.length)],
  ];
  return <div className="checklist">{checks.map(([label, done]) => <div key={label}><span className={done ? "check-dot done" : "check-dot"}>{done ? "✓" : "·"}</span><span>{label}</span><small>{done ? "Added" : "Missing"}</small></div>)}</div>;
}

function DynamicSection({ title, eyebrow, items, fields, listKey, listLabel, extraKey, extraLabel, onChange }) {
  const update = (index, key, value) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const add = () => onChange([...items, { ...Object.fromEntries(fields.map(([key]) => [key, ""])), [listKey]: [], ...(extraKey ? { [extraKey]: [] } : {}) }]);
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  return <section className="editor-section"><div className="editor-section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="mini-action" onClick={add}><Plus size={14} /> Add entry</button></div>{items.length === 0 && <div className="section-empty">No entries yet. Add one, or ask the AI coach to help draft it.</div>}{items.map((item, index) => <div className="dynamic-entry" key={`${title}-${index}`}><div className="dynamic-entry-top"><b>{item[fields[0][0]] || `${title} entry ${index + 1}`}</b><button className="icon-button danger-icon" title="Remove entry" onClick={() => remove(index)}><Trash2 size={15} /></button></div><div className="fields-grid">{fields.map(([key, label]) => <InputField key={key} label={label} value={item[key]} onChange={value => update(index, key, value)} />)}</div>{extraKey && <label className="editor-field">{extraLabel}<input value={(item[extraKey] || []).join(", ")} onChange={e => update(index, extraKey, e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Tools, methods, technologies" /></label>}<label className="editor-field">{listLabel}<textarea className="editor-textarea" rows={3} value={(item[listKey] || []).join("\n")} onChange={e => update(index, listKey, e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} placeholder="One bullet per line" /></label></div>)}</section>;
}

function Insights({ analysis, onAnalyze, analyzing }) {
  if (!analysis) return <div className="empty-state insight-empty"><div className="empty-icon"><Sparkles size={23} /></div><h3>Your insights are waiting.</h3><p>Run an analysis to get a score, strengths, improvement priorities, and job-specific skill gaps.</p><button className="button button-primary" onClick={onAnalyze} disabled={analyzing}><Sparkles size={16} /> {analyzing ? "Analyzing resume…" : "Analyze resume"}</button></div>;
  return <div className="insights-layout"><section className="insight-hero"><div><span className="eyebrow eyebrow-light">YOUR RESUME REVIEW</span><h2>{analysis.overallScore ?? "—"}<small>/100</small></h2><p>{analysis.summary}</p><button className="button button-secondary" style={{ alignSelf: "flex-start", marginTop: "12px", background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onAnalyze} disabled={analyzing}><Sparkles size={14} /> {analyzing ? "Updating insights…" : "Refresh insights"}</button></div><div className="insight-hero-mark">✳</div></section><div className="insight-columns"><section className="insight-card"><span className="eyebrow">WHAT'S WORKING</span><h3>Strengths to keep</h3>{(analysis.strengths || []).map((s,i) => <div className="insight-list-row" key={i}><span className="good-mark">✓</span>{s}</div>)}</section><section className="insight-card"><span className="eyebrow">ROOM TO GROW</span><h3>Recommended improvements</h3>{(analysis.improvements || []).map((item,i) => <div className="improvement-row" key={i}><span className={`priority priority-${item.priority || "medium"}`}>{item.priority || "medium"}</span><b>{item.title}</b><p>{item.detail}</p></div>)}</section></div><div className="insight-columns"><section className="insight-card"><span className="eyebrow">ROLE ALIGNMENT</span><h3>Skills snapshot</h3><div className="skill-group"><b>Matched skills</b><div className="chip-wrap">{(analysis.skills?.matched || []).map(s=><span className="skill-chip matched" key={s}>{s}</span>)}{!analysis.skills?.matched?.length && <span className="muted">No job description match data yet.</span>}</div></div><div className="skill-group"><b>Skills to consider building</b><div className="chip-wrap">{(analysis.skills?.missing || []).map(s=><span className="skill-chip missing" key={s}>{s}</span>)}{!analysis.skills?.missing?.length && <span className="muted">No gaps identified.</span>}</div></div><div className="skill-group"><b>ATS keywords to consider</b><div className="chip-wrap">{(analysis.ats?.keywordsToConsider || []).map(s=><span className="skill-chip" key={s}>{s}</span>)}</div></div></section><section className="insight-card"><span className="eyebrow">ATS READINESS</span><h3>Formatting & keywords</h3><div className="ats-score-row"><b>{analysis.ats?.score ?? "—"}<small>/100</small></b><span>ATS heuristic score</span></div>{(analysis.ats?.findings || []).map((s,i)=><div className="insight-list-row" key={i}><span className="neutral-mark">↗</span>{s}</div>)}</section></div><section className="insight-card interview-preview"><div className="section-heading"><div><span className="eyebrow">PRACTICE WITH PURPOSE</span><h3>Interview questions to rehearse</h3></div></div>{(analysis.interviewQuestions || []).map((item,i)=><details className="question-detail" key={i}><summary><span>{String(i+1).padStart(2,"0")}</span>{item.question}<ChevronDown size={16} /></summary><p>{item.reason}</p>{item.sampleAnswerOutline?.length > 0 && <ul>{item.sampleAnswerOutline.map((line,j)=><li key={j}>{line}</li>)}</ul>}</details>)}<Link to="interview" className="button button-secondary"><Sparkles size={15} /> Open interview practice</Link></section></div>;
}
