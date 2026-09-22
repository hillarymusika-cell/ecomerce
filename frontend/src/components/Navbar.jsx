import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import LOGO_SRC from "../assets/logoData";

export default function Navbar() {
  const { user, logout, role, isStaff, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="Adams Collection home">
          <img src={LOGO_SRC} alt="Adams Collection" className="brand-logo" />
          <span className="brand-text">
            <strong>Adams</strong>
            <small>Collection</small>
          </span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/products">Shop</NavLink>
          {user && role === "customer" && <NavLink to="/orders">Orders</NavLink>}
          {isStaff && <NavLink to="/staff">Staff</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-actions">
          {role === "customer" && (
            <Link className="nav-icon" to="/cart" aria-label="Cart">
              Cart <span>{count}</span>
            </Link>
          )}
          {user ? (
            <>
              <Link className="account-link" to="/account">
                {user.username}
                {role && role !== "customer" ? ` · ${role}` : ""}
              </Link>
              <button className="button ghost small" onClick={signOut}>Logout</button>
            </>
          ) : (
            <>
              <Link className="button ghost small" to="/login">Login</Link>
              <Link className="button small" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
