import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";
import { canAccess, defaultPathForRole } from "../utils/permissions";

export function ProtectedRoute() {
  const location = useLocation();
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, location.pathname)) return <Navigate to={defaultPathForRole(user.role)} replace />;
  return <Outlet />;
}
