// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { getUser } from "./api/auth";
import ClassPage from "./pages/ClassPage"; // 👈 додано



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
              <Route path="/classroom/:id" element={<ClassPage />} />
            </>
          ) : (
            <>
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/classroom/:id" element={<ClassPage/>} />
            </>
          )}
        </Route>
        <Route path="*" element={<LoginPage setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
