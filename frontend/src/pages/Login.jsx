import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, homeForRole } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errors";
import {
  getRememberPreference,
  getRememberedEmail,
  setRememberedEmail,
} from "../utils/session";

const ROLE_HINTS = {
  admin: { title: "Admin sign in", eyebrow: "System admin" },
  staff: { title: "Staff sign in", eyebrow: "Staff portal" },
  customer: { title: "Sign in", eyebrow: "Welcome back" },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Optional ?as=admin|staff to use dedicated API endpoint + default redirect
  const asParam = (searchParams.get("as") || "").toLowerCase();
  const loginType =
    asParam === "admin" || asParam === "staff" || asParam === "superuser"
      ? asParam
      : "unified";
  const hint = ROLE_HINTS[asParam] || ROLE_HINTS.customer;

  const from = location.state?.from || null;

  const [form, setForm] = useState({
    email: getRememberedEmail(),
    password: "",
  });
  const [remember, setRemember] = useState(getRememberPreference());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const email = form.email.trim();
    if (!email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const data = await login(
        { email, password: form.password },
        loginType,
        { remember }
      );
      if (remember) setRememberedEmail(email);
      else setRememberedEmail("");

      const resolvedRole =
        data.role ||
        (data.user?.is_superuser || data.user?.is_admin
          ? "admin"
          : data.user?.is_staff
            ? "staff"
            : "customer");

      // Prefer explicit return path only if it matches the user's role access;
      // otherwise send them to their portal home.
      let dest = homeForRole(resolvedRole);
      if (from) {
        const adminOnly = from.startsWith("/admin");
        const staffOnly = from.startsWith("/staff");
        if (adminOnly && resolvedRole === "admin") dest = from;
        else if (staffOnly && (resolvedRole === "staff" || resolvedRole === "admin"))
          dest = from;
        else if (!adminOnly && !staffOnly) dest = from;
      }

      navigate(dest, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="form-card auth-card" onSubmit={submit} noValidate>
        <header className="auth-head">
          <span className="eyebrow">{hint.eyebrow}</span>
          <h1>{hint.title}</h1>
        </header>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={change}
            disabled={busy}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={change}
              disabled={busy}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="remember-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={busy}
          />
          <span>Remember me</span>
        </label>
        <button className="button full" disabled={busy} aria-busy={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-footer">
          {asParam === "admin" || asParam === "staff" ? (
            <>
              Customer account? <Link to="/login">Sign in here</Link>
            </>
          ) : (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}
