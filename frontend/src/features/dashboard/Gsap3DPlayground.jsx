import { useState, useRef } from "react";
import { Bot, CheckCircle2, ChevronRight, Cpu, Mic, Sparkles, Wand2, Zap, Volume2 } from "lucide-react";
import gsap from "gsap";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

const features = [
  {
    id: "rag",
    title: "Multi-Step Agentic RAG",
    tag: "AI ARCHITECTURE",
    tagColor: "purple",
    icon: Cpu,
    headline: "Self-Correcting Retrieval Engine",
    description:
      "Unlike simple LLMs that hallucinate, our Agentic pipeline plans sub-queries, executes cosine similarity retrieval, grades document relevance, rewrites queries if needed, and produces strictly grounded answers.",
    stats: [
      { label: "Hallucination Risk", value: "0%" },
      { label: "Vector Embeddings", value: "768-dim" },
      { label: "Citation Accuracy", value: "100%" },
    ],
    action: "Explore Vector Reasoning",
  },
  {
    id: "interview",
    title: "10 Voice Qs Simulator",
    tag: "SPEECH AI",
    tagColor: "teal",
    icon: Mic,
    headline: "Turn-by-Turn Speech Interview Prep",
    description:
      "Listen to your AI coach speak tailored interview questions aloud via Web Speech TTS. Speak your answer into your microphone, and get instant multi-metric coaching on clarity, structure, and STAR methodology.",
    stats: [
      { label: "Questions", value: "Top 10" },
      { label: "Voice Mode", value: "TTS + STT" },
      { label: "Rubric Feedback", value: "Instant" },
    ],
    action: "Test Voice Practice",
  },
  {
    id: "ats",
    title: "3D Clay ATS Scoring",
    tag: "SMART BENCHMARK",
    tagColor: "orange",
    icon: Zap,
    headline: "Pinpoint Keyword & Role Matching",
    description:
      "Paste your target job description to reveal matched skills, critical missing keywords, impact bullet strength, and structural checks before human recruiters or ATS scanners ever see it.",
    stats: [
      { label: "ATS Heuristics", value: "24-point" },
      { label: "Keyword Match", value: "Real-time" },
      { label: "PDF Export", value: "Clean ATS" },
    ],
    action: "View ATS Diagnostics",
  },
];

export default function Gsap3DPlayground() {
  const [activeTab, setActiveTab] = useState(0);
  const showcaseRef = useRef(null);

  const handleTabChange = (index) => {
    if (index === activeTab) return;
    const el = showcaseRef.current;
    if (!el) {
      setActiveTab(index);
      return;
    }

    // GSAP 3D Flip transition
    gsap.to(el, {
      rotateY: 90,
      scale: 0.92,
      opacity: 0.2,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        setActiveTab(index);
        gsap.fromTo(
          el,
          { rotateY: -90, scale: 0.92, opacity: 0.2 },
          { rotateY: 0, scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" }
        );
      },
    });
  };

  const current = features[activeTab];
  const CurrentIcon = current.icon;

  return (
    <section className="section-block" style={{ marginTop: "44px" }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">GSAP 3D INTERACTIVE SHOWCASE</span>
          <h2>Explore Core AI Capabilities</h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {features.map((f, i) => (
            <button
              key={f.id}
              onClick={() => handleTabChange(i)}
              className="clay-pill-tag"
              style={{
                cursor: "pointer",
                background: activeTab === i ? "var(--clay-purple)" : "#FFFFFF",
                color: activeTab === i ? "#FFFFFF" : "var(--ink-secondary)",
                boxShadow: activeTab === i ? "var(--btn-purple-shadow)" : "var(--clay-shadow-sm)",
                transform: activeTab === i ? "scale(1.05)" : "scale(1)",
                transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {f.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ perspective: "1200px" }}>
        <div
          ref={showcaseRef}
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          <Gsap3DCard
            maxTilt={8}
            style={{
              background: "#FFFFFF",
              borderRadius: "28px",
              padding: "36px 40px",
              border: "3px solid rgba(255, 255, 255, 0.95)",
              boxShadow: "var(--clay-shadow-lg)",
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: "36px",
              alignItems: "center",
            }}
          >
            {/* Left Detail */}
            <div style={{ transform: "translateZ(25px)" }}>
              <span className={`clay-pill-tag ${current.tagColor}`} style={{ marginBottom: "14px" }}>
                <CurrentIcon size={14} /> {current.tag}
              </span>
              <h3 style={{ fontSize: "28px", margin: "10px 0 12px", color: "var(--ink-primary)" }}>
                {current.headline}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: "1.75", color: "var(--ink-secondary)", marginBottom: "26px" }}>
                {current.description}
              </p>

              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {current.stats.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#FAF6F0",
                      padding: "12px 18px",
                      borderRadius: "16px",
                      border: "1.5px solid #EFE8DC",
                      boxShadow: "var(--clay-shadow-sm)",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "900", color: "var(--clay-purple)", fontFamily: "var(--font-display)" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink-muted)", fontWeight: "700" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 3D Visual Widget */}
            <div
              style={{
                transform: "translateZ(40px)",
                background: "linear-gradient(145deg, #FAF5EE 0%, #F5ECDF 100%)",
                borderRadius: "24px",
                padding: "28px",
                border: "2px solid #FFFFFF",
                boxShadow: "var(--clay-shadow-md)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "74px",
                  height: "74px",
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--clay-purple)",
                  marginBottom: "16px",
                  boxShadow: "var(--clay-shadow-sm)",
                }}
              >
                <CurrentIcon size={36} />
              </div>

              <b style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--ink-primary)", marginBottom: "8px" }}>
                Live Interactive Architecture
              </b>
              <p style={{ fontSize: "12px", color: "var(--ink-secondary)", lineHeight: "1.6", margin: "0 0 18px" }}>
                Ready to accelerate your career? Every module connects to your live resume workspace in real time.
              </p>

              <button
                className="button button-orange"
                onClick={() => handleTabChange((activeTab + 1) % features.length)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Next Feature <ChevronRight size={16} />
              </button>
            </div>
          </Gsap3DCard>
        </div>
      </div>
    </section>
  );
}
