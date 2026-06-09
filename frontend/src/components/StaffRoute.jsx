import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * - Нема токена → /login
 * - Нема user → /login
 * - Персонал (role === "staff") → пускаємо
 * - Інакше → /student-dashboard
 */
const StaffRoute = ({ user }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    cached = null;
  }
  const u = user || cached;
  if (!u) return <Navigate to="/login" replace />;

  return u.role === "staff" ? <Outlet /> : <Navigate to="/student-dashboard" replace />;
};

export default StaffRoute;