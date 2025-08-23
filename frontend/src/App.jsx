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

/* Глобальна анімація завантаження (єдина для всіх сторінок) */
import GlobalLoader from "./components/GlobalLoader";

function App() {
  const [user, setUser] = useState(() => {
    // 1) миттєво беремо user з localStorage (щоб не було "порожнечі" при refresh)
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await getUser(token);
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        } else {
          // без токена — гарантуємо чистий стан
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (error) {
        console.error("Помилка отримання користувача", error);
        // при помилці токен скоріше за все невалідний — чистимо
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Головний шлях за замовчуванням для залогінених
  const homeFor = (u) => (u?.role === "staff" && u?.status === "admin" ? "/admin-dashboard" : "/student-dashboard");

  // Поки відбувається первинна ініціалізація — покажемо GlobalLoader (а не текст)
  if (loading) {
    return (
      <>
        <GlobalLoader />
        {/* Router все одно монтуємо, щоб працювала адреса/історія */}
        <Router>
          <Routes>
            <Route path="*" element={<></>} />
          </Routes>
        </Router>
      </>
    );
  }

  return (
    <Router>
      {/* Один раз підключаємо глобальний лоадер (слухає всі axios-запити) */}
      <GlobalLoader />

      <Routes>
        {/* Публічний маршрут логіну */}
        <Route path="/login" element={<LoginPage setUser={setUser} />} />

        {/* Приватні маршрути — пустить, якщо є token у localStorage */}
        <Route element={<ProtectedRoute />}>
          {/* Доступно всім залогіненим */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/classroom/:id" element={<ClassPage />} />
          <Route path="/eng-practice" element={<EngPracticePage />} />
          <Route path="/eng-practice/task/:id" element={<EngPracticeTaskPage />} />

          {/* Тільки адмін (staff + admin) */}
          <Route element={<AdminRoute user={user} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/create-user" element={<CreateUserPage />} />
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/create-class" element={<CreateClassPage />} />
            <Route path="/all-classes" element={<AllClassesPage />} />
            <Route path="/lesson-builder" element={<LessonBuilderPage />} />
          </Route>
        </Route>

        {/* Fallback:
           - якщо є token → на свій home (admin/student)
           - якщо немає → на /login
        */}
        <Route
          path="*"
          element={
            localStorage.getItem("token") ? (
              <Navigate to={homeFor(user || JSON.parse(localStorage.getItem("user") || "{}"))} replace />
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
