import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import StaffRoute from "./components/StaffRoute";
import { getUser } from "./api/auth";
import ClassPage from "./pages/ClassPage";
import CreateUserPage from "./pages/CreateUserPage";
import UsersListPage from "./pages/UsersListPage";
import CreateClassPage from "./pages/CreateClassPage";
import AllClassesPage from "./pages/AllClassesPage";
import LessonView from "./pages/LessonView";
import LessonBuilderHome from "./pages/LessonBuilderHome";
import LessonBuilder from "./pages/LessonBuilder";
import GradingPage from "./pages/GradingPage";
import StudentResults from "./pages/StudentResults";

/* Eng Practice */
import EngPracticePage from "./pages/EngPracticePage";
import EngPracticeTaskPage from "./pages/EngPracticeTaskPage";

function App() {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
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
      <Routes>
        {/* Публічний логін */}
        <Route path="/login" element={<LoginPage setUser={setUser} />} />

        {/* Приватна зона — перевірка тільки на токен */}
        <Route element={<ProtectedRoute />}>
          {/* Доступно всім залогіненим */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/classroom/:id" element={<ClassPage />} />
          <Route path="/eng-practice" element={<EngPracticePage />} />
          <Route path="/eng-practice/task/:id" element={<EngPracticeTaskPage />} />
          <Route path="/lesson-view/:lessonId" element={<LessonView />} />
          <Route path="/my-results" element={<StudentResults />} />

          {/* Для всього персоналу (вчителі + адміни): оцінювання */}
          <Route element={<StaffRoute user={user} />}>
            <Route path="/grading/:lessonId" element={<GradingPage />} />
          </Route>

          {/* Лише для адмінів */}
          <Route element={<AdminRoute user={user} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/create-user" element={<CreateUserPage />} />
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/create-class" element={<CreateClassPage />} />
            <Route path="/all-classes" element={<AllClassesPage />} />
            <Route path="/lesson-builder" element={<LessonBuilderHome />} />
            <Route path="/lesson-builder/:lessonId" element={<LessonBuilder />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            localStorage.getItem("token") ? (
              (() => {
                let cachedUser = null;
                try {
                  cachedUser = JSON.parse(localStorage.getItem("user") || "null");
                } catch {
                  cachedUser = null;
                }
                return cachedUser ? (
                  <Navigate to={homeFor(cachedUser)} replace />
                ) : (
                  <Navigate to="/login" replace />
                );
              })()
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