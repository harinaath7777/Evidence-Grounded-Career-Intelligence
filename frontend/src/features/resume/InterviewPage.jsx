import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, Bot, Check, ChevronDown, ChevronRight, 
  HelpCircle, Mic, MicOff, Play, RefreshCw, RotateCcw, 
  Sparkles, Square, Volume2, VolumeX, Award, CheckCircle2, AlertCircle, Zap
} from "lucide-react";
import gsap from "gsap";
import api from "../../lib/api";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

function AudioVisualizer({ active = false, mode = "speaking" }) {
  const barsRef = useRef([]);

  useEffect(() => {
    if (!active) {
      barsRef.current.forEach((bar) => {
        if (bar) gsap.to(bar, { scaleY: 0.25, duration: 0.3, ease: "power1.out" });
      });
      return;
    }

    const interval = setInterval(() => {
      barsRef.current.forEach((bar) => {
        if (bar) {
          gsap.to(bar, {
            scaleY: gsap.utils.random(0.35, 1.9),
            duration: 0.12,
            ease: "sine.inOut",
          });
        }
      });
    }, 120);

    return () => clearInterval(interval);
  }, [active]);

  const color = mode === "listening" ? "var(--clay-orange, #FF6B4A)" : "var(--clay-purple, #7C3AED)";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", height: "24px", padding: "0 6px" }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          style={{
            width: "3px",
            height: "18px",
            backgroundColor: color,
            borderRadius: "9999px",
            transformOrigin: "center bottom",
            transform: "scaleY(0.25)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

function GsapScoreCounter({ targetScore = 0 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const num = Number(targetScore) || 0;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: num,
      duration: 1.5,
      ease: "back.out(2)",
      onUpdate: () => setVal(Math.round(obj.val)),
    });
  }, [targetScore]);

  return <>{val}</>;
}

