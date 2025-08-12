// src/pages/CreateClassPage.jsx
import React, { useEffect, useState } from "react";
import { API_URL } from "../../config";
import "./CreateClassPage.css";

const PATHS = {
  classes: `${API_URL}/classrooms/classrooms`,
  staff: `${API_URL}/staff/staff`,
  students: `${API_URL}/students/students`,
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function CreateClassPage() {
  const [form, setForm] = useState({
    name: "",
    type: "individual", // backend default: individual
    description: "",
    teacher_id: "",
    student_id: "", // optional
    level: "A1",
  });

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  // load teachers (staff) & students
  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, studRes] = await Promise.all([
          fetch(`${PATHS.staff}/`, { headers: authHeaders() }),
          fetch(`${PATHS.students}/`, { headers: authHeaders() }),
        ]);

        const staffData = await staffRes.json().catch(() => []);
        const studData = await studRes.json().catch(() => []);

        if (!staffRes.ok) throw new Error(staffData?.detail || "Failed to load staff");
        if (!studRes.ok) throw new Error(studData?.detail || "Failed to load students");

        // Вчителі: staff зі статусом teacher або admin
        const onlyTeachers = Array.isArray(staffData)
          ? staffData.filter((s) => (s?.status === "teacher" || s?.status === "admin"))
          : [];
        setTeachers(onlyTeachers);

        setStudents(Array.isArray(studData) ? studData : []);
      } catch (e) {
        setErr(e.message);
      }
    };
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const createClass = async (payload) => {
    const res = await fetch(`${PATHS.classes}/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to create classroom");
    return data;
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        description: form.description || null,
        teacher_id: Number(form.teacher_id),        // required by ClassroomCreate
        student_id: form.student_id ? Number(form.student_id) : null, // optional
      };
      await createClass(payload);
      setMsg("Classroom created ✅");
      setForm({
        name: "",
        type: "individual",
        description: "",
        teacher_id: "",
        student_id: "",
        level: "A1",
      });
    } catch (er) {
      setErr(er.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cc-wrap">
      <h2>Create Class</h2>
      <form className="cc-form" onSubmit={submit}>
        <label>
          <span>Name</span>
          <input name="name" value={form.name} onChange={onChange} required />
        </label>

        <div className="grid-2">
          <label>
            <span>Type</span>
            <select name="type" value={form.type} onChange={onChange}>
              <option value="individual">individual</option>
              <option value="group">group</option>
            </select>
          </label>

          <label>
            <span>Level</span>
            <select name="level" value={form.level} onChange={onChange}>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="col-2">
          <span>Description</span>
          <input name="description" value={form.description} onChange={onChange} />
        </label>

        <div className="grid-2">
          <label>
            <span>Teacher</span>
            <select
              name="teacher_id"
              value={form.teacher_id}
              onChange={onChange}
              required
            >
              <option value="">Select teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.username} ({t.status})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Student (optional)</span>
            <select
              name="student_id"
              value={form.student_id}
              onChange={onChange}
            >
              <option value="">—</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.username} • {s.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="actions">
          <button className="btn primary" disabled={loading}>
            {loading ? "Saving..." : "Create"}
          </button>
        </div>

        {msg && <div className="alert success">{msg}</div>}
        {err && <div className="alert error">{err}</div>}

        {form.type === "group" && (
          <div className="hint">
            Зараз бекенд підтримує **одного** студента через `student_id`. Для повноцінних груп потрібна окрема звʼязка many-to-many.
          </div>
        )}
      </form>
    </div>
  );
}
