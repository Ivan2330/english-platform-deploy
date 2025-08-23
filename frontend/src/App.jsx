// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { getUser } from "./api/auth";
import ClassPage from "./pages/ClassPage";
import CreateUserPage from "./pages/CreateUserPage";
import UsersListPage from "./pages/UsersListPage";
import CreateClassPage from "./pages/CreateClassPage";
import AllClassesPage from "./pages/AllClassesPage";
import LessonBuilderPage from "./pages/LessonBuilderPage";

/* Eng Practice */
import EngPracticePage from "./pages/EngPracticePage";
import EngPracticeTaskPage from "./pages/EngPracticeTaskPage";

/* 🔄 Лоадер лише на переходи між сторінками */
import RouteChangeLoader from "./components/RouteChangeLoader";

function App() {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await getUser(token);
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        } else {
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (error) {
        console.error("Помилка отримання користувача", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
    };
    bootstrap();
  }, []);

  const homeFor = (u) =>
    u?.role === "staff" && u?.status === "admin" ? "/admin-dashboard" : "/student-dashboard";

  return (
    <Router>
      {/* ⬇️ Лише при зміні URL; без інтерсепторів */}
      <RouteChangeLoader showOnFirstLoad={false} />

      <Routes>
        {/* Публічний логін */}
        <Route path="/login" element={<LoginPage setUser={setUser} />} />

        {/* Приватна зона — пропускає, якщо Є token у localStorage */}
        <Route element={<ProtectedRoute />}>
          {/* Доступно всім залогіненим */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/classroom/:id" element={<ClassPage />} />
          <Route path="/eng-practice" element={<EngPracticePage />} />
          <Route path="/eng-practice/task/:id" element={<EngPracticeTaskPage />} />

          {/* Тільки для admin (staff+admin) */}
          <Route element={<AdminRoute user={user} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/create-user" element={<CreateUserPage />} />
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/create-class" element={<CreateClassPage />} />
            <Route path="/all-classes" element={<AllClassesPage />} />
            <Route path="/lesson-builder" element={<LessonBuilderPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            localStorage.getItem("token") ? (
              <Navigate
                to={homeFor(user || JSON.parse(localStorage.getItem("user") || "{}"))}
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
