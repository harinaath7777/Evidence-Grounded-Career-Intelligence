import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import AppShell from "../components/layout/AppShell";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import UploadPage from "../features/resume/UploadPage";
import ResumeEditorPage from "../features/resume/ResumeEditorPage";
import InterviewPage from "../features/resume/InterviewPage";
import CompetencyMapPage from "../features/graph/CompetencyMapPage";
import SimulationStudioPage from "../features/simulation/SimulationStudioPage";
import PracticePlanPage from "../features/simulation/PracticePlanPage";
import PageTransition from "../components/layout/PageTransition";
import GsapCursor from "../components/effects/GsapCursor";
import { useGsapButtons } from "../lib/useGsapButtons";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><span className="spinner" /> Loading your workspace…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  useGsapButtons();
  if (loading) return <div className="app-loading"><span className="spinner" /> Loading…</div>;
  return user ? <Navigate to="/" replace /> : <PageTransition>{children}<GsapCursor /></PageTransition>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="graph" element={<CompetencyMapPage />} />
        <Route path="resume/:id/graph" element={<CompetencyMapPage />} />
        <Route path="simulations" element={<SimulationStudioPage />} />
        <Route path="simulations/:id" element={<SimulationStudioPage />} />
        <Route path="practice-plan" element={<PracticePlanPage />} />
        <Route path="resume/:id" element={<ResumeEditorPage />} />
        <Route path="resume/:id/interview" element={<InterviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
