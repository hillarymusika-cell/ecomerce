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
  UserPlus,
  Home,
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
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/products" end={false}>
            Shop
          </NavLink>
          {user && role === "customer" && <NavLink to="/orders">Orders</NavLink>}
          {isStaff && <NavLink to="/staff">Staff</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="nav-actions">
          <div className="nav-action-group">
            {(role === "customer" || !user) && (
              <Link
                className="nav-icon-btn"
                to="/cart"
                aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
                title="Cart"
              >
                <ShoppingCart size={18} strokeWidth={2} />
                {count > 0 && <span className="badge">{count > 99 ? "99+" : count}</span>}
              </Link>
            )}
            {user ? (
              <>
                <Link
                  className="nav-icon-btn"
                  to="/account"
                  aria-label="Account"
                  title={user.username || "Account"}
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
                <Link
                  className="nav-icon-btn"
                  to="/login"
                  aria-label="Log in"
                  title="Log in"
                >
                  <LogIn size={18} strokeWidth={2} />
                </Link>
                <Link
                  className="button small nav-join"
                  to="/register"
                  title="Create account"
                >
                  <UserPlus size={14} strokeWidth={2.25} />
                  <span>Join</span>
                </Link>
              </>
            )}
          </div>

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
        <NavLink to="/" end onClick={close}>
          <Home size={16} /> Home
        </NavLink>
        <NavLink to="/products" onClick={close}>
          <Package size={16} /> Shop
        </NavLink>
        {(role === "customer" || !user) && (
          <NavLink to="/cart" onClick={close}>
            <ShoppingCart size={16} /> Cart
            {count > 0 ? ` (${count})` : ""}
          </NavLink>
        )}
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
              <User size={16} /> Account
            </NavLink>
            <button
              type="button"
              className="button ghost small nav-mobile-btn"
              onClick={signOut}
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
              <UserPlus size={16} /> Join
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
