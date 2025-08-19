import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import SectionContent from "../components/SectionContent";
import "./EngPractice.css";

const GAP_TOKEN_REGEX = /\[\[(\d+)\]\]/g;

export default function EngPracticeTaskPage() {
  const { id } = useParams();
  const taskId = Number(id);
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [answers, setAnswers] = useState({});
  const [curr, setCurr] = useState(0);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [resultMeta, setResultMeta] = useState(null); // {correct, total}

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const [tRes, qRes] = await Promise.all([
          axios.get(`${API_URL}/universal-tasks/tasks/${taskId}`, { headers }),
          axios.get(`${API_URL}/questions/questions/tasks/${taskId}/questions/`, { headers }),
        ]);
        setTask(tRes.data);
        const qs = (qRes.data || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setQuestions(qs);
      } catch (e) {
        console.error(e);
        setErr("Failed to load task.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId]);

  const taskType = useMemo(() => String(task?.task_type || ""), [task]);
  const controlType = useMemo(() => String(task?.control_type || ""), [task]);

  const setAnswer = (qid, value) => {
    setAnswers((s) => ({ ...s, [qid]: typeof value === "string" ? value.trim() : value }));
  };
  const setInlineGap = (qid, gapIndex, value) => {
    setAnswers((prev) => {
      const base = prev[qid] && typeof prev[qid] === "object" ? prev[qid] : {};
      return { ...prev, [qid]: { ...base, [gapIndex]: (value || "").trim() } };
    });
  };
  const buildPayload = () => {
    const pairs = Object.entries(answers).map(([qid, val]) => {
      if (val && typeof val === "object") {
        const keys = Object.keys(val).sort((a, b) => Number(a) - Number(b));
        return [qid, keys.map((k) => val[k]).join("||")];
      }
      return [qid, val];
    });
    return Object.fromEntries(pairs);
  };

  const submit = async () => {
    try {
      const payload = buildPayload();
      const res = await axios.post(
        `${API_URL}/task-results/results/tasks/${taskId}/check/`,
        payload,
        { headers }
      );
      const data = Array.isArray(res.data) ? res.data : [];

      if (taskType === "open_text" || controlType === "writing") {
        setSubmitMsg("✅ Відповідь надіслано. Протягом доби викладач перевірить вашу роботу.");
        setResultMeta(null);
      } else {
        const total = data.length;
        const correct = data.filter((r) => r.is_correct === true).length;
        setResultMeta({ correct, total });
        setSubmitMsg("Результат збережено.");
      }
    } catch (e) {
      console.error(e);
      setSubmitMsg("Помилка під час відправки відповідей.");
    }
  };

  const hasInlineGaps = (text) => !!String(text || "").match(GAP_TOKEN_REGEX);

  const renderInline = (q) => {
    const text = String(q.question_text || "");
    const out = [];
    let last = 0;
    const regex = new RegExp(GAP_TOKEN_REGEX.source, "g");
    const valObj = (answers[q.id] && typeof answers[q.id] === "object") ? answers[q.id] : {};
    let m, idx = 0;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = regex.lastIndex;
      const num = Number(m[1]);
      if (start > last) out.push(<span key={`t-${idx}`}>{text.slice(last, start)}</span>);
      out.push(
        <input
          key={`g-${q.id}-${num}`}
          className="ep-gap-inline"
          type="text"
          value={valObj[num] || ""}
          placeholder="…"
          onChange={(e) => setInlineGap(q.id, num, e.target.value)}
        />
      );
      last = end;
      idx++;
    }
    if (last < text.length) out.push(<span key={`t-end`}>{text.slice(last)}</span>);
    return <p className="ep-inline">{out}</p>;
  };

  const renderQuestionBody = (q) => {
    if (!q) return null;

    if (taskType === "multiple_choice") {
      return (
        <div className="ep-options">
          {Object.entries(q.options || {}).map(([key, val]) => {
            const selected = answers[q.id] === val;
            return (
              <button
                key={key}
                className={`ep-option ${selected ? "selected" : ""}`}
                onClick={() => setAnswer(q.id, val)}
              >
                {val}
              </button>
            );
          })}
        </div>
      );
    }

    if (taskType === "true_false") {
      const v = String(answers[q.id] || "").toLowerCase();
      return (
        <div className="ep-tf">
          <button
            className={`ep-tf-btn ${v === "true" ? "active" : ""}`}
            onClick={() => setAnswer(q.id, "true")}
          >
            True
          </button>
          <button
            className={`ep-tf-btn ${v === "false" ? "active" : ""}`}
            onClick={() => setAnswer(q.id, "false")}
          >
            False
          </button>
        </div>
      );
    }

    if (taskType === "gap_fill") {
      if (hasInlineGaps(q.question_text)) {
        return (
          <div className="ep-gap">
            {renderInline(q)}
            <small className="ep-hint">Заповни пропуски у реченні.</small>
          </div>
        );
      }
      return (
        <div className="ep-gap">
          <p className="ep-qtext">{q.question_text}</p>
          <input
            className="ep-input"
            type="text"
            placeholder="Впиши відповідь"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        </div>
      );
    }

    // open_text (Writing)
    return (
      <div className="ep-open">
        <textarea
          rows={8}
          className="ep-textarea"
          placeholder="Напиши свою відповідь…"
          value={answers[q.id] || ""}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
        <small className="ep-hint">Відповідь перевірить викладач.</small>
      </div>
    );
  };

  const q = questions[curr];

  return (
    <div className="ep-task-wrap">
      <div className="ep-task-head">
        <button className="ep-back" onClick={() => navigate(-1)}>← Back</button>
        {task && <h3 className="ep-title">{task.title}</h3>}
      </div>

      {loading ? (
        <div className="ep-skel">Loading…</div>
      ) : err ? (
        <div className="ep-err">{err}</div>
      ) : !task ? (
        <div className="ep-empty">Task not found.</div>
      ) : (
        <div className="ep-task">
          {/* Markdown-теорія */}
          <div className="ep-theory">
            {task.content ? (
              <SectionContent content={task.content} />
            ) : (
              <div className="ep-empty muted">Немає теоретичного контенту.</div>
            )}
            {task.description && (
              <div className="ep-desc">
                <SectionContent content={task.description} />
              </div>
            )}
          </div>

          {/* Практика */}
          <div className="ep-practice">
            {q ? (
              <>
                {/* якщо gap-inline — q.question_text стане частиною інлайну, тому заголовок показуємо умовно */}
                {(taskType !== "gap_fill" || !hasInlineGaps(q.question_text)) && (
                  <p className="ep-qtext">{q.question_text}</p>
                )}

                {renderQuestionBody(q)}

                <div className="ep-controls">
                  <button
                    className="ep-ghost"
                    disabled={curr === 0}
                    onClick={() => setCurr((i) => Math.max(0, i - 1))}
                  >
                    ⬅ Prev
                  </button>
                  <button
                    className="ep-ghost"
                    disabled={curr === questions.length - 1}
                    onClick={() =>
                      setCurr((i) => (i < questions.length - 1 ? i + 1 : i))
                    }
                  >
                    Next ➡
                  </button>
                  {curr === questions.length - 1 && (
                    <button className="ep-primary" onClick={submit}>
                      Submit ✅
                    </button>
                  )}
                </div>

                {submitMsg && (
                  <div className="ep-note">
                    {submitMsg}
                    {resultMeta && (
                      <div className="ep-score">
                        Score: {resultMeta.correct}/{resultMeta.total}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="ep-empty">Питання відсутні.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