export default function InterviewPage() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("interactive"); // "interactive" | "browse"

  // Interactive Simulator State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [answersHistory, setAnswersHistory] = useState({}); // { [idx]: { answer, evaluation } }
  const [interviewComplete, setInterviewComplete] = useState(false);

  // Audio / Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef(null);

  // Fetch Questions
  const loadInterview = useCallback(async (fresh = false) => {
    setLoading(true);
    setError("");
    try {
      const { data: resData } = await api.get(`/resumes/${id}`);
      setResume(resData.resume);

      const endpoint = fresh ? `/resumes/${id}/interview/questions?fresh=true` : `/resumes/${id}/interview/questions`;
      const { data: qData } = await api.get(endpoint);
      const list = qData.questions || [];
      setQuestions(list);

      // Reset practice state
      setCurrentIndex(0);
      setUserAnswer("");
      setCurrentEvaluation(null);
      setAnswersHistory({});
      setInterviewComplete(false);
    } catch (e) {
      setError(e.message || "Failed to load interview questions.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  // Speech Recognition (STT) setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = "en-US";

    recognizer.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setUserAnswer((prev) => (prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim()));
      }
    };

    recognizer.onerror = (err) => {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    };

    recognizer.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognizer;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech (TTS)
  const speakText = useCallback((text, onComplete) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onComplete) onComplete();
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Auto-speak question when current index changes in interactive mode
  useEffect(() => {
    if (mode === "interactive" && questions.length > 0 && autoSpeak && !interviewComplete) {
      const q = questions[currentIndex];
      if (q && !currentEvaluation) {
        speakText(`Question ${currentIndex + 1}. ${q.question}`);
      }
    }
    return () => stopSpeaking();
  }, [currentIndex, mode, autoSpeak, questions, currentEvaluation, interviewComplete, speakText, stopSpeaking]);

  // Toggle Voice Input
  function toggleListening() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  }

  // Submit Answer for AI Evaluation
  async function submitAnswer() {
    if (!userAnswer.trim()) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    stopSpeaking();

    const currentQ = questions[currentIndex];
    setEvaluating(true);
    setError("");

    try {
      const { data } = await api.post(`/resumes/${id}/interview/evaluate`, {
        question: currentQ.question,
        reason: currentQ.reason || "",
        sampleAnswerOutline: currentQ.sampleAnswerOutline || [],
        userAnswer: userAnswer.trim(),
      });

      const evalResult = data.evaluation;
      setCurrentEvaluation(evalResult);

      // Save into history
      setAnswersHistory((prev) => ({
        ...prev,
        [currentIndex]: {
          question: currentQ.question,
          category: currentQ.category,
          userAnswer: userAnswer.trim(),
          evaluation: evalResult,
        },
      }));

      // Speak feedback
      if (autoSpeak && evalResult?.feedback) {
        speakText(`Score: ${evalResult.score} out of 10. ${evalResult.verdict}. ${evalResult.feedback}`);
      }
    } catch (e) {
      setError(e.message || "Failed to evaluate answer.");
    } finally {
      setEvaluating(false);
    }
  }

  // Go to Next Question
  function handleNextQuestion() {
    stopSpeaking();
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const existing = answersHistory[nextIdx];
      setUserAnswer(existing ? existing.userAnswer : "");
      setCurrentEvaluation(existing ? existing.evaluation : null);
      setShowHint(false);
    } else {
      setInterviewComplete(true);
    }
  }

  // Retry Current Question
  function handleRetryQuestion() {
    stopSpeaking();
    setUserAnswer("");
    setCurrentEvaluation(null);
    setShowHint(false);
  }

  // Restart Entire Interview
  function handleRestartInterview() {
    stopSpeaking();
    setCurrentIndex(0);
    setUserAnswer("");
    setCurrentEvaluation(null);
    setAnswersHistory({});
    setInterviewComplete(false);
    setShowHint(false);
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="app-loading">
          <span className="spinner" />
          Loading Top 10 Interview Questions…
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answersHistory).length;
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + (currentEvaluation ? 1 : 0)) / totalQuestions) * 100) : 0;

  // Average score calculation
  const scores = Object.values(answersHistory).map((a) => a.evaluation?.score).filter(Boolean);
  const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

  return (
    <div className="page-wrap" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Topbar */}
      <header className="topbar" style={{ marginBottom: "20px" }}>
        <div>
          <Link to={`/resume/${id}`} className="back-link">
            <ArrowLeft size={15} /> Back to resume editor
          </Link>
          <span className="eyebrow">AI VOICE MOCK INTERVIEW</span>
          <h1>Walk into the room <em>ready.</em></h1>
          <p>Speech-enabled practice: Hear the questions, speak your answer, and receive real-time coaching.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="button button-secondary"
            onClick={() => loadInterview(true)}
            title="Generate 10 fresh interview questions"
          >
            <RefreshCw size={14} /> Fresh 10 Questions
          </button>

          {/* Mode Switcher */}
          <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => { setMode("interactive"); stopSpeaking(); }}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: mode === "interactive" ? "#ffffff" : "transparent",
                color: mode === "interactive" ? "#4f46e5" : "#64748b",
                boxShadow: mode === "interactive" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              🎙️ Simulator
            </button>
            <button
              onClick={() => { setMode("browse"); stopSpeaking(); }}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: mode === "browse" ? "#ffffff" : "transparent",
                color: mode === "browse" ? "#4f46e5" : "#64748b",
                boxShadow: mode === "browse" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              📋 All Questions
            </button>
          </div>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ---------------- INTERACTIVE SIMULATOR MODE ---------------- */}
      {mode === "interactive" && (
        <>
          {!interviewComplete ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Progress & Header Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#4f46e5",
                      backgroundColor: "#eef2ff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  {currentQ.category && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        backgroundColor: "#f3f4f6",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontWeight: "500",
                      }}
                    >
                      {currentQ.category}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      style={{ accentColor: "#4f46e5" }}
                    />
                    Auto-speak questions
                  </label>
                  <div style={{ width: "120px", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#4f46e5", transition: "width 0.3s ease" }}></div>
                  </div>
                </div>
              </div>

              {/* Interviewer Question Box */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "26px",
                  border: "1px solid #e0e7ff",
                  boxShadow: "0 4px 16px rgba(79, 70, 229, 0.06)",
                  position: "relative",
                  background: "linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "20px",
                      backgroundColor: "var(--clay-purple-pastel)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isSpeaking ? "0 0 0 6px rgba(124, 58, 237, 0.25)" : "var(--clay-shadow-sm)",
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src="/clay-robot-mascot.png"
                      alt="3D Clay AI Interviewer"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: isSpeaking ? "scale(1.1) translateY(-2px)" : "scale(1)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--clay-purple)", letterSpacing: "0.8px", fontFamily: "var(--font-display)" }}>
                          AI INTERVIEW BUDDY {isSpeaking ? "· 🔊 SPEAKING" : ""}
                        </span>
                        <AudioVisualizer active={isSpeaking} mode="speaking" />
                      </div>

                      <button
                        className="button button-secondary"
                        onClick={() => (isSpeaking ? stopSpeaking() : speakText(`Question ${currentIndex + 1}. ${currentQ.question}`))}
                        style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
                      >
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        {isSpeaking ? "Stop Speaking" : "Listen Question"}
                      </button>
                    </div>

                    <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e1b4b", lineHeight: "1.4", margin: "0 0 10px" }}>
                      {currentQ.question}
                    </h2>

                    {currentQ.reason && (
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, fontStyle: "italic" }}>
                        Context: {currentQ.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Answer Box */}
              {!currentEvaluation ? (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#1f2937" }}>Your Answer</span>
                      {isListening && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#ef4444", fontWeight: "700" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 1.2s infinite" }}></span>
                          Listening to microphone…
                          <AudioVisualizer active={isListening} mode="listening" />
                        </span>
                      )}
                    </div>

                    {micSupported && (
                      <button
                        className={`button ${isListening ? "button-primary" : "button-secondary"}`}
                        onClick={toggleListening}
                        style={{
                          backgroundColor: isListening ? "#ef4444" : undefined,
                          borderColor: isListening ? "#ef4444" : undefined,
                          color: isListening ? "#ffffff" : undefined,
                        }}
                      >
                        {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                        {isListening ? "Stop Recording" : "Speak Answer (Voice)"}
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={6}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Speak using the microphone button or type your answer here... (Tip: Structure using the STAR method: Situation, Task, Action, Result)"
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      padding: "14px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "#1e293b",
                      fontFamily: "inherit",
                      resize: "vertical",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />

                  {/* Actions Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }}>
                    <div>
                      {currentQ.sampleAnswerOutline?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowHint((v) => !v)}
                          style={{ background: "none", border: "none", color: "#6366f1", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <HelpCircle size={14} />
                          {showHint ? "Hide Hint" : "Need a Hint / Structure?"}
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        className="button button-primary"
                        onClick={submitAnswer}
                        disabled={!userAnswer.trim() || evaluating}
                      >
                        {evaluating ? (
                          <>
                            <span className="spinner spinner-light" />
                            Evaluating your answer…
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            Submit Answer for AI Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Optional Hint Dropdown */}
                  {showHint && currentQ.sampleAnswerOutline && (
                    <div style={{ marginTop: "14px", padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Recommended Outline to Touch On:</span>
                      <ul style={{ margin: "6px 0 0", paddingLeft: "20px", fontSize: "13px", color: "#334155" }}>
                        {currentQ.sampleAnswerOutline.map((point, pIdx) => (
                          <li key={pIdx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                /* AI Feedback Box (Rendered After Answer Submission) */
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    padding: "26px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {/* Feedback Header with Score */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "16px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div>
                      <span className="eyebrow">AI COACH EVALUATION</span>
                      <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: "#1e1b4b" }}>
                        {currentEvaluation.verdict || "Evaluation Complete"}
                      </h3>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "8px 16px",
                          borderRadius: "10px",
                          backgroundColor: currentEvaluation.score >= 8 ? "#ecfdf5" : currentEvaluation.score >= 5 ? "#eff6ff" : "#fff7ed",
                          border: `1px solid ${currentEvaluation.score >= 8 ? "#a7f3d0" : currentEvaluation.score >= 5 ? "#bfdbfe" : "#fed7aa"}`,
                        }}
                      >
                        <div style={{ fontSize: "22px", fontWeight: "800", color: currentEvaluation.score >= 8 ? "#059669" : currentEvaluation.score >= 5 ? "#2563eb" : "#d97706" }}>
                          <GsapScoreCounter targetScore={currentEvaluation.score} />
                          <small style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}> / 10</small>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Score</span>
                      </div>

                      <button
                        className="button button-secondary"
                        onClick={() => speakText(`Your answer scored ${currentEvaluation.score} out of 10. ${currentEvaluation.feedback}`)}
                        title="Listen to feedback"
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Candidate Answer Transcript */}
                  <div style={{ backgroundColor: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Your Answer:</span>
                    <p style={{ margin: "6px 0 0", fontSize: "13.5px", color: "#334155", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                      "{userAnswer}"
                    </p>
                  </div>

                  {/* Feedback Text */}
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "0 0 6px" }}>Coaching Feedback:</h4>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#334155", margin: 0 }}>
                      {currentEvaluation.feedback}
                    </p>
                  </div>

                  {/* Strengths and Missing Points Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "#f0fdf4", padding: "14px 16px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>
                        <CheckCircle2 size={16} />
                        What You Did Well:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#166534", lineHeight: "1.5" }}>
                        {(currentEvaluation.strengths || []).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ backgroundColor: "#fefce8", padding: "14px 16px", borderRadius: "10px", border: "1px solid #fef08a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a16207", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>
                        <AlertCircle size={16} />
                        Key Elements to Refine / Add:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#854d0e", lineHeight: "1.5" }}>
                        {(currentEvaluation.missingPoints || []).map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Model Answer */}
                  {currentEvaluation.modelAnswer && (
                    <div style={{ backgroundColor: "#faf5ff", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e9d5ff" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#7e22ce", textTransform: "uppercase" }}>Exemplary Model Answer:</span>
                      <p style={{ margin: "6px 0 0", fontSize: "13.5px", color: "#581c87", lineHeight: "1.6" }}>
                        {currentEvaluation.modelAnswer}
                      </p>
                    </div>
                  )}

                  {/* Flow Buttons */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px" }}>
                    <button className="button button-secondary" onClick={handleRetryQuestion}>
                      <RotateCcw size={14} /> Retry Question
                    </button>

                    <button className="button button-primary" onClick={handleNextQuestion}>
                      {currentIndex + 1 < totalQuestions ? (
                        <>
                          Next Question ({currentIndex + 2}/{totalQuestions}) <ArrowRight size={15} />
                        </>
                      ) : (
                        <>
                          Complete Interview & View Summary <Award size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Interview Complete Summary Screen */
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "36px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "28px",
                  backgroundColor: "var(--clay-purple-pastel)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  boxShadow: "var(--clay-shadow-md)",
                  padding: "8px",
                }}
              >
                <img
                  src="/clay-robot-mascot.png"
                  alt="3D Clay Robot Mascot"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>

              <h2 style={{ fontSize: "28px", color: "var(--ink-primary)", margin: "0 0 8px", fontFamily: "var(--font-display)", fontWeight: "900" }}>
                🎉 Woohoo! Interview Practice Complete!
              </h2>
              <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: "14px" }}>
                You practiced {answeredCount} out of {totalQuestions} tailored interview questions.
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "20px",
                  padding: "16px 32px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "28px",
                }}
              >
                <div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#4f46e5" }}>{averageScore} / 10</div>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Overall Average</span>
                </div>
                <div style={{ height: "40px", width: "1px", backgroundColor: "#cbd5e1" }}></div>
                <div>
                  <div style={{ fontSize: "32px", fontWeight: "800", color: "#10b981" }}>{answeredCount}</div>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#64748b" }}>Questions Completed</span>
                </div>
              </div>

              {/* Answers Review List */}
              <div style={{ textAlign: "left", marginBottom: "28px" }}>
                <h3 style={{ fontSize: "16px", color: "#1e293b", marginBottom: "14px" }}>Your Performance Breakdown:</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(answersHistory).map(([idx, item]) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ maxWidth: "80%" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#4f46e5" }}>Q{Number(idx) + 1}: </span>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{item.question}</span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: item.evaluation?.score >= 8 ? "#ecfdf5" : "#eff6ff",
                          color: item.evaluation?.score >= 8 ? "#059669" : "#2563eb",
                        }}
                      >
                        {item.evaluation?.score} / 10
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <button className="button button-primary" onClick={handleRestartInterview}>
                  <RotateCcw size={15} /> Practice Again
                </button>
                <Link to={`/resume/${id}`} className="button button-secondary">
                  Back to Resume Editor
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- BROWSE ALL 10 QUESTIONS MODE ---------------- */}
      {mode === "browse" && (
        <div className="practice-list">
          {questions.map((q, i) => (
            <details className="practice-card" key={i} open={i === 0}>
              <summary>
                <span className="question-number">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <small>{q.category ? `${q.category} · ` : ""}{q.reason || "Based on your resume"}</small>
                  <b>{q.question}</b>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={(e) => {
                      e.preventDefault();
                      isSpeaking ? stopSpeaking() : speakText(`Question ${i + 1}. ${q.question}`);
                    }}
                    title="Speak question"
                  >
                    <Volume2 size={16} />
                  </button>
                  <ChevronDown size={18} />
                </div>
              </summary>
              <div className="practice-answer">
                <span className="eyebrow">ANSWER OUTLINE & KEY TALKING POINTS</span>
                <ul>
                  {(q.sampleAnswerOutline || []).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
                <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="button button-primary"
                    onClick={() => {
                      setMode("interactive");
                      setCurrentIndex(i);
                      setUserAnswer("");
                      setCurrentEvaluation(null);
                    }}
                  >
                    Practice This Question in Voice Mode <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
