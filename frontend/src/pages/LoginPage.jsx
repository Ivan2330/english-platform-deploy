import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

import logo from "../assets/my_logo-1.svg";
import { API_URL } from "../../config";

/* --- Inline icons (без зайвих залежностей) --- */
const IconMail = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const IconLock = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const IconEye = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 3.19" />
    <path d="M6.6 6.6A13.1 13.1 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4.4-1.1" />
    <path d="m2 2 20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
const IconArrow = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

function LoginPage({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const { data } = await axios.post(`${API_URL}/auth/jwt/login`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = data.access_token;
      localStorage.setItem("token", token);

      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = userResponse.data;
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      const isAdmin = user.role === "staff" && user.status === "admin";
      navigate(isAdmin ? "/admin-dashboard" : "/student-dashboard");
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 400 || status === 401
          ? "Невірний email або пароль"
          : "Не вдалося увійти. Спробуйте ще раз пізніше."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-card">
        {/* Брендова панель */}
        <aside className="lp-brand">
          <div className="lp-brand-head">
            <div className="lp-badge">
              <img src={logo} alt="Prime Academy" />
            </div>
            <span className="lp-brand-name">Prime Academy</span>
          </div>

          <div className="lp-brand-copy">
            <h1>
              Master English.
              <br />
              Unlock your future.
            </h1>
            <p>Live lessons, smart practice and professional teachers — all in one place.</p>
            <div className="lp-chips">
              <span className="lp-chip">Upgrade your level</span>
              <span className="lp-chip">Live calls</span>
              <span className="lp-chip">Pro teachers</span>
            </div>
          </div>

          <div className="lp-brand-foot">© {new Date().getFullYear()} Prime Academy</div>
        </aside>

        {/* Форма */}
        <section className="lp-form-side">
          <h2>Welcome back</h2>
          <p className="lp-sub">Log in to continue your learning journey</p>

          {error && <div className="lp-error">{error}</div>}

          <form onSubmit={handleLogin} className="lp-form" noValidate>
            <label className="lp-label" htmlFor="lp-email">Email</label>
            <div className="lp-field">
              <IconMail className="lp-lead" />
              <input
                id="lp-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label className="lp-label" htmlFor="lp-password">Password</label>
            <div className="lp-field">
              <IconLock className="lp-lead" />
              <input
                id="lp-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>

            <button type="submit" className="lp-submit" disabled={loading}>
              {loading ? "Logging in…" : (<>Log in <IconArrow /></>)}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;