import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./GradingPage.css";
import "../styles/homework.css";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const keyOf = (b, q) => `${b}:${q ?? "null"}`;

export default function GradingPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState(new Map());
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // дізнатися, чи адмін (для показу тоглу «Мої / Усі»)
  let me = null;
  try { me = JSON.parse(localStorage.getItem("user") || "null"); } catch { me = null; }
  const isAdmin = !!(me && (me.is_admin || me.status === "admin"));

  useEffect(() => {
    const run = async () => {
      try {
        const [{ data: l }, { data: a }] = await Promise.all([
          axios.get(`${API_URL}/lesson-content/${lessonId}/full`, auth()),
          axios.get(`${API_URL}/attempts/lesson/${lessonId}${showAll ? "?all=1" : ""}`, auth()),
        ]);
        setLesson(l);
        setAttempts(a);
      } catch {
        setError("Не вдалося завантажити (потрібні права вчителя/адміна).");
      }
    };
    run();
  }, [lessonId, showAll]);

  const openAttempt = useCallback(async (id) => {
    setSelected(id);
    const { data } = await axios.get(`${API_URL}/attempts/${id}`, auth());
    setAttempt(data);
    const m = new Map();
    (data.answers || []).forEach((ans) => m.set(keyOf(ans.block_id, ans.question_id), ans));
    setAnswers(m);
  }, []);

  if (error) return <div className="gr-state">{error}</div>;
  if (!lesson) return <div className="gr-state">Завантаження…</div>;

  const sections = lesson.sections || [];

  return (
    <div className="gr-page">
      <header className="gr-top">
        <button className="gr-back" onClick={() => navigate(-1)}>← Назад</button>
        <div className="gr-title">Оцінювання · {lesson.title}</div>
      </header>

      <div className="gr-body">
        <aside className="gr-list">
          <div className="gr-list-head">
            <span>Спроби</span>
            {isAdmin && (
              <button
                className="gr-toggle"
                onClick={() => setShowAll((v) => !v)}
                title="Перемкнути перелік"
              >
                {showAll ? "Усі" : "Мої"}
              </button>
            )}
          </div>
          {attempts.map((at) => (
            <button
              key={at.id}
              className={`gr-att ${at.id === selected ? "is-active" : ""}`}
              onClick={() => openAttempt(at.id)}
            >
              <span className="gr-att-student">{at.student_username || `Учень #${at.student_id}`}</span>
              <span className={`gr-status ${at.status}`}>
                {at.status === "completed" ? "завершено" : "в процесі"}
              </span>
              {at.overall_grade != null && <span className="gr-grade-badge">{at.overall_grade}</span>}
            </button>
          ))}
          {!attempts.length && <div className="gr-empty">Ще ніхто не проходив.</div>}
        </aside>

        <main className="gr-main">
          {!attempt ? (
            <div className="gr-empty">Обери спробу зліва.</div>
          ) : (
            <div key={attempt.id}>
              {sections.map((s) => {
                const taskBlocks = (s.blocks || []).filter((b) => b.block_type === "task");
                if (!taskBlocks.length) return null;
                return (
                  <div key={s.id} className="gr-section">
                    <div className="gr-section-title">{s.title}{s.kind === "homework" && <span className="hw-badge">HW</span>}</div>
                    {taskBlocks.map((b) => (
                      <div key={b.id} className="gr-block">
                        <div className="gr-block-tag">{(b.task_type || "task").replace(/_/g, " ")}</div>
                        {b.title && <div className="gr-block-title">{b.title}</div>}
                        {(b.questions && b.questions.length ? b.questions : [null]).map((q) => (
                          <GradeRow
                            key={q ? q.id : `w-${b.id}`}
                            question={q}
                            answer={answers.get(keyOf(b.id, q ? q.id : null))}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
              <OverallPanel attempt={attempt} onSaved={(upd) => setAttempt(upd)} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function readableAnswer(question, ans) {
  if (!ans || ans.student_answer == null || ans.student_answer === "") return null;
  if (question && question.options && question.options[ans.student_answer]) {
    return `${ans.student_answer} — ${question.options[ans.student_answer]}`;
  }
  return ans.student_answer;
}

function GradeRow({ question, answer }) {
  const [grade, setGrade] = useState(answer?.teacher_grade ?? "");
  const [feedback, setFeedback] = useState(answer?.teacher_feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const studentText = readableAnswer(question, answer);
  const bot = answer?.is_correct;

  const save = async () => {
    if (!answer) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/attempts/answer/${answer.id}/grade`,
        { teacher_grade: grade === "" ? null : Number(grade), teacher_feedback: feedback || null },
        auth()
      );
      setSaved(true);
    } catch {
      alert("Помилка збереження оцінки.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gr-q">
      <div className="gr-q-text">{question ? question.question_text : "Письмова відповідь"}</div>
      <div className="gr-answer">
        {studentText ? (
          <>
            <span className="gr-answer-val">{studentText}</span>
            {bot === true && <span className="gr-bot ok">бот: вірно</span>}
            {bot === false && <span className="gr-bot no">бот: невірно</span>}
          </>
        ) : (
          <span className="gr-noanswer">— немає відповіді —</span>
        )}
      </div>
      {answer && (
        <div className="gr-grade-row">
          <input
            className="gr-grade-input"
            type="number"
            step="0.5"
            value={grade}
            onChange={(e) => { setGrade(e.target.value); setSaved(false); }}
            placeholder="бал"
          />
          <input
            className="gr-fb"
            value={feedback}
            onChange={(e) => { setFeedback(e.target.value); setSaved(false); }}
            placeholder="коментар (необовʼязково)"
          />
          <button className="gr-save-btn" onClick={save} disabled={saving}>
            {saving ? "…" : saved ? "✓" : "Зберегти"}
          </button>
        </div>
      )}
    </div>
  );
}

function OverallPanel({ attempt, onSaved }) {
  const [grade, setGrade] = useState(attempt.overall_grade ?? "");
  const [comment, setComment] = useState(attempt.teacher_comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/attempts/${attempt.id}/grade`,
        { overall_grade: grade === "" ? null : Number(grade), teacher_comment: comment || null },
        auth()
      );
      onSaved(data);
      setSaved(true);
    } catch {
      alert("Помилка збереження.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gr-overall">
      <div className="gr-overall-title">Загальна оцінка за урок</div>
      <div className="gr-grade-row">
        <input
          className="gr-grade-input"
          type="number"
          step="0.5"
          value={grade}
          onChange={(e) => { setGrade(e.target.value); setSaved(false); }}
          placeholder="бал"
        />
        <input
          className="gr-fb"
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          placeholder="загальний коментар"
        />
        <button className="gr-save-btn" onClick={save} disabled={saving}>
          {saving ? "…" : saved ? "✓" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}