import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./LessonBuilder.css";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function LessonBuilderHome() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A1");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/lessons/lessons/`, auth());
      setLessons(Array.isArray(data) ? data : []);
    } catch {
      setError("Не вдалося завантажити уроки.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createLesson = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/lessons/lessons/`,
        { title: title.trim(), level },
        auth()
      );
      navigate(`/lesson-builder/${data.id}`);
    } catch {
      alert("Не вдалося створити урок.");
    } finally {
      setCreating(false);
    }
  };

  const renameLesson = async (l) => {
    const newTitle = prompt("Назва уроку:", l.title);
    if (newTitle == null || newTitle.trim() === "") return;
    try {
      await axios.put(`${API_URL}/lessons/lessons/${l.id}`, { title: newTitle.trim() }, auth());
      await load();
    } catch {
      alert("Не вдалося перейменувати.");
    }
  };

  const changeLevel = async (l) => {
    const newLevel = prompt("Рівень (A1, A2, B1, B2, C1, C2):", l.level || "A1");
    if (newLevel == null) return;
    try {
      await axios.put(`${API_URL}/lessons/lessons/${l.id}`, { level: newLevel.trim() }, auth());
      await load();
    } catch {
      alert("Не вдалося змінити рівень.");
    }
  };

  const deleteLesson = async (l) => {
    if (!window.confirm(`Видалити урок «${l.title}» з усіма секціями та блоками?`)) return;
    try {
      await axios.delete(`${API_URL}/lessons/lessons/${l.id}`, auth());
      await load();
    } catch {
      alert("Не вдалося видалити урок.");
    }
  };

  const visible =
    filter === "ALL" ? lessons : lessons.filter((l) => (l.level || "") === filter);

  return (
    <div className="lb-page">
      <header className="lb-top">
        <div className="lbh-top-left">
          <Link className="lb-back" to="/admin-dashboard">←</Link>
          <div className="lb-title">Конструктор уроків</div>
        </div>
        <span className="lbh-count">{lessons.length} уроків</span>
      </header>

      {/* Створення */}
      <div className="lbh-create">
        <input
          className="lbh-create-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createLesson()}
          placeholder="Назва нового уроку…"
        />
        <select className="lbh-create-level" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>{lv}</option>
          ))}
        </select>
        <button className="lbh-create-btn" onClick={createLesson} disabled={creating || !title.trim()}>
          {creating ? "Створення…" : "+ Створити урок"}
        </button>
      </div>

      {/* Фільтр за рівнем */}
      <div className="lbh-filter">
        <button className={`lbh-chip ${filter === "ALL" ? "on" : ""}`} onClick={() => setFilter("ALL")}>
          Усі
        </button>
        {LEVELS.map((lv) => (
          <button key={lv} className={`lbh-chip ${filter === lv ? "on" : ""}`} onClick={() => setFilter(lv)}>
            {lv}
          </button>
        ))}
      </div>

      {/* Список */}
      {loading ? (
        <div className="lb-state">Завантаження…</div>
      ) : error ? (
        <div className="lb-state">{error}</div>
      ) : !visible.length ? (
        <div className="lb-state">
          {lessons.length ? "Немає уроків цього рівня." : "Ще немає уроків — створи перший вище."}
        </div>
      ) : (
        <div className="lbh-grid">
          {visible.map((l) => (
            <div key={l.id} className="lbh-card" onClick={() => navigate(`/lesson-builder/${l.id}`)}>
              <div className="lbh-card-top">
                <span className="lbh-card-level">{l.level || "—"}</span>
                <div className="lbh-card-menu" onClick={(e) => e.stopPropagation()}>
                  <button title="Перейменувати" onClick={() => renameLesson(l)}>✎</button>
                  <button title="Змінити рівень" onClick={() => changeLevel(l)}>⇅</button>
                  <button title="Видалити" onClick={() => deleteLesson(l)}>✕</button>
                </div>
              </div>
              <div className="lbh-card-title">{l.title}</div>
              <div className="lbh-card-open">Відкрити в конструкторі →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}