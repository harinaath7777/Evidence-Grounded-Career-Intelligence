import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import gsap from "gsap";
import Gsap3DCard from "../../components/effects/Gsap3DCard";

export default function AuthForm({ mode, onSubmit, error, busy }) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mascotRef = useRef(null);

  useEffect(() => {
    if (mascotRef.current) {
      gsap.fromTo(
        mascotRef.current,
        { scale: 0.6, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.8, ease: "back.out(2)" }
      );

      gsap.to(mascotRef.current, {
        y: "-=12px",
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    gsap.fromTo(
      ".auth-card",
      { opacity: 0, y: 40, rotateX: 10 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: "power2.out", delay: 0.1 }
    );
  }, []);

  async function submit(event) {
    event.preventDefault();
    await onSubmit({ ...(isRegister ? { name } : {}), email, password });
  }

  return (
    <main className="auth-layout" style={{ perspective: "1200px" }}>
      <section className="auth-story">
        <div className="brand brand-light" style={{ color: "white" }}>
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          Resume AI
        </div>
        <div className="story-copy">
          <div className="story-mascot-row">
            <img
              ref={mascotRef}
              src="/clay-robot-mascot.png"
              alt="3D Clay AI Mascot"
              className="story-mascot-img"
            />
            <div>
              <span className="eyebrow eyebrow-light">AI RESUME BUILDER</span>
              <div style={{ fontSize: "13px", color: "#DDD6FE", marginTop: "4px", fontWeight: "600" }}>
                Interactive 3D Career Companion
              </div>
            </div>
          </div>
          <h1>Let's Build Your<br /><em>Success Story!</em></h1>
          <p>
            Experience grounded Agentic RAG feedback, ATS keyword scoring, and speech-enabled mock interview practice — wrapped in a delightful 3D workspace.
          </p>
          <div className="story-proof">
            <div className="avatar-stack">
              <span>🤖</span>
              <span>⚡</span>
              <span>🎙</span>
            </div>
            <span>Built for standout job applications</span>
          </div>
        </div>
        <div className="story-note">
          <span>✨</span> Smart resumes. Confident interviews.
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-topline">
          <span>RESUME AI / 3D STUDIO</span>
          <span>READY TO LAUNCH</span>
        </div>
        <Gsap3DCard maxTilt={8} className="auth-card" style={{ padding: "36px" }}>
          <span className="eyebrow">{isRegister ? "LET'S GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your workspace" : "Good to see you again"}</h2>
          <p className="muted">
            {isRegister
              ? "A standout resume and interview confidence start here."
              : "Sign in to jump straight into your applications."}
          </p>
          <form onSubmit={submit} className="form-stack">
            {isRegister && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </label>
            )}
            <label>
              Email address
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="At least 8 characters"
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="button button-orange button-full" disabled={busy}>
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to Resume AI?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </Gsap3DCard>
        <p className="auth-legal">
          By continuing, you agree to review AI recommendations and verify all resume details for your job applications.
        </p>
      </section>
    </main>
  );
}
