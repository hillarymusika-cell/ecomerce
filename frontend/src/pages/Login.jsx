import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Shield, ShoppingBag, Sparkles } from "lucide-react";
import { useAuth, homeForRole } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errors";
import {
  getRememberPreference,
  getRememberedEmail,
  setRememberedEmail,
} from "../utils/session";

const ROLE_HINTS = {
  admin: {
    title: "Admin sign in",
    eyebrow: "System admin",
    blurb: "Manage users, orders, and store settings.",
  },
  staff: {
    title: "Staff sign in",
    eyebrow: "Staff portal",
    blurb: "Update catalog, stock, and fulfil orders.",
  },
  customer: {
    title: "Welcome back",
    eyebrow: "Sign in",
    blurb: "Access your cart, orders, and saved preferences.",
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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

      let dest = homeForRole(resolvedRole);
      if (from && typeof from === "string" && from.startsWith("/")) {
        const adminOnly = from.startsWith("/admin");
        const staffOnly = from.startsWith("/staff");
        if (adminOnly && resolvedRole === "admin") dest = from;
        else if (staffOnly && (resolvedRole === "staff" || resolvedRole === "admin"))
          dest = from;
        else if (!adminOnly && !staffOnly && resolvedRole === "customer") dest = from;
      }

      navigate(dest, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page auth-page--split">
      <div className="auth-shell">
        <aside className="auth-brand panel-in" aria-hidden="false">
          <div className="auth-brand-glow" />
          <div className="auth-brand-inner">
            <span className="auth-brand-mark">
              <Sparkles size={18} aria-hidden />
              Adams Collections
            </span>
            <h2>{hint.blurb}</h2>
            <ul className="auth-brand-points">
              <li>
                <ShoppingBag size={16} aria-hidden />
                Curated products, local pricing in UGX
              </li>
              <li>
                <Shield size={16} aria-hidden />
                Secure sign-in with encrypted sessions
              </li>
            </ul>
          </div>
        </aside>

        <form
          className="form-card auth-card card-in"
          onSubmit={submit}
          noValidate
        >
          <header className="auth-head">
            <span className="eyebrow">{hint.eyebrow}</span>
            <h1>{hint.title}</h1>
            <p className="auth-sub">Enter your details to continue</p>
          </header>

          {error && (
            <div className="alert alert-in" role="alert">
              {error}
            </div>
          )}

          <div className="auth-fields field-stagger">
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
          </div>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            <span>Remember me on this device</span>
          </label>

          <button className="button full auth-submit" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className="btn-spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
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
      </div>
    </section>
  );
}
