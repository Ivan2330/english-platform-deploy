// src/pages/CreateClassPage.jsx
import React, { useState } from "react";
import { API_URL } from "../../config";
import "./CreateClassPage.css";

const PATHS = {
  base: `${API_URL}/classrooms/classrooms`,
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function CreateClassPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    teacher_id: "",
    level: "A1",
  });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const createClass = async (payload) => {
    const res = await fetch(`${PATHS.base}/`, {
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
        description: form.description || null,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
        level: form.level,
      };
      await createClass(payload);
      setMsg("Classroom created ✅");
      setForm({ name: "", description: "", teacher_id: "", level: "A1" });
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
        <label>
          <span>Description</span>
          <input name="description" value={form.description} onChange={onChange} />
        </label>
        <div className="grid-2">
          <label>
            <span>Teacher ID</span>
            <input
              name="teacher_id"
              type="number"
              value={form.teacher_id}
              onChange={onChange}
              placeholder="(optional)"
            />
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

        <div className="actions">
          <button className="btn primary" disabled={loading}>
            {loading ? "Saving..." : "Create"}
          </button>
        </div>

        {msg && <div className="alert success">{msg}</div>}
        {err && <div className="alert error">{err}</div>}
      </form>
    </div>
  );
}
