import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await login(form);
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials.");
    } finally { setBusy(false); }
  };

  return <section className="auth-page"><form className="form-card auth-card" onSubmit={submit}><span className="eyebrow">WELCOME BACK</span><h1>Sign in</h1>{error && <div className="alert">{error}</div>}<label>Email<input type="email" required value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></label><label>Password<input type="password" required value={form.password} onChange={e => setForm({...form,password:e.target.value})} /></label><button className="button full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button><p>New here? <Link to="/register">Create an account</Link></p></form></section>;
}