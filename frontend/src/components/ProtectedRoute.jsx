import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user, isStaff, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <div className="state">Loading...</div>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length) {
    const role =
      user?.role_label ||
      (isAdmin ? "admin" : isStaff ? "staff" : "customer");
    if (!roles.includes(role)) {
      if (role === "admin") return <Navigate to="/admin" replace />;
      if (role === "staff") return <Navigate to="/staff" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
