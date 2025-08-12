// src/pages/AllClassesPage.jsx
import React, { useEffect, useState } from "react";
import { API_URL } from "../../config";
import "./AllClassesPage.css";

const PATHS = {
  base: `${API_URL}/classrooms/classrooms`,
  lessons: `${API_URL}/lessons/lessons`,
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function AllClassesPage() {
  const [rows, setRows] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [edit, setEdit] = useState(null); // class object for modal

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [clsRes, lesRes] = await Promise.all([
        fetch(`${PATHS.base}/`, { headers: authHeaders() }),
        fetch(`${PATHS.lessons}/`, { headers: authHeaders() }),
      ]);
      const classes = await clsRes.json().catch(() => []);
      const lessonsData = await lesRes.json().catch(() => []);
      if (!clsRes.ok) throw new Error(classes?.detail || "Failed to load classes");
      if (!lesRes.ok) throw new Error(lessonsData?.detail || "Failed to load lessons");
      setRows(Array.isArray(classes) ? classes : []);
      setLessons(Array.isArray(lessonsData) ? lessonsData : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateClass = async (id, payload) => {
    const res = await fetch(`${PATHS.base}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to update class");
    return data;
  };

  const deleteClass = async (id) => {
    const res = await fetch(`${PATHS.base}/${id}`, {
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
    const res = await fetch(`${PATHS.base}/${classroom_id}/set-lesson/${lesson_id}`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to set current lesson");
    return data;
  };

  const handleSave = async () => {
    try {
      await updateClass(edit.id, {
        name: edit.name,
        description: edit.description,
        teacher_id: edit.teacher_id,
        level: edit.level,
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

  const quickSetLesson = async (id, lessonId) => {
    try {
      await setCurrentLesson(id, lessonId);
      setMsg("Current lesson set.");
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
          <div>Level</div>
          <div>Teacher ID</div>
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
              <div>{r.level}</div>
              <div>{r.teacher_id ?? "—"}</div>
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
                <input value={edit.name || ""} onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} />
              </label>
              <label>
                <span>Level</span>
                <select
                  value={edit.level || "A1"}
                  onChange={(e) => setEdit((s) => ({ ...s, level: e.target.value }))}
                >
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-2">
                <span>Description</span>
                <input
                  value={edit.description || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                />
              </label>
              <label className="col-2">
                <span>Teacher ID</span>
                <input
                  type="number"
                  value={edit.teacher_id ?? ""}
                  onChange={(e) => setEdit((s) => ({ ...s, teacher_id: Number(e.target.value) }))}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="btn primary" onClick={handleSave}>Save</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
