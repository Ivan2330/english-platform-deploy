// src/pages/AdminDashboardPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";
import { API_URL } from "../../config";

const AdminDashboardPage = () => {
  const [adminData, setAdminData] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchAdminDataAndClassrooms = async () => {
      try {
        setLoading(true);
        setErr(null);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [adminRes, classRes] = await Promise.all([
          axios.get(`${API_URL}/staff/staff/me`, { headers }),
          axios.get(`${API_URL}/classrooms/classrooms/`, { headers }),
        ]);

        if (!mounted) return;
        setAdminData(adminRes.data);

        const list = Array.isArray(classRes.data) ? classRes.data : [];
        const filtered = adminRes?.data?.id
          ? list.filter((cls) => cls.teacher_id === adminRes.data.id)
          : list;

        setClassrooms(filtered);
      } catch (e) {
        console.error("Admin dashboard fetch error:", e);
        if (mounted) setErr("Не вдалося завантажити дані. Спробуй оновити сторінку.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAdminDataAndClassrooms();
    return () => { mounted = false; };
  }, []);

  // підсвітка курсора на кнопках (працює разом із CSS var --x/--y)
  useEffect(() => {
    const moveGlow = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.matches(".button, .go-btn")) return;
      const rect = t.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      t.style.setProperty("--x", `${x}%`);
      t.style.setProperty("--y", `${y}%`);
    };
    window.addEventListener("mousemove", moveGlow);
    return () => window.removeEventListener("mousemove", moveGlow);
  }, []);

  return (
    <div className="admin-dashboard">
      {/* фонові шари під стиль референсу */}
      <div className="fx fx-stars" aria-hidden="true" />
      <div className="fx fx-grid" aria-hidden="true" />
      <div className="fx fx-glow" aria-hidden="true" />

      <header className="dashboard-header" role="banner">
        <h1 className="dashboard-header-h1">Prime Academy · Admin</h1>
        <div className="dashboard-header-meta" aria-live="polite">
          {adminData ? (
            <span title="Рівень користувача">
              {adminData.username ?? "Admin"} · {adminData.level ?? "—"}
            </span>
          ) : (
            <span>Завантаження профілю…</span>
          )}
        </div>
      </header>

      <section className="dashboard-content" role="main">
        {/* Ліва панель — дії */}
        <aside className="left-panel-buttons" aria-label="Панель дій">
          <div className="profile-info" role="note">
            <h2 className="profile-name">
              {adminData?.username || "Name Surname"} {adminData?.level ? `· ${adminData.level}` : ""}
              <span className="status-dot" aria-hidden="true" />
            </h2>
            <p className="profile-sub">Адмін-панель · керування користувачами, класами та уроками</p>
          </div>

          <ul className="button-group" aria-label="Керування користувачами та завданнями">
            <li className="button-group-li" id="li-1">
              <button className="button" onClick={() => navigate("/create-user")}>
                Create User
              </button>
            </li>
            <li className="button-group-li" id="li-2">
              <button className="button" onClick={() => navigate("/users")}>
                Users List
              </button>
            </li>
            <li className="button-group-li">
              <button className="button" onClick={() => navigate("/task-list")}>
                Task List
              </button>
            </li>
            <li className="button-group-li">
              <button className="button" onClick={() => navigate("/create-task")}>
                Create Task
              </button>
            </li>
            <li className="button-group-li">
              <button className="button" onClick={() => navigate("/lesson-builder")}>
                Lesson Builder
              </button>
            </li>
          </ul>

          <ul className="button-group" aria-label="Класи">
            <li className="button-group-li" id="button-c">
              <button className="button" onClick={() => navigate("/create-class")}>
                Create Class
              </button>
            </li>
            <li className="button-group-li" id="button-a">
              <button className="button" onClick={() => navigate("/all-classes")}>
                All Classes
              </button>
            </li>
          </ul>
        </aside>

        {/* Права панель — список класів */}
        <div className="right-panel-classes">
          <div className="panel-head">
            <h3>Classes</h3>
            {!loading && (
              <span className="badge" aria-label="Кількість класів">
                {classrooms.length}
              </span>
            )}
          </div>

          <div className="r-panel-list" role="list">
            {loading && (
              <>
                <SkeletonItem />
                <SkeletonItem />
                <SkeletonItem />
              </>
            )}

            {!loading && err && (
              <div className="empty-state danger" role="alert">
                {err}
              </div>
            )}

            {!loading && !err && classrooms.length === 0 && (
              <div className="empty-state" role="status">
                У тебе поки немає класів. Створи перший — натисни <strong>Create Class</strong>.
              </div>
            )}

            {!loading &&
              !err &&
              classrooms.map((cls) => (
                <div key={cls.id} className="r-panel-item" role="listitem">
                  <div className="r-panel-item-id" title="ID класу">{cls.id}</div>
                  <div className="r-panel-item-name" title="Назва класу">{cls.name}</div>
                  <div className="r-panel-item-go">
                    <button
                      className="go-btn"
                      onClick={() => navigate(`/classroom/${cls.id}`)}
                      aria-label={`Перейти до класу ${cls.name}`}
                    >
                      Go
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const SkeletonItem = () => (
  <div className="r-panel-item skeleton">
    <div className="r-panel-item-id shimmer">—</div>
    <div className="r-panel-item-name shimmer">Завантаження…</div>
    <div className="r-panel-item-go">
      <div className="btn-skeleton shimmer" />
    </div>
  </div>
);

export default AdminDashboardPage;
