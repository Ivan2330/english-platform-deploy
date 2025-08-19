import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { getUser } from "./api/auth";
import ClassPage from "./pages/ClassPage";
import CreateUserPage from "./pages/CreateUserPage";
import UsersListPage from "./pages/UsersListPage";
import CreateClassPage from "./pages/CreateClassPage";
import AllClassesPage from "./pages/AllClassesPage";
import LessonBuilderPage from "./pages/LessonBuilderPage";

/* ⬇️ нові сторінки Eng Practice */
import EngPracticePage from "./pages/EngPracticePage";
import EngPracticeTaskPage from "./pages/EngPracticeTaskPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await getUser(token);
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        }
      } catch (error) {
        console.error("Помилка отримання користувача", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />

        <Route element={<ProtectedRoute user={user} />}>
          {user?.role === "staff" && user?.status === "admin" ? (
            <>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/create-user" element={<CreateUserPage />} />
              <Route path="/users" element={<UsersListPage />} />
              <Route path="/classroom/:id" element={<ClassPage />} />
              <Route path="/create-class" element={<CreateClassPage />} />
              <Route path="/all-classes" element={<AllClassesPage />} />
              <Route path="/lesson-builder" element={<LessonBuilderPage />} />

              {/* Eng Practice (адміну теж доступно для тесту) */}
              <Route path="/eng-practice" element={<EngPracticePage />} />
              <Route path="/eng-practice/task/:id" element={<EngPracticeTaskPage />} />
            </>
          ) : (
            <>
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/classroom/:id" element={<ClassPage />} />

              {/* Eng Practice для студента */}
              <Route path="/eng-practice" element={<EngPracticePage />} />
              <Route path="/eng-practice/task/:id" element={<EngPracticeTaskPage />} />
            </>
          )}
        </Route>

        <Route path="*" element={<LoginPage setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
