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
        if (mounted) setErr("System Error: Unable to sync data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAdminDataAndClassrooms();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const moveGlow = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.closest(".cyber-tile")) return;
      
      const target = t.closest(".cyber-tile");
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      target.style.setProperty("--x", `${x}px`);
      target.style.setProperty("--y", `${y}px`);
    };
    window.addEventListener("mousemove", moveGlow);
    return () => window.removeEventListener("mousemove", moveGlow);
  }, []);

  return (
    <div className="cyber-dashboard">
      <div className="bg-grid"></div>
      <div className="bg-glow"></div>
      
      <header className="cyber-header">
        <div className="brand-section">
          <div className="logo-glitch">PRIME_OS</div>
          <div className="version-tag">v.3.0 // ADMIN</div>
        </div>
        
        <div className="user-status-bar">
          {adminData ? (
            <>
              <div className="status-indicator online"></div>
              <div className="user-details">
                <span className="user-name">{adminData.username}</span>
                <span className="user-role">[{adminData.level || "ROOT"}]</span>
              </div>
            </>
          ) : (
            <div className="loading-text">INITIALIZING...</div>
          )}
        </div>
      </header>

      <main className="cyber-main-grid">
        <section className="control-panel">
          <h2 className="panel-title">COMMAND CENTER</h2>
          
          <div className="tiles-grid">
            <button className="cyber-tile tile-blue" onClick={() => navigate("/create-user")}>
              <div className="tile-content">
                <span className="tile-icon">✚</span>
                <span className="tile-label">Create User</span>
              </div>
              <div className="tile-glow"></div>
            </button>

            <button className="cyber-tile tile-purple" onClick={() => navigate("/users")}>
              <div className="tile-content">
                <span className="tile-icon">👥</span>
                <span className="tile-label">User Database</span>
              </div>
              <div className="tile-glow"></div>
            </button>

            <button className="cyber-tile tile-pink" onClick={() => navigate("/lesson-builder")}>
              <div className="tile-content">
                <span className="tile-icon">🛠</span>
                <span className="tile-label">Lesson Builder</span>
              </div>
              <div className="tile-glow"></div>
            </button>
          </div>

          <h2 className="panel-title mt-large">CLASSROOM MANAGEMENT</h2>
          <div className="tiles-grid two-col">
            <button className="cyber-tile tile-cyan" onClick={() => navigate("/create-class")}>
              <div className="tile-content">
                <span className="tile-label">New Class</span>
              </div>
              <div className="tile-glow"></div>
            </button>
            <button className="cyber-tile tile-cyan" onClick={() => navigate("/all-classes")}>
              <div className="tile-content">
                <span className="tile-label">Global View</span>
              </div>
              <div className="tile-glow"></div>
            </button>
          </div>
        </section>

        <section className="data-panel">
          <div className="data-header">
            <h3>ACTIVE STREAMS</h3>
            <div className="live-badge">
              {loading ? "SYNC..." : `${classrooms.length} NODES`}
            </div>
          </div>

          <div className="class-feed">
            {loading && (
              <div className="loading-scanline">
                <div className="scan-bar"></div>
                LOADING DATA STREAMS...
              </div>
            )}

            {!loading && err && (
              <div className="error-box">
                ⚠ {err}
              </div>
            )}

            {!loading && !err && classrooms.length === 0 && (
              <div className="empty-void">
                NO DATA FOUND. INITIATE NEW CLASS.
              </div>
            )}

            {!loading && !err && classrooms.map((cls) => (
              <div key={cls.id} className="class-node" onClick={() => navigate(`/classroom/${cls.id}`)}>
                <div className="node-id">#{cls.id.toString().padStart(4, '0')}</div>
                <div className="node-name">{cls.name}</div>
                <div className="node-action">ACCESS &rarr;</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;