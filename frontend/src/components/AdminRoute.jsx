// src/components/AdminRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminRoute = ({ user }) => {
  const u = user || JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = u?.role === "staff" && u?.status === "admin";
  if (!isAdmin) return <Navigate to="/student-dashboard" replace />;
  return <Outlet />;
};

export default AdminRoute;
