// src/pages/AllClassesPage.jsx
import React, { useEffect, useState } from "react";
import { API_URL } from "../../config";
import "./AllClassesPage.css";

const PATHS = {
  classes: `${API_URL}/classrooms/classrooms`,
  lessons: `${API_URL}/lessons/lessons`,
  students: `${API_URL}/students/students`,
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function AllClassesPage() {
  const [rows, setRows] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [edit, setEdit] = useState(null); // class object for modal

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [clsRes, lesRes, studRes] = await Promise.all([
        fetch(`${PATHS.classes}/`, { headers: authHeaders() }),
        fetch(`${PATHS.lessons}/`, { headers: authHeaders() }),
        fetch(`${PATHS.students}/`, { headers: authHeaders() }),
      ]);
      const classes = await clsRes.json().catch(() => []);
      const lessonsData = await lesRes.json().catch(() => []);
      const studentsData = await studRes.json().catch(() => []);
      if (!clsRes.ok) throw new Error(classes?.detail || "Failed to load classes");
      if (!lesRes.ok) throw new Error(lessonsData?.detail || "Failed to load lessons");
      if (!studRes.ok) throw new Error(studentsData?.detail || "Failed to load students");

      setRows(Array.isArray(classes) ? classes : []);
      setLessons(Array.isArray(lessonsData) ? lessonsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateClass = async (id, payload) => {
    const res = await fetch(`${PATHS.classes}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to update class");
    return data;
  };

  const deleteClass = async (id) => {
    const res = await fetch(`${PATHS.classes}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || "Failed to delete class");
    }
    return true;
  };

  const setCurrentLesson = async (classroom_id, lesson_id) => {
    const res = await fetch(`${PATHS.classes}/${classroom_id}/set-lesson/${lesson_id}`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to set current lesson");
    return data;
  };

  const quickSetLesson = async (id, lessonId) => {
    try {
      await setCurrentLesson(id, lessonId);
      setMsg("Current lesson set.");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  // NEW: quick set student
  const quickSetStudent = async (id, studentIdOrEmpty) => {
    try {
      const payload = { student_id: studentIdOrEmpty ? Number(studentIdOrEmpty) : null };
      await updateClass(id, payload);
      setMsg(studentIdOrEmpty ? "Student assigned." : "Student cleared.");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleSave = async () => {
    try {
      await updateClass(edit.id, {
        name: edit.name,
        description: edit.description,
        teacher_id: edit.teacher_id,
        student_id: edit.student_id ?? null,
        type: edit.type,
      });
      setMsg("Class updated.");
      setEdit(null);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete classroom?")) return;
    try {
      await deleteClass(id);
      setMsg("Class deleted.");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="ac-wrap">
      <h2>All Classes</h2>
      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      <div className="ac-table">
        <div className="thead">
          <div>Name</div>
          <div>Type</div>
          <div>Teacher ID</div>
          <div>Student</div>
          <div>Current Lesson</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="empty">Немає класів</div>
        ) : (
          rows.map((r) => (
            <div className="trow" key={r.id}>
              <div className="cell-nowrap">
                <div className="name">{r.name}</div>
                <div className="meta">#{r.id}</div>
              </div>
              <div>{r.type}</div>
              <div>{r.teacher_id ?? "—"}</div>

              {/* quick assign/clear student */}
              <div>
                <div className="student-inline">
                  <select
                    value={r.student_id ?? ""}
                    onChange={(e) => quickSetStudent(r.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.username} • {s.email}
                      </option>
                    ))}
                  </select>
                  {r.student_id && (
                    <button
                      className="btn ghost small"
                      onClick={() => quickSetStudent(r.id, "")}
                      title="Remove student"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <select
                  value={r.current_lesson_id ?? ""}
                  onChange={(e) => quickSetLesson(r.id, Number(e.target.value))}
                >
                  <option value="">—</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="actions">
                <button className="btn small" onClick={() => setEdit(r)}>Edit</button>
                <button className="btn danger small" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {edit && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Edit Class</h3>
              <button className="x" onClick={() => setEdit(null)}>×</button>
            </div>
            <div className="grid-2">
              <label>
                <span>Name</span>
                <input
                  value={edit.name || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  value={edit.type || "individual"}
                  onChange={(e) => setEdit((s) => ({ ...s, type: e.target.value }))}
                >
                  <option value="individual">individual</option>
                  <option value="group">group</option>
                </select>
              </label>
              <label className="col-2">
                <span>Description</span>
                <input
                  value={edit.description || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                />
              </label>
              <label>
                <span>Teacher ID</span>
                <input
                  type="number"
                  value={edit.teacher_id ?? ""}
                  onChange={(e) => setEdit((s) => ({ ...s, teacher_id: Number(e.target.value) }))}
                />
              </label>
              <label>
                <span>Student</span>
                <select
                  value={edit.student_id ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...s,
                      student_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">—</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.username} • {st.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-actions">
              <button className="btn primary" onClick={handleSave}>Save</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
            </div>

            {edit.type === "group" && (
              <div className="hint">
                Наразі можна обрати **одного** студента (`student_id`). Для множинних студентів потрібна зміна бекенду (many‑to‑many).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
