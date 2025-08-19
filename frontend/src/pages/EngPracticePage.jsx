import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./EngPractice.css";

const CONTROLS = [
  { key: "grammar", label: "Grammar", enabled: true },
  { key: "vocabulary", label: "Vocabulary", enabled: false }, // скоро
  { key: "reading", label: "Reading", enabled: true },
  { key: "listening", label: "Listening", enabled: false },   // скоро
  { key: "writing", label: "Writing", enabled: true },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function EngPracticePage() {
  const [tasks, setTasks] = useState([]);
  const [lessonsMap, setLessonsMap] = useState({}); // { [lesson_id]: level }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [control, setControl] = useState("grammar");
  const [level, setLevel] = useState(null); // null => всі
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

        // картка lesson_id -> level
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
        // якщо lesson_id немає — показуємо у всіх рівнях
        return !lv || lv === level;
      });
    }
    // для Writing поки тільки open_text
    if (control === "writing") {
      arr = arr.filter((t) => String(t.task_type) === "open_text");
    }
    return arr;
  }, [tasks, control, level, lessonsMap]);

  return (
    <div className="ep-wrap">
      {/* Верхня навігація */}
      <div className="ep-topbar">
        {CONTROLS.map((c) => (
          <button
            key={c.key}
            className={`ep-tab ${control === c.key ? "active" : ""} ${
              c.enabled ? "" : "disabled"
            }`}
            disabled={!c.enabled}
            onClick={() => c.enabled && setControl(c.key)}
          >
            {c.label}
            {!c.enabled && <span className="ep-soon">soon</span>}
          </button>
        ))}
      </div>

      <div className="ep-content">
        {/* Сайдбар рівнів */}
        <aside className="ep-levels">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              className={`ep-level-btn ${level === lv ? "active" : ""}`}
              onClick={() => setLevel(level === lv ? null : lv)}
            >
              {lv}
            </button>
          ))}
        </aside>

        {/* Список завдань */}
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
                  <div className="ep-card-head">
                    <div className="ep-pill">{t.control_type}</div>
                    <div className="ep-pill tone">{t.task_type}</div>
                  </div>
                  <h4 className="ep-card-title">{t.title}</h4>
                  {t.description && (
                    <p className="ep-card-desc">
                      {String(t.description).slice(0, 140)}
                      {String(t.description).length > 140 ? "…" : ""}
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
      </div>
    </div>
  );
}
