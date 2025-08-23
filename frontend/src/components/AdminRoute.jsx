import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * - Нема токена → /login
 * - Є токен, але user відсутній (не встиг підвантажитись / очищений) → /login
 * - Адмін (role=staff, status=admin) → пускаємо
 * - Інакше → /student-dashboard
 */
const AdminRoute = ({ user }) => {
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

  const isAdmin = u.role === "staff" && u.status === "admin";
  if (isAdmin) return <Outlet />;

  return <Navigate to="/student-dashboard" replace />;
};

export default AdminRoute;
