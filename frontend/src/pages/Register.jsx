import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", username:"", password:"", telephone_no:"", country:"", city:"" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = e => setForm({...form,[e.target.name]:e.target.value});
  const submit = async e => { e.preventDefault(); setBusy(true); setError(""); try { await register(form); navigate("/"); } catch(err) { setError(err.response?.data?.error || "Registration failed."); } finally { setBusy(false); } };

  return <section className="auth-page"><form className="form-card auth-card wide" onSubmit={submit}><span className="eyebrow">JOIN THE STORE</span><h1>Create account</h1>{error && <div className="alert">{Array.isArray(error) ? error.join(" ") : error}</div>}<div className="two"><label>Username<input name="username" required value={form.username} onChange={change}/></label><label>Telephone<input name="telephone_no" required value={form.telephone_no} onChange={change}/></label></div><label>Email<input type="email" name="email" required value={form.email} onChange={change}/></label><label>Password<input type="password" name="password" required value={form.password} onChange={change}/></label><div className="two"><label>Country<input name="country" value={form.country} onChange={change}/></label><label>City<input name="city" value={form.city} onChange={change}/></label></div><button className="button full" disabled={busy}>{busy ? "Creating..." : "Create account"}</button><p>Already registered? <Link to="/login">Sign in</Link></p></form></section>;
}