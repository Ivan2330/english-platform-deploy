// src/components/AdminRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Дозволяє доступ лише, якщо user — staff+admin.
 * Беремо user із пропса або з localStorage (на випадок рефрешу).
 */
const AdminRoute = ({ user }) => {
  const u = user || JSON.parse(localStorage.getItem("user") || "null");

  const isAdmin = u?.role === "staff" && u?.status === "admin";
  if (!isAdmin) {
    // якщо не адмін — відправляємо в студентський дашборд
    return <Navigate to="/student-dashboard" replace />;
  }
  return <Outlet />;
};

export default AdminRoute;
