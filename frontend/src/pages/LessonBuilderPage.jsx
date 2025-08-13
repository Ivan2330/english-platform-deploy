// src/pages/LessonBuilderPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../config";
import "./LessonBuilderPage.css";

/**
 * Конструктор уроків:
 *  - CRUD уроків
 *  - переліки секцій/завдань уроку (universal tasks)
 *  - CRUD завдання (section)
 *  - CRUD питань (для конкретного task)
 *
 * Префікси дубльовані, як просив.
 */
const PATHS = {
  lessons: `${API_URL}/lessons/lessons`,
  tasks: `${API_URL}/universal-tasks/tasks`,
  questions: `${API_URL}/questions/questions`,
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function LessonBuilderPage() {
  // lessons
  const [lessons, setLessons] = useState([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonErr, setLessonErr] = useState(null);
  const [msg, setMsg] = useState(null);

  // selected lesson
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: "", level: "A1" });

  // tasks for selected lesson
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({
    control_type: "grammar",
    task_type: "true_false",
    title: "",
    description: "",
    content: "",
    media_url: "",
    topic: "",
    word_list: "",
    visibility: "global",
  });
  const [editingTask, setEditingTask] = useState(null);

  // questions for selected task
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({
    question_text: "",
    correct_answer: "",
    explanation: "",
    order: 1,
    optionsA: "",
    optionsB: "",
    optionsC: "",
    optionsD: "",
  });
  const [editingQuestion, setEditingQuestion] = useState(null);

  const canCreateLesson = useMemo(() => !!lessonForm.title && !!lessonForm.level, [lessonForm]);

  // ---- API helpers ----
  const fetchJSON = async (url, init = {}) => {
    const res = await fetch(url, { headers: authHeaders(), ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || `Request failed ${res.status}`);
    return data;
    };

  // LESSONS
  const loadLessons = async () => {
    setLessonLoading(true);
    setLessonErr(null);
    try {
      const data = await fetch(`${PATHS.lessons}/`, { headers: authHeaders() }).then((r) => r.json());
      setLessons(Array.isArray(data) ? data : []);
    } catch (e) {
      setLessonErr(e.message);
    } finally {
      setLessonLoading(false);
    }
  };

  const createLesson = async () => {
    const payload = { title: lessonForm.title, level: lessonForm.level };
    await fetchJSON(`${PATHS.lessons}/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg("Lesson created.");
    setLessonForm({ title: "", level: "A1" });
    await loadLessons();
  };

  const updateLesson = async (lesson) => {
    const payload = { title: lesson.title, level: lesson.level };
    await fetchJSON(`${PATHS.lessons}/${lesson.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setMsg("Lesson updated.");
    await loadLessons();
  };

  const deleteLesson = async (id) => {
    await fetchJSON(`${PATHS.lessons}/${id}`, { method: "DELETE" });
    setMsg("Lesson deleted.");
    if (currentLesson?.id === id) {
      setCurrentLesson(null);
      setTasks([]);
    }
    await loadLessons();
  };

  const loadLessonTasks = async (lessonId) => {
    const data = await fetchJSON(`${PATHS.lessons}/${lessonId}/tasks/`);
    setTasks(Array.isArray(data) ? data : []);
  };

  // TASKS
  const createTask = async () => {
    if (!currentLesson) return;
    const payload = {
      lesson_id: currentLesson.id,
      ...taskForm,
    };
    await fetchJSON(`${PATHS.tasks}/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg("Task created.");
    setTaskForm({
      control_type: "grammar",
      task_type: "true_false",
      title: "",
      description: "",
      content: "",
      media_url: "",
      topic: "",
      word_list: "",
      visibility: "global",
    });
    await loadLessonTasks(currentLesson.id);
  };

  const saveTask = async () => {
    if (!editingTask) return;
    const payload = {
      title: editingTask.title,
      description: editingTask.description,
      content: editingTask.content,
      media_url: editingTask.media_url,
      topic: editingTask.topic,
      word_list: editingTask.word_list,
      visibility: editingTask.visibility,
    };
    await fetchJSON(`${PATHS.tasks}/${editingTask.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setMsg("Task updated.");
    setEditingTask(null);
    await loadLessonTasks(currentLesson.id);
  };

  const deleteTask = async (taskId) => {
    await fetchJSON(`${PATHS.tasks}/${taskId}`, { method: "DELETE" });
    setMsg("Task deleted.");
    if (editingTask?.id === taskId) setEditingTask(null);
    await loadLessonTasks(currentLesson.id);
    setQuestions([]);
  };

  // QUESTIONS
  const loadTaskQuestions = async (taskId) => {
    const data = await fetchJSON(`${PATHS.questions}/tasks/${taskId}/questions/`);
    setQuestions(Array.isArray(data) ? data : []);
  };

  const createQuestion = async (taskId) => {
    const options = {};
    if (qForm.optionsA) options["A"] = qForm.optionsA;
    if (qForm.optionsB) options["B"] = qForm.optionsB;
    if (qForm.optionsC) options["C"] = qForm.optionsC;
    if (qForm.optionsD) options["D"] = qForm.optionsD;

    const payload = {
      task_id: taskId,
      question_text: qForm.question_text,
      options: Object.keys(options).length ? options : null,
      correct_answer: qForm.correct_answer || null,
      explanation: qForm.explanation || null,
      order: Number(qForm.order || 1),
    };
    await fetchJSON(`${PATHS.questions}/tasks/${taskId}/questions/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg("Question created.");
    setQFormReset();
    await loadTaskQuestions(taskId);
  };

  const setQFormReset = () => {
    setQForm({
      question_text: "",
      correct_answer: "",
      explanation: "",
      order: 1,
      optionsA: "",
      optionsB: "",
      optionsC: "",
      optionsD: "",
    });
  };

  const saveQuestion = async () => {
    if (!editingQuestion) return;

    const options = editingQuestion.options || {};
    const payload = {
      question_text: editingQuestion.question_text,
      options,
      correct_answer: editingQuestion.correct_answer,
      explanation: editingQuestion.explanation,
      order: editingQuestion.order,
    };
    await fetchJSON(`${PATHS.questions}/${editingQuestion.id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setMsg("Question updated.");
    setEditingQuestion(null);
    if (editingTask) await loadTaskQuestions(editingTask.id);
  };

  const deleteQuestion = async (questionId) => {
    await fetchJSON(`${PATHS.questions}/${questionId}/`, { method: "DELETE" });
    setMsg("Question deleted.");
    if (editingTask) await loadTaskQuestions(editingTask.id);
  };

  // init
  useEffect(() => { loadLessons(); }, []);

  useEffect(() => {
    if (currentLesson) loadLessonTasks(currentLesson.id);
    else setTasks([]);
  }, [currentLesson]);

  return (
    <div className="lb-wrap">
      <h2>Lesson Builder</h2>
      {msg && <div className="alert success">{msg}</div>}
      {lessonErr && <div className="alert error">{lessonErr}</div>}

      {/* LESSONS PANEL */}
      <div className="panel">
        <div className="panel-head"><h3>Lessons</h3></div>
        <div className="panel-body">
          <div className="grid-3">
            <div className="card">
              <h4>Create Lesson</h4>
              <label>
                <span>Title</span>
                <input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((s) => ({ ...s, title: e.target.value }))}
                />
              </label>
              <label>
                <span>Level</span>
                <select
                  value={lessonForm.level}
                  onChange={(e) => setLessonForm((s) => ({ ...s, level: e.target.value }))}
                >
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn primary" disabled={!canCreateLesson} onClick={createLesson}>
                Create
              </button>
            </div>

            <div className="card span-2">
              <h4>All Lessons</h4>
              <div className="list">
                {lessonLoading ? (
                  <div className="muted">Loading...</div>
                ) : lessons.length === 0 ? (
                  <div className="muted">No lessons yet</div>
                ) : (
                  lessons.map((l) => (
                    <div
                      className={`row ${currentLesson?.id === l.id ? "active" : ""}`}
                      key={l.id}
                      onClick={() => setCurrentLesson(l)}
                    >
                      <div>
                        <b>{l.title}</b> <span className="pill">{l.level}</span>
                      </div>
                      <div className="row-actions">
                        <button
                          className="btn small"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = { ...l };
                            const title = prompt("Title:", l.title);
                            if (title == null) return;
                            updated.title = title;
                            const level = prompt("Level (A1..C2):", l.level);
                            if (level == null) return;
                            updated.level = level;
                            updateLesson(updated);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete lesson?")) deleteLesson(l.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TASKS (sections) */}
      {currentLesson && (
        <div className="panel">
          <div className="panel-head"><h3>Sections / Tasks for: {currentLesson.title}</h3></div>
          <div className="panel-body">
            <div className="grid-3">
              <div className="card">
                <h4>Create Task</h4>
                <label>
                  <span>Title (section name)</span>
                  <input value={taskForm.title} onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))} />
                </label>
                <label>
                  <span>Control Type</span>
                  <select
                    value={taskForm.control_type}
                    onChange={(e) => setTaskForm((s) => ({ ...s, control_type: e.target.value }))}
                  >
                    {["listening", "reading", "writing", "vocabulary", "grammar"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Task Type</span>
                  <select
                    value={taskForm.task_type}
                    onChange={(e) => setTaskForm((s) => ({ ...s, task_type: e.target.value }))}
                  >
                    {["multiple_choice", "true_false", "gap_fill", "open_text"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Description</span>
                  <input value={taskForm.description} onChange={(e) => setTaskForm((s) => ({ ...s, description: e.target.value }))} />
                </label>
                <label>
                  <span>Content</span>
                  <textarea rows={3} value={taskForm.content} onChange={(e) => setTaskForm((s) => ({ ...s, content: e.target.value }))} />
                </label>
                <label>
                  <span>Media URL</span>
                  <input value={taskForm.media_url} onChange={(e) => setTaskForm((s) => ({ ...s, media_url: e.target.value }))} />
                </label>
                <label>
                  <span>Topic</span>
                  <input value={taskForm.topic} onChange={(e) => setTaskForm((s) => ({ ...s, topic: e.target.value }))} />
                </label>
                <label>
                  <span>Word list</span>
                  <textarea rows={2} value={taskForm.word_list} onChange={(e) => setTaskForm((s) => ({ ...s, word_list: e.target.value }))} />
                </label>
                <label>
                  <span>Visibility</span>
                  <select
                    value={taskForm.visibility}
                    onChange={(e) => setTaskForm((s) => ({ ...s, visibility: e.target.value }))}
                  >
                    {["global", "class_specific", "private"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button className="btn primary" onClick={createTask}>Create Task</button>
              </div>

              <div className="card span-2">
                <h4>Tasks</h4>
                <div className="list">
                  {tasks.length === 0 ? (
                    <div className="muted">No tasks yet</div>
                  ) : (
                    tasks.map((t) => (
                      <div className={`row ${editingTask?.id === t.id ? "active" : ""}`} key={t.id}>
                        <div className="row-col">
                          <b>{t.title}</b>
                          <div className="meta2">{t.control_type} • {t.task_type} • {t.visibility}</div>
                        </div>
                        <div className="row-actions">
                          <button className="btn small" onClick={() => { setEditingTask(t); loadTaskQuestions(t.id); }}>
                            Edit
                          </button>
                          <button className="btn danger small" onClick={() => deleteTask(t.id)}>Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {editingTask && (
                  <div className="edit-block">
                    <h4>Edit Task: {editingTask.title}</h4>
                    <div className="grid-2">
                      <label>
                        <span>Title</span>
                        <input
                          value={editingTask.title || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, title: e.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Visibility</span>
                        <select
                          value={editingTask.visibility || "global"}
                          onChange={(e) => setEditingTask((s) => ({ ...s, visibility: e.target.value }))}
                        >
                          {["global", "class_specific", "private"].map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label className="col-2">
                        <span>Description</span>
                        <input
                          value={editingTask.description || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, description: e.target.value }))}
                        />
                      </label>
                      <label className="col-2">
                        <span>Content</span>
                        <textarea
                          rows={3}
                          value={editingTask.content || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, content: e.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Media URL</span>
                        <input
                          value={editingTask.media_url || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, media_url: e.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Topic</span>
                        <input
                          value={editingTask.topic || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, topic: e.target.value }))}
                        />
                      </label>
                      <label className="col-2">
                        <span>Word List</span>
                        <textarea
                          rows={2}
                          value={editingTask.word_list || ""}
                          onChange={(e) => setEditingTask((s) => ({ ...s, word_list: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="actions">
                      <button className="btn primary" onClick={saveTask}>Save Task</button>
                      <button className="btn ghost" onClick={() => setEditingTask(null)}>Close</button>
                    </div>

                    {/* QUESTIONS */}
                    <div className="q-panel">
                      <h4>Questions for task: {editingTask.title}</h4>
                      <div className="grid-2">
                        <label className="col-2">
                          <span>Question Text</span>
                          <textarea
                            rows={2}
                            value={qForm.question_text}
                            onChange={(e) => setQForm((s) => ({ ...s, question_text: e.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Correct Answer</span>
                          <input
                            value={qForm.correct_answer}
                            onChange={(e) => setQForm((s) => ({ ...s, correct_answer: e.target.value }))}
                            placeholder="A / B / C / D / true / false / text"
                          />
                        </label>
                        <label>
                          <span>Order</span>
                          <input
                            type="number"
                            value={qForm.order}
                            onChange={(e) => setQForm((s) => ({ ...s, order: Number(e.target.value) }))}
                          />
                        </label>
                        <label className="col-2">
                          <span>Explanation (optional)</span>
                          <input
                            value={qForm.explanation}
                            onChange={(e) => setQForm((s) => ({ ...s, explanation: e.target.value }))}
                          />
                        </label>

                        {/* Multiple choice options */}
                        <label>
                          <span>Option A</span>
                          <input value={qForm.optionsA} onChange={(e) => setQForm((s) => ({ ...s, optionsA: e.target.value }))} />
                        </label>
                        <label>
                          <span>Option B</span>
                          <input value={qForm.optionsB} onChange={(e) => setQForm((s) => ({ ...s, optionsB: e.target.value }))} />
                        </label>
                        <label>
                          <span>Option C</span>
                          <input value={qForm.optionsC} onChange={(e) => setQForm((s) => ({ ...s, optionsC: e.target.value }))} />
                        </label>
                        <label>
                          <span>Option D</span>
                          <input value={qForm.optionsD} onChange={(e) => setQForm((s) => ({ ...s, optionsD: e.target.value }))} />
                        </label>
                      </div>
                      <div className="actions">
                        <button className="btn" onClick={() => setQFormReset()}>Clear</button>
                        <button className="btn primary" onClick={() => createQuestion(editingTask.id)}>Add Question</button>
                      </div>

                      <div className="q-list">
                        {questions.length === 0 ? (
                          <div className="muted">No questions yet</div>
                        ) : (
                          questions
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((q) => (
                              <div className={`row ${editingQuestion?.id === q.id ? "active" : ""}`} key={q.id}>
                                <div className="row-col">
                                  <b>#{q.order}</b> {q.question_text}
                                  {q.options && (
                                    <div className="meta2">
                                      Options: {Object.entries(q.options).map(([k,v]) => `${k}:${v}`).join(" • ")}
                                    </div>
                                  )}
                                  {q.correct_answer && <div className="pill">Answer: {String(q.correct_answer)}</div>}
                                </div>
                                <div className="row-actions">
                                  <button className="btn small" onClick={() => setEditingQuestion(q)}>Edit</button>
                                  <button className="btn danger small" onClick={() => deleteQuestion(q.id)}>Delete</button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      {editingQuestion && (
                        <div className="edit-block">
                          <h4>Edit Question #{editingQuestion.id}</h4>
                          <div className="grid-2">
                            <label className="col-2">
                              <span>Text</span>
                              <textarea
                                rows={2}
                                value={editingQuestion.question_text || ""}
                                onChange={(e) => setEditingQuestion((s) => ({ ...s, question_text: e.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Order</span>
                              <input
                                type="number"
                                value={editingQuestion.order ?? 1}
                                onChange={(e) => setEditingQuestion((s) => ({ ...s, order: Number(e.target.value) }))}
                              />
                            </label>
                            <label>
                              <span>Correct Answer</span>
                              <input
                                value={editingQuestion.correct_answer || ""}
                                onChange={(e) => setEditingQuestion((s) => ({ ...s, correct_answer: e.target.value }))}
                              />
                            </label>
                            <label className="col-2">
                              <span>Explanation</span>
                              <input
                                value={editingQuestion.explanation || ""}
                                onChange={(e) => setEditingQuestion((s) => ({ ...s, explanation: e.target.value }))}
                              />
                            </label>

                            {/* options editor */}
                            {["A","B","C","D"].map((key) => (
                              <label key={key}>
                                <span>Option {key}</span>
                                <input
                                  value={(editingQuestion.options && editingQuestion.options[key]) || ""}
                                  onChange={(e) =>
                                    setEditingQuestion((s) => ({
                                      ...s,
                                      options: { ...(s.options || {}), [key]: e.target.value },
                                    }))
                                  }
                                />
                              </label>
                            ))}
                          </div>
                          <div className="actions">
                            <button className="btn primary" onClick={saveQuestion}>Save Question</button>
                            <button className="btn ghost" onClick={() => setEditingQuestion(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
