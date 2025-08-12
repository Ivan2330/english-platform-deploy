// src/pages/CreateUserPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./CreateUserPage.css";

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SUBSCRIPTIONS = ["group", "individual"];
const STAFF_STATUSES = ["admin", "teacher"];

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student"); // student | staff
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone_number: "",
    password: "",
    profile_image: "",
    // student
    age: "",
    subscription_type: SUBSCRIPTIONS[0],
    lesson_balance: "",
    level: ENGLISH_LEVELS[0],
    // staff
    status: STAFF_STATUSES[1],
    staff_level: ENGLISH_LEVELS[0],
  });

  const canSubmit = useMemo(() => {
    if (!form.username || !form.email || !form.phone_number || !form.password) return false;
    if (role === "student") return !!form.age && !!form.subscription_type && !!form.level;
    if (role === "staff") return !!form.status && !!form.staff_level;
    return false;
  }, [form, role]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const postJSON = async (url, body) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || `Failed: ${res.status}`);
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (role === "student") {
        // ДУБЛІ ПРЕФІКСІВ ЗАЛИШЕНО
        await postJSON(`${API_URL}/students/students/`, {
          username: form.username,
          email: form.email,
          phone_number: form.phone_number,
          password: form.password,
          profile_image: form.profile_image || null,
          age: Number(form.age),
          subscription_type: form.subscription_type,
          lesson_balance: form.lesson_balance === "" ? null : Number(form.lesson_balance),
          level: form.level,
          role: "student",
        });
        setMsg("Student created successfully.");
      } else {
        await postJSON(`${API_URL}/staff/staff/`, {
          username: form.username,
          email: form.email,
          phone_number: form.phone_number,
          password: form.password,
          profile_image: form.profile_image || null,
          level: form.staff_level,
          role: "staff",
          status: form.status,
        });
        setMsg("Staff created successfully.");
      }
      setTimeout(() => navigate("/users"), 700);
    } catch (e2) {
      setErr(e2?.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-wrap">
      <div className="create-head">
        <h2>Create User</h2>
        <div className="segmented">
          <button className={`seg-btn ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>
            Student
          </button>
          <button className={`seg-btn ${role === "staff" ? "active" : ""}`} onClick={() => setRole("staff")}>
            Staff
          </button>
        </div>
      </div>

      <form className="create-form" onSubmit={handleSubmit}>
        <div className="grid-2">
          <label>
            <span>Username</span>
            <input name="username" value={form.username} onChange={onChange} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone_number" value={form.phone_number} onChange={onChange} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={onChange} required />
          </label>
          <label className="col-2">
            <span>Profile image (URL, optional)</span>
            <input name="profile_image" value={form.profile_image} onChange={onChange} placeholder="https://..." />
          </label>

          {role === "student" && (
            <>
              <label>
                <span>Age</span>
                <input type="number" min={3} name="age" value={form.age} onChange={onChange} required />
              </label>
              <label>
                <span>Subscription</span>
                <select name="subscription_type" value={form.subscription_type} onChange={onChange}>
                  {SUBSCRIPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Lesson balance</span>
                <input
                  type="number"
                  name="lesson_balance"
                  value={form.lesson_balance}
                  onChange={onChange}
                  placeholder="(optional)"
                />
              </label>
              <label>
                <span>Level</span>
                <select name="level" value={form.level} onChange={onChange}>
                  {ENGLISH_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {role === "staff" && (
            <>
              <label>
                <span>Status</span>
                <select name="status" value={form.status} onChange={onChange}>
                  {STAFF_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Teaching Level</span>
                <select name="staff_level" value={form.staff_level} onChange={onChange}>
                  {ENGLISH_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="form-actions">
          <button className="btn primary" disabled={!canSubmit || loading}>
            {loading ? "Saving..." : "Create"}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate("/admin-dashboard")}>
            Cancel
          </button>
        </div>

        {msg && <div className="alert success">{msg}</div>}
        {err && <div className="alert error">{err}</div>}
      </form>
    </div>
  );
}
