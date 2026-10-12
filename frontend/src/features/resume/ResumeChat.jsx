import { useState, useEffect, useRef } from "react";
import { ArrowUp, Bot, Check, Copy, Sparkles, X, ChevronDown, ChevronRight, Search, FileText, Cpu } from "lucide-react";
import gsap from "gsap";
import api from "../../lib/api";

const starterPrompts = [
  "Rewrite my summary for clarity without adding facts.",
  "Help me turn my experience into stronger impact bullets.",
  "What should I highlight for a full-stack developer role?"
];

export default function ResumeChat({ resumeId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(-1);
  const [expandedTrace, setExpandedTrace] = useState({});
  const [expandedSources, setExpandedSources] = useState({});
  const drawerRef = useRef(null);

  useEffect(() => {
    if (drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: 380, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)" }
      );
    }
  }, []);

  function handleClose() {
    if (drawerRef.current) {
      gsap.to(drawerRef.current, {
        x: 380,
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  }

  async function send(text = question) {
    const value = text.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user", content: value }];
    setMessages(next);
    setQuestion("");
    setBusy(true);
    setError("");

    try {
      const { data } = await api.post("/chat", {
        resumeId,
        question: value,
        history: messages.slice(-8)
      });

      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          trace: data.trace || [],
          engine: data.engine || "agentic-rag"
        }
      ]);
    } catch (e) {
      setError(e.message);
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(-1), 1600);
    } catch {
      setError("Could not copy text in this browser.");
    }
  }

  function toggleTrace(idx) {
    setExpandedTrace(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  function toggleSources(idx) {
    setExpandedSources(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <div className="chat-overlay" onClick={handleClose}>
      <section ref={drawerRef} className="chat-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="chat-header">
          <div className="chat-brand-icon" style={{ overflow: "hidden", padding: 0 }}>
            <img src="/clay-robot-mascot.png" alt="AI Mascot" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <b>Resume AI Assistant</b>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--clay-purple)", marginTop: "2px", fontWeight: "700" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "var(--clay-teal)", display: "inline-block" }}></span>
              <span>Agentic RAG Engine Active</span>
            </div>
          </div>
          <button className="icon-button" onClick={handleClose} aria-label="Close chat">
            <X size={19} />
          </button>
        </header>

        <div className="chat-safety">
          <Bot size={17} />
          <span>Multi-step Agentic RAG: Self-correcting retrieval & grounded generation. No hallucinated credentials.</span>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-big-orb">
                <img src="/clay-robot-mascot.png" alt="3D Clay AI Mascot" className="chat-mascot-avatar" />
              </div>
              <h3>Let’s craft your success story!</h3>
              <p>Ask about your resume, tailor for a target role, or brainstorm high-impact bullet points.</p>
              <div className="starter-prompts">
                {starterPrompts.map(prompt => (
                  <button key={prompt} onClick={() => send(prompt)}>
                    {prompt}
                    <ArrowUp size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${index}-${message.role}`}>
                <div className="message-avatar">
                  {message.role === "assistant" ? <Sparkles size={14} /> : "Y"}
                </div>
                <div className="message-body">
                  <div className="message-role" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{message.role === "assistant" ? "CAREERCANVAS AGENT" : "YOU"}</span>
                    {message.role === "assistant" && message.engine && (
                      <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: "600" }}>
                        ⚡ {message.engine === "agentic-rag" ? "AGENTIC RAG" : "LEXICAL"}
                      </span>
                    )}
                  </div>

                  {/* Agentic Trace Step View */}
                  {message.role === "assistant" && message.trace && message.trace.length > 0 && (
                    <div style={{ margin: "8px 0", border: "1px solid #e0e7ff", borderRadius: "6px", overflow: "hidden", backgroundColor: "#faf5ff" }}>
                      <button
                        type="button"
                        onClick={() => toggleTrace(index)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 10px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: "#6b21a8" }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Cpu size={13} />
                          Agent Reasoning Trace ({message.trace.length} steps)
                        </span>
                        {expandedTrace[index] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>

                      {expandedTrace[index] && (
                        <div style={{ padding: "8px 10px", borderTop: "1px solid #f3e8ff", fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px", backgroundColor: "#ffffff" }}>
                          {message.trace.map((step, sIdx) => (
                            <div key={sIdx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                              <span style={{ padding: "1px 5px", borderRadius: "3px", backgroundColor: "#ede9fe", color: "#5b21b6", fontWeight: "700", textTransform: "uppercase", fontSize: "9px" }}>
                                {step.step}
                              </span>
                              <span style={{ color: "#374151" }}>
                                {step.step === "plan" && `Planned query: "${step.searchQuery}" (${step.reason || ""})`}
                                {step.step === "retrieve" && `Retrieved ${step.count} vector passages`}
                                {step.step === "grade" && `Evaluated: ${step.sufficient ? "Context Sufficient" : "Insufficient"} (${step.reason || ""})`}
                                {step.step === "rewrite-retrieve" && `Self-corrected query: "${step.searchQuery}" (${step.count} passages)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Answer Text */}
                  <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>

                  {/* Retrieved Sources Citation View */}
                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <div style={{ margin: "8px 0", border: "1px solid #f1f5f9", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f8fafc" }}>
                      <button
                        type="button"
                        onClick={() => toggleSources(index)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 10px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: "#475569" }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <FileText size={13} />
                          Retrieved Sources ({message.sources.length} chunks)
                        </span>
                        {expandedSources[index] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>

                      {expandedSources[index] && (
                        <div style={{ padding: "8px 10px", borderTop: "1px solid #e2e8f0", fontSize: "11px", display: "flex", flexDirection: "column", gap: "8px", backgroundColor: "#ffffff" }}>
                          {message.sources.map((src, srcIdx) => (
                            <div key={srcIdx} style={{ padding: "6px", borderRadius: "4px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontWeight: "600", color: "#1e293b" }}>
                                <span>[SOURCE {srcIdx + 1}] {src.source} (chunk #{src.chunkIndex + 1})</span>
                                {src.score != null && <span style={{ color: "#059669" }}>{(src.score * 100).toFixed(0)}% match</span>}
                              </div>
                              <p style={{ color: "#64748b", margin: 0, fontStyle: "italic", fontSize: "10.5px" }}>
                                "{src.preview}..."
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {message.role === "assistant" && (
                    <button className="copy-button" onClick={() => copy(message.content, index)}>
                      {copied === index ? <Check size={13} /> : <Copy size={13} />}
                      {copied === index ? "Copied" : "Copy draft"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {busy && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                <Sparkles size={14} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: "500" }}>Agent planning & vector retrieval...</span>
                <div className="typing-dots">
                  <i></i><i></i><i></i>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div className="chat-error">{error}</div>}

        <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            rows={2}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask for feedback or a stronger draft…"
            maxLength={4000}
          />
          <div className="composer-bottom">
            <span>Agentic RAG verifies facts against your resume.</span>
            <button className="send-button" disabled={!question.trim() || busy} aria-label="Send message">
              <ArrowUp size={17} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
