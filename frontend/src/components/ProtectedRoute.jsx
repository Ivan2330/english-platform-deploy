// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * Пускає далі, якщо є token у localStorage.
 * НЕ чекає, поки стягнеться user з API (щоб не було редіректу на логін при refresh).
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
