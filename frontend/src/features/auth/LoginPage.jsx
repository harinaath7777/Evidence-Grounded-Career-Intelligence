import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "./AuthForm";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(credentials) {
    setError(""); setBusy(true);
    try { await login(credentials); navigate("/", { replace: true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthForm mode="login" onSubmit={submit} error={error} busy={busy} />;
}
