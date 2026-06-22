import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import BlockRenderer from "../components/lesson/LessonBlocks";
import "./LessonView.css";
import "../styles/homework.css";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const keyOf = (blockId, qId) => `${blockId}:${qId ?? "null"}`;

export default function LessonView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const previewMode = useMemo(() => {
    if (new URLSearchParams(window.location.search).get("preview") === "1") return true;
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.role === "staff";
    } catch {
      return false;
    }
  }, []);

  const [lesson, setLesson] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState(() => new Map());
  const [activeSection, setActiveSection] = useState(0);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: lessonData } = await axios.get(
          `${API_URL}/lesson-content/${lessonId}/full`,
          auth()
        );
        setLesson(lessonData);

        // прев'ю для викладача — лише читання, без створення спроби
        if (previewMode) {
          setLoaded(true);
          return;
        }

        // стартуємо/відновлюємо спробу (для учня)
        const { data: att } = await axios.post(
          `${API_URL}/attempts/start`,
          { lesson_id: Number(lessonId) },
          auth()
        );

        // підтягуємо вже збережені відповіді
        const { data: full } = await axios.get(`${API_URL}/attempts/${att.id}`, auth());
        const map = new Map();
        (full.answers || []).forEach((a) =>
          map.set(keyOf(a.block_id, a.question_id), a.student_answer)
        );

        // ставимо разом, щоб блоки змонтувались уже з правильними початковими значеннями
        setInitial(map);
        setAttempt(att);
        setLoaded(true);
      } catch (e) {
        setError("Не вдалося завантажити урок.");
      }
    };
    run();
  }, [lessonId]);

  const runner = useMemo(() => {
    if (!attempt) return null;
    return {
      initial,
      save: async (blockId, questionId, studentAnswer) => {
        await axios.post(
          `${API_URL}/attempts/${attempt.id}/answer`,
          { block_id: blockId, question_id: questionId ?? null, student_answer: studentAnswer },
          auth()
        );
      },
    };
  }, [attempt, initial]);

  const completeLesson = async () => {
    if (!attempt) return;
    try {
      await axios.post(`${API_URL}/attempts/${attempt.id}/complete`, {}, auth());
      setCompleted(true);
    } catch {
      alert("Не вдалося завершити урок.");
    }
  };

  if (error) return <div className="lv-state">{error}</div>;
  if (!loaded || !lesson) return <div className="lv-state">Завантаження…</div>;

  const sections = lesson.sections || [];
  const current = sections[activeSection];

  return (
    <div className="lv-page">
      <div className="lv-shell">
        <header className="lv-hero">
          <div className="lv-hero-top">
            <span className="lv-hero-eyebrow">
              LESSON{lesson.level ? ` · ${lesson.level}` : ""}{previewMode ? " · ПРЕВ'Ю" : ""}
            </span>
            {previewMode ? (
              <button className="lv-finish" onClick={() => navigate(`/lesson-builder/${lessonId}`)}>
                ← До конструктора
              </button>
            ) : (
              <button className="lv-finish" onClick={completeLesson} disabled={completed}>
                {completed ? "✓ Завершено" : "Завершити урок"}
              </button>
            )}
          </div>
          <h1 className="lv-hero-title">{lesson.title}</h1>
        </header>

        <div className="lv-body">
          <aside className="lv-rail">
            <div className="lv-rail-label">SECTIONS</div>
            {sections.map((s, i) => (
              <button
                key={s.id}
                className={`lv-rail-item ${i === activeSection ? "is-active" : ""}`}
                onClick={() => setActiveSection(i)}
              >
                {s.title}
                {s.kind === "homework" && <span className="hw-badge">HW</span>}
              </button>
            ))}
          </aside>

          <main className="lv-doc">
            {current ? (
              current.blocks.length ? (
                current.blocks.map((b) => <BlockRenderer key={b.id} block={b} runner={runner} />)
              ) : (
                <div className="lv-state">У цій секції ще немає блоків.</div>
              )
            ) : (
              <div className="lv-state">У цьому уроці ще немає секцій.</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}