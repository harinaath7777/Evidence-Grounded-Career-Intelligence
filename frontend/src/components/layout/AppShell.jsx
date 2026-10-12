import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bot, FileText, LayoutDashboard, LogOut, Network, Plus, Sparkles, Target, Terminal, UserRound } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import GsapCursor from "../effects/GsapCursor";
import PageTransition from "./PageTransition";
import { useGsapButtons } from "../../lib/useGsapButtons";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Attach distinct GSAP micro-interactions to all buttons
  useGsapButtons();

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            Resume AI
            <small>CAREER INTELLIGENCE</small>
          </span>
        </NavLink>

        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          <NavLink to="/" end>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/upload">
            <Plus size={18} />
            <span>Analyze a resume</span>
          </NavLink>
          <NavLink to="/graph">
            <Network size={18} />
            <span>Competency Graph</span>
          </NavLink>
          <NavLink to="/simulations">
            <Terminal size={18} />
            <span>Simulation Studio</span>
          </NavLink>
          <NavLink to="/practice-plan">
            <Target size={18} />
            <span>Practice Plan</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-tip">
            <span className="tip-icon">
              <Bot size={18} />
            </span>
            <b>AI Buddy is active!</b>
            <p>Agentic RAG &amp; speech interview prep ready.</p>
            <NavLink to="/upload">
              Try new analysis <span>↗</span>
            </NavLink>
            <img
              src="/clay-robot-mascot.png"
              alt="Mascot"
              className="side-tip-mascot"
            />
          </div>
          <div className="profile-row">
            <div className="profile-avatar">
              <UserRound size={18} />
            </div>
            <div className="profile-meta">
              <b>{user?.name || "Your account"}</b>
              <span>{user?.email}</span>
            </div>
            <button className="icon-button" title="Sign out" onClick={signOut}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <GsapCursor />
    </div>
  );
}
