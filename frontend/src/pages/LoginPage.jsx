import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

import logo from "../assets/my_logo-1.svg";
// import "../assets/img_AdminDash/userAvatarNoPhoto.svg"

import { API_URL } from "../../config";

function LoginPage({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post(`${API_URL}/auth/jwt/login`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", response.data.access_token);
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` },
      });

      setUser(userResponse.data);
      navigate(userResponse.data.role === "staff" ? "/admin-dashboard" : "/student-dashboard");
    } catch (err) {
      setError("❌ Невірний email або пароль");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Prime Academy" className="login-logo" />
        <h2 className="login-title">Prime Academy</h2>
        {error && <p className="login-error">{error}</p>}
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />
          <button type="submit" className="login-button">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
