import { Navigate, useLocation } from "react-router-dom";
import { useAuth, deriveRole, homeForRole } from "../context/AuthContext";
import Loading from "./Loading";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length) {
    const role = deriveRole(user);
    if (!roles.includes(role)) {
      return <Navigate to={homeForRole(role)} replace />;
    }
  }

  return children;
}
