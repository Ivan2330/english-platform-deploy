import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import LoginPage from "./pages/LoginPage";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log("🚀 App loaded, checking token...");
    const token = localStorage.getItem("token");
    if (token) {
      axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(response => {
          console.log("✅ User authenticated:", response.data);
          setUser(response.data);
        })
        .catch(() => {
          console.error("❌ Auth error, clearing token");
          localStorage.removeItem("token");
        });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

const HomePage = ({ user }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold">
        {user ? `🎉 Вітаю, ${user.email}!` : "🔑 Ви не авторизовані, перейдіть на /login"}
      </h1>
    </div>
  );
};

export default App;
