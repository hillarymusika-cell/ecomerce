import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [portal, setPortal] = useState("customer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const type =
        portal === "customer" ? "unified" : portal === "staff" ? "staff" : "admin";
      const data = await login(form, type);
      const role =
        data.user?.role_label ||
        (data.user?.is_admin || data.user?.is_superuser
          ? "admin"
          : data.user?.is_staff
            ? "staff"
            : "customer");
      if (location.state?.from) {
        navigate(location.state.from);
      } else if (role === "admin") {
        navigate("/admin");
      } else if (role === "staff") {
        navigate("/staff");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="form-card auth-card" onSubmit={submit}>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Sign in</h1>
        {error && <div className="alert">{error}</div>}
        <label>
          Portal
          <select value={portal} onChange={(e) => setPortal(e.target.value)}>
            <option value="customer">Customer</option>
            <option value="staff">Staff (catalog)</option>
            <option value="admin">System admin</option>
          </select>
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <button className="button full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </section>
  );
}
