import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./LessonBuilder.css"; // переюзаємо стиль карток списку
import "./GradingHome.css";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function GradingHome() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/lessons/lessons/`, auth());
        setLessons(Array.isArray(data) ? data : []);
      } catch {
        setError("Не вдалося завантажити уроки.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = lessons.filter((l) =>
    !query || l.title?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="lbh-page">
      <header className="lbh-top">
        <button className="lbh-back" onClick={() => navigate(-1)}>← Назад</button>
        <h1 className="lbh-title">Оцінювання · оберіть урок</h1>
      </header>

      <div className="lbh-toolbar">
        <input
          className="lbh-search"
          placeholder="Пошук за назвою…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="lbh-state">{error}</div>}
      {loading && !error && <div className="lbh-state">Завантаження…</div>}

      {!loading && !error && (
        <div className="lbh-grid">
          {filtered.map((l) => (
            <button
              key={l.id}
              className="lbh-card"
              onClick={() => navigate(`/grading/${l.id}`)}
              title="Відкрити оцінювання"
            >
              <span className="lbh-card-title">{l.title || "Без назви"}</span>
              {l.level && <span className="lbh-card-level">{l.level}</span>}
              <span className="lbh-card-cta">Оцінити →</span>
            </button>
          ))}
          {!filtered.length && <div className="lbh-state">Уроків не знайдено.</div>}
        </div>
      )}
    </div>
  );
}