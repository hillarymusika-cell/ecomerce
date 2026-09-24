import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errors";

const initial = {
  email: "",
  username: "",
  password: "",
  password_confirm: "",
  telephone_no: "",
  country: "",
  city: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    if (!form.username.trim()) return "Username is required.";
    if (form.username.trim().length < 3) return "Username must be at least 3 characters.";
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
      const { password_confirm, ...payload } = form;
      await register({
        ...payload,
        email: form.email.trim(),
        username: form.username.trim(),
        telephone_no: form.telephone_no.trim(),
      });
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="form-card auth-card wide" onSubmit={submit} noValidate>
        <span className="eyebrow">JOIN THE STORE</span>
        <h1>Create account</h1>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <div className="two">
          <label>
            Username
            <input
              name="username"
              required
              autoComplete="username"
              value={form.username}
              onChange={change}
              disabled={busy}
            />
          </label>
          <label>
            Telephone
            <input
              name="telephone_no"
              required
              autoComplete="tel"
              value={form.telephone_no}
              onChange={change}
              disabled={busy}
            />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={change}
            disabled={busy}
          />
        </label>
        <div className="two">
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
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
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
            />
          </label>
        </div>
        <div className="two">
          <label>
            Country
            <input name="country" value={form.country} onChange={change} disabled={busy} />
          </label>
          <label>
            City
            <input name="city" value={form.city} onChange={change} disabled={busy} />
          </label>
        </div>
        <button className="button full" disabled={busy} aria-busy={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  );
}
