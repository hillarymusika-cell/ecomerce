import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  LogIn,
  LogOut,
  Menu,
  X,
  Package,
  LayoutDashboard,
  Shield,
} from "lucide-react";
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
          <img src={LOGO_SRC} alt="" className="brand-logo" />
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
            <Link
              className="nav-icon-btn"
              to="/cart"
              aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
            >
              <ShoppingCart size={18} strokeWidth={2} />
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
          )}
          {user ? (
            <>
              <Link
                className="nav-icon-btn"
                to="/account"
                aria-label={user.username || "Account"}
                title={user.username}
              >
                <User size={18} strokeWidth={2} />
              </Link>
              <button
                type="button"
                className="nav-icon-btn"
                onClick={signOut}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} strokeWidth={2} />
              </button>
            </>
          ) : (
            <>
              <Link className="nav-icon-btn" to="/login" aria-label="Log in" title="Log in">
                <LogIn size={18} strokeWidth={2} />
              </Link>
              <Link className="button small" to="/register">
                Join
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div className={`container nav-mobile${open ? " open" : ""}`}>
        <NavLink to="/products" onClick={close}>
          <Package size={16} /> Shop
        </NavLink>
        {user && role === "customer" && (
          <NavLink to="/orders" onClick={close}>
            <Package size={16} /> Orders
          </NavLink>
        )}
        {isStaff && (
          <NavLink to="/staff" onClick={close}>
            <LayoutDashboard size={16} /> Staff
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin" onClick={close}>
            <Shield size={16} /> Admin
          </NavLink>
        )}
        {user ? (
          <>
            <NavLink to="/account" onClick={close}>
              <User size={16} /> {user.username}
            </NavLink>
            <button
              type="button"
              className="button ghost small"
              onClick={signOut}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <LogOut size={14} /> Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" onClick={close}>
              <LogIn size={16} /> Log in
            </NavLink>
            <NavLink to="/register" onClick={close}>
              Join
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
