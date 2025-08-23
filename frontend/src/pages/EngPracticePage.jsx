import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./EngPractice.css";

const CONTROLS = [
  { key: "grammar", label: "Grammar" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function EngPracticePage() {
  const [tasks, setTasks] = useState([]);
  const [lessonsMap, setLessonsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [control, setControl] = useState("grammar");
  const [level, setLevel] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const [tasksRes, lessonsRes] = await Promise.all([
          axios.get(`${API_URL}/universal-tasks/tasks/`, { headers }),
          axios.get(`${API_URL}/lessons/lessons/`, { headers }),
        ]);
        const map = {};
        (lessonsRes.data || []).forEach((ls) => {
          if (ls?.id && ls?.level) map[ls.id] = ls.level;
        });
        setLessonsMap(map);
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      } catch (e) {
        console.error(e);
        setErr("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let arr = tasks.filter((t) => String(t.visibility) === "global");
    arr = arr.filter((t) => String(t.control_type) === control);
    if (level) {
      arr = arr.filter((t) => {
        const lv = t.lesson_id ? lessonsMap[t.lesson_id] : null;
        return !lv || lv === level;
      });
    }
    if (control === "writing") {
      arr = arr.filter((t) => String(t.task_type) === "open_text");
    }
    return arr;
  }, [tasks, control, level, lessonsMap]);

  return (
    <div className="ep-shell">
      {/* HERO */}
      <div className="ep-hero">
        <div className="ep-hero-inner">
          <div className="ep-brand">Eng Practice</div>
          <nav className="ep-tabs" role="tablist" aria-label="Task categories">
            {CONTROLS.map((c) => (
              <button
                key={c.key}
                className={`ep-tab ${control === c.key ? "active" : ""}`}
                onClick={() => setControl(c.key)}
                role="tab"
                aria-selected={control === c.key}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* BODY */}
      <div className="ep-body">
        <main className="ep-main">
          {loading ? (
            <div className="ep-skel">Loading…</div>
          ) : err ? (
            <div className="ep-err">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="ep-empty">Наразі немає завдань для цього фільтру.</div>
          ) : (
            <div className="ep-grid">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="ep-card"
                  onClick={() => navigate(`/eng-practice/task/${t.id}`)}
                >
                  <div className="ep-card-top">
                    <span className="ep-chip">{t.control_type}</span>
                    <span className="ep-chip tone">{t.task_type}</span>
                  </div>
                  <h4 className="ep-title">{t.title}</h4>
                  {t.description && (
                    <p className="ep-desc">
                      {String(t.description).slice(0, 150)}
                      {String(t.description).length > 150 ? "…" : ""}
                    </p>
                  )}
                  <div className="ep-card-foot">
                    {t.topic ? <span className="ep-tag">#{t.topic}</span> : <span />}
                    <span className="ep-cta">Open →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="ep-aside" aria-label="Levels">
          <div className="ep-aside-inner">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                className={`ep-level ${level === lv ? "active" : ""}`}
                onClick={() => setLevel(level === lv ? null : lv)}
                aria-pressed={level === lv}
              >
                {lv}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
