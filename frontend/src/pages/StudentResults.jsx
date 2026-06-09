import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import "./StudentResults.css";
import "../styles/homework.css";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const keyOf = (b, q) => `${b}:${q ?? "null"}`;

function fmtDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function fmtAnswer(question, ans) {
  if (!ans || ans.student_answer == null || ans.student_answer === "") return null;
  const raw = ans.student_answer;
  if (question && question.options && question.options[raw]) {
    return `${raw} — ${question.options[raw]}`;
  }
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p.join(" → ");
    if (p && typeof p === "object") {
      return Object.entries(p).map(([k, v]) => `${k} → ${v || "—"}`).join(", ");
    }
  } catch {
    /* звичайний рядок */
  }
  return raw;
}

export default function StudentResults() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [answers, setAnswers] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/attempts/my`, auth());
        setItems(data);
      } catch {
        setError("Не вдалося завантажити результати.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const open = useCallback(async (item) => {
    setSelected(item.id);
    setAttempt(null);
    setLesson(null);
    try {
      const [{ data: at }, { data: l }] = await Promise.all([
        axios.get(`${API_URL}/attempts/${item.id}`, auth()),
        axios.get(`${API_URL}/lesson-content/${item.lesson_id}/full`, auth()),
      ]);
      setAttempt(at);
      setLesson(l);
      const m = new Map();
      (at.answers || []).forEach((a) => m.set(keyOf(a.block_id, a.question_id), a));
      setAnswers(m);
    } catch {
      setError("Не вдалося відкрити спробу.");
    }
  }, []);

  if (loading) return <div className="sr-state">Завантаження…</div>;
  if (error) return <div className="sr-state">{error}</div>;

  const sections = lesson?.sections || [];

  return (
    <div className="sr-page">
      <header className="sr-top">
        <div className="sr-title">Мої результати</div>
      </header>

      <div className="sr-body">
        <aside className="sr-list">
          {!items.length && <div className="sr-empty">Ще немає проходжень уроків.</div>}
          {items.map((it) => (
            <button
              key={it.id}
              className={`sr-att ${it.id === selected ? "is-active" : ""}`}
              onClick={() => open(it)}
            >
              <span className="sr-att-title">{it.lesson_title || `Урок #${it.lesson_id}`}</span>
              <span className="sr-att-meta">
                <span className={`sr-status ${it.status}`}>
                  {it.status === "completed" ? "завершено" : "в процесі"}
                </span>
                <span className="sr-date">{fmtDate(it.started_at)}</span>
              </span>
              {it.overall_grade != null && <span className="sr-grade-badge">{it.overall_grade}</span>}
            </button>
          ))}
        </aside>

        <main className="sr-main">
          {!attempt ? (
            <div className="sr-empty">Обери урок зліва, щоб переглянути відповіді й оцінки.</div>
          ) : (
            <div key={attempt.id}>
              {attempt.teacher_comment || attempt.overall_grade != null ? (
                <div className="sr-overall">
                  <div className="sr-overall-head">
                    <span className="sr-overall-label">Оцінка за урок</span>
                    {attempt.overall_grade != null ? (
                      <span className="sr-overall-grade">{attempt.overall_grade}</span>
                    ) : (
                      <span className="sr-overall-pending">ще не оцінено</span>
                    )}
                  </div>
                  {attempt.teacher_comment && (
                    <div className="sr-overall-comment">{attempt.teacher_comment}</div>
                  )}
                </div>
              ) : (
                <div className="sr-overall sr-overall--pending">
                  <span className="sr-overall-pending">Урок ще не оцінено викладачем</span>
                </div>
              )}

              {sections.map((s) => {
                const taskBlocks = (s.blocks || []).filter((b) => b.block_type === "task");
                if (!taskBlocks.length) return null;
                return (
                  <div key={s.id} className="sr-section">
                    <div className="sr-section-title">{s.title}{s.kind === "homework" && <span className="hw-badge">HW</span>}</div>
                    {taskBlocks.map((b) => (
                      <div key={b.id} className="sr-block">
                        <div className="sr-block-tag">{(b.task_type || "task").replace(/_/g, " ")}</div>
                        {b.title && <div className="sr-block-title">{b.title}</div>}
                        {(b.questions && b.questions.length ? b.questions : [null]).map((q) => {
                          const ans = answers.get(keyOf(b.id, q ? q.id : null));
                          const text = fmtAnswer(q, ans);
                          return (
                            <div key={q ? q.id : `w-${b.id}`} className="sr-q">
                              <div className="sr-q-text">{q ? q.question_text : "Письмова відповідь"}</div>
                              <div className="sr-answer">
                                {text ? (
                                  <>
                                    <span className="sr-answer-val">{text}</span>
                                    {ans?.is_correct === true && <span className="sr-bot ok">вірно</span>}
                                    {ans?.is_correct === false && <span className="sr-bot no">невірно</span>}
                                  </>
                                ) : (
                                  <span className="sr-noanswer">— немає відповіді —</span>
                                )}
                              </div>
                              {(ans?.teacher_grade != null || ans?.teacher_feedback) && (
                                <div className="sr-teacher">
                                  {ans.teacher_grade != null && (
                                    <span className="sr-teacher-grade">Бал: {ans.teacher_grade}</span>
                                  )}
                                  {ans.teacher_feedback && (
                                    <span className="sr-teacher-fb">{ans.teacher_feedback}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}