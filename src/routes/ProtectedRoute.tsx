import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { User } from "../types";
import { verifyCurrentSession } from "../utils/auth";
import { canAccess, defaultPathForRole } from "../utils/permissions";

export function ProtectedRoute() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    setChecking(true);
    verifyCurrentSession()
      .then((verifiedUser) => {
        if (active) setUser(verifiedUser);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="login-bg grid min-h-screen place-items-center px-6 text-white">
        <div className="rounded-3xl border border-white/15 bg-white/10 px-8 py-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <p className="text-sm font-black tracking-[0.22em] text-cyan-100">AUTH CHECK</p>
          <p className="mt-3 text-lg font-black">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, location.pathname)) return <Navigate to={defaultPathForRole(user.role)} replace />;
  return <Outlet />;
}
