import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "./AuthForm";
import { useAuth } from "./AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(details) {
    setError(""); setBusy(true);
    try { await register(details); navigate("/", { replace: true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthForm mode="register" onSubmit={submit} error={error} busy={busy} />;
}
