import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Gift, Shield, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errors";
import { setRememberedEmail } from "../utils/session";

const initial = {
  email: "",
  username: "",
  password: "",
  password_confirm: "",
  telephone_no: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    if (!form.username.trim()) return "Username is required.";
    if (form.username.trim().length < 3)
      return "Username must be at least 3 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    if (!form.telephone_no.trim()) return "Telephone number is required.";
    if (!form.password) return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.password_confirm) return "Passwords do not match.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const clientError = validate();
    if (clientError) {
      setError(clientError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register(
        {
          email: form.email.trim(),
          username: form.username.trim(),
          telephone_no: form.telephone_no.trim(),
          password: form.password,
        },
        { remember }
      );
      if (remember) setRememberedEmail(form.email.trim());
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page auth-page--split">
      <div className="auth-shell">
        <aside className="auth-brand panel-in">
          <div className="auth-brand-glow" />
          <div className="auth-brand-inner">
            <span className="auth-brand-mark">
              <Sparkles size={18} aria-hidden />
              Adams Collections
            </span>
            <h2>Create your store account</h2>
            <ul className="auth-brand-points">
              <li>
                <Gift size={16} aria-hidden />
                Track orders and reorder favourites
              </li>
              <li>
                <Shield size={16} aria-hidden />
                Your data stays private and secure
              </li>
            </ul>
          </div>
        </aside>

        <form
          className="form-card auth-card wide card-in"
          onSubmit={submit}
          noValidate
        >
          <header className="auth-head">
            <span className="eyebrow">Join the store</span>
            <h1>Create account</h1>
            <p className="auth-sub">A few details and you are ready to shop</p>
          </header>

          {error && (
            <div className="alert alert-in" role="alert">
              {error}
            </div>
          )}

          <div className="auth-fields field-stagger">
            <label>
              Username
              <input
                name="username"
                required
                autoComplete="username"
                value={form.username}
                onChange={change}
                disabled={busy}
                placeholder="Choose a username"
                minLength={3}
              />
            </label>
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
              Telephone
              <input
                type="tel"
                name="telephone_no"
                required
                autoComplete="tel"
                value={form.telephone_no}
                onChange={change}
                disabled={busy}
                placeholder="+256 700 000 000"
              />
            </label>
            <div className="auth-grid-2">
              <label>
                Password
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={form.password}
                    onChange={change}
                    disabled={busy}
                    placeholder="Min. 8 characters"
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
              <label>
                Confirm password
                <input
                  type={showPassword ? "text" : "password"}
                  name="password_confirm"
                  required
                  autoComplete="new-password"
                  value={form.password_confirm}
                  onChange={change}
                  disabled={busy}
                  placeholder="Repeat password"
                />
              </label>
            </div>
          </div>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            <span>Stay signed in on this device</span>
          </label>

          <button className="button full auth-submit" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <span className="btn-spinner" aria-hidden />
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </button>

          <p className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
