import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import LOGO_SRC from "../assets/logoData";

export default function Navbar() {
  const { user, logout, role, isStaff, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="Adams Collection home" onClick={close}>
          <img src={LOGO_SRC} alt="Adams Collection" className="brand-logo" />
          <span className="brand-text">
            <strong>Adams</strong>
            <small>Collection</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          <NavLink to="/products">Shop</NavLink>
          {user && role === "customer" && <NavLink to="/orders">Orders</NavLink>}
          {isStaff && <NavLink to="/staff">Staff</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="nav-actions">
          {(role === "customer" || !user) && (
            <Link className="nav-icon" to="/cart" aria-label={`Cart, ${count} items`}>
              Cart {count > 0 && <span>{count}</span>}
            </Link>
          )}
          {user ? (
            <>
              <Link className="account-link" to="/account">
                {user.username}
                {role && role !== "customer" ? ` · ${role}` : ""}
              </Link>
              <button type="button" className="button ghost small" onClick={signOut}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="button ghost small" to="/login">
                Login
              </Link>
              <Link className="button small" to="/register">
                Register
              </Link>
            </>
          )}
          <button
            type="button"
            className={`nav-toggle${open ? " open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={`container nav-mobile${open ? " open" : ""}`}>
        <NavLink to="/products" onClick={close}>Shop</NavLink>
        {user && role === "customer" && (
          <NavLink to="/orders" onClick={close}>Orders</NavLink>
        )}
        {isStaff && <NavLink to="/staff" onClick={close}>Staff</NavLink>}
        {isAdmin && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
        {user ? (
          <>
            <NavLink to="/account" onClick={close}>
              {user.username}
            </NavLink>
            <button type="button" className="button ghost small" onClick={signOut} style={{ marginTop: 8 }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" onClick={close}>Login</NavLink>
            <NavLink to="/register" onClick={close}>Register</NavLink>
          </>
        )}
      </div>
    </header>
  );
}
