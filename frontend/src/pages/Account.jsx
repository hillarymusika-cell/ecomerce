import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  MapPin,
  Package,
  Phone,
  Shield,
  ShoppingBag,
  User as UserIcon,
} from "lucide-react";
import { useAuth, homeForRole } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getErrorMessage } from "../utils/errors";

function initials(user) {
  const name = (user?.username || user?.email || "U").trim();
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function roleLabel(role) {
  if (role === "admin") return "Administrator";
  if (role === "staff") return "Staff";
  return "Customer";
}

export default function Account() {
  const { user, role, logout, changePassword, isStaff, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");
  const [pwd, setPwd] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  const avatar = useMemo(() => initials(user), [user]);
  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "Not set";

  if (!user) {
    return (
      <section className="section container narrow">
        <p>Please sign in to view your account.</p>
        <Link className="button" to="/login">
          Sign in
        </Link>
      </section>
    );
  }

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      toast("Signed out", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      toast(getErrorMessage(err, "Could not sign out"), "error");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdOk("");
    if (!pwd.current_password || !pwd.new_password) {
      setPwdError("Both current and new password are required.");
      return;
    }
    if (pwd.new_password.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (pwd.new_password !== pwd.confirm) {
      setPwdError("New passwords do not match.");
      return;
    }
    setPwdBusy(true);
    try {
      await changePassword({
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      });
      setPwd({ current_password: "", new_password: "", confirm: "" });
      setPwdOk("Password updated successfully.");
      toast("Password changed", "success");
    } catch (err) {
      setPwdError(getErrorMessage(err, "Could not change password"));
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <section className="section container account-page">
      <header className="account-hero card-in">
        <div className="account-avatar" aria-hidden>
          {user.profile_image ? (
            <img src={user.profile_image} alt="" />
          ) : (
            <span>{avatar}</span>
          )}
        </div>
        <div className="account-hero-text">
          <span className="eyebrow">Your profile</span>
          <h1>{user.username || user.email}</h1>
          <p className="account-meta">
            <span className={`role-pill role-pill--${role || "customer"}`}>
              <Shield size={12} aria-hidden />
              {roleLabel(role)}
            </span>
            <span className="account-email">{user.email}</span>
          </p>
        </div>
        <button
          type="button"
          className="button ghost account-logout"
          onClick={handleLogout}
          disabled={busy}
        >
          <LogOut size={16} aria-hidden />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </header>

      <div className="account-grid">
        <div className="account-panel field-stagger">
          <h2>Profile details</h2>
          <dl className="account-dl">
            <div>
              <dt>
                <UserIcon size={14} aria-hidden /> Username
              </dt>
              <dd>{user.username || "—"}</dd>
            </div>
            <div>
              <dt>
                <Phone size={14} aria-hidden /> Telephone
              </dt>
              <dd>{user.telephone_no || "—"}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={14} aria-hidden /> Location
              </dt>
              <dd>{location}</dd>
            </div>
          </dl>
        </div>

        <div className="account-panel field-stagger">
          <h2>Quick links</h2>
          <div className="account-links">
            <Link className="account-link" to="/orders">
              <Package size={18} aria-hidden />
              <span>
                <strong>Orders</strong>
                <small>View order history</small>
              </span>
            </Link>
            <Link className="account-link" to="/products">
              <ShoppingBag size={18} aria-hidden />
              <span>
                <strong>Shop</strong>
                <small>Browse the catalog</small>
              </span>
            </Link>
            {(isStaff || isAdmin) && (
              <Link className="account-link" to={homeForRole(role)}>
                <Shield size={18} aria-hidden />
                <span>
                  <strong>{isAdmin ? "Admin console" : "Staff portal"}</strong>
                  <small>Manage the store</small>
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="account-panel account-panel--wide field-stagger">
          <h2>Security</h2>
          <p className="account-hint">
            Change your password regularly. You will stay signed in after updating.
          </p>
          {pwdError && (
            <div className="alert" role="alert">
              {pwdError}
            </div>
          )}
          {pwdOk && (
            <div className="alert alert--success" role="status">
              {pwdOk}
            </div>
          )}
          <form className="account-pwd-form" onSubmit={submitPassword} noValidate>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={pwd.current_password}
                onChange={(e) =>
                  setPwd((p) => ({ ...p, current_password: e.target.value }))
                }
                disabled={pwdBusy}
                placeholder="••••••••"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={pwd.new_password}
                onChange={(e) =>
                  setPwd((p) => ({ ...p, new_password: e.target.value }))
                }
                disabled={pwdBusy}
                placeholder="Min. 8 characters"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={pwd.confirm}
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                disabled={pwdBusy}
                placeholder="Repeat new password"
              />
            </label>
            <button className="button" type="submit" disabled={pwdBusy} aria-busy={pwdBusy}>
              {pwdBusy ? (
                <>
                  <span className="btn-spinner" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
