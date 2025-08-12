// src/pages/UsersListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./UsersListPage.css";
import { API_URL } from "../../config";

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SUBSCRIPTIONS = ["group", "individual"];
const STAFF_STATUSES = ["admin", "teacher"];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

// ------- API (з дублікатами префіксів) -------
const api = {
  // STUDENTS
  listStudents: async () => {
    const res = await fetch(`${API_URL}/students/students/`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.detail || "Failed to fetch students");
    return data;
  },
  getStudent: async (id) => {
    const res = await fetch(`${API_URL}/students/students/${id}`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to fetch student");
    return data;
  },
  updateStudent: async (id, body) => {
    const res = await fetch(`${API_URL}/students/students/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to update student");
    return data;
  },
  patchStudentLevel: async (id, level) => {
    const res = await fetch(`${API_URL}/students/students/${id}/level`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ level }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to patch level");
    return data;
  },
  patchStudentSubscription: async (id, subscription_type) => {
    const res = await fetch(`${API_URL}/students/students/${id}/subscription`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ subscription_type }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to patch subscription");
    return data;
  },
  patchStudentBalance: async (id, lesson_balance) => {
    const res = await fetch(`${API_URL}/students/students/${id}/balance`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ lesson_balance }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to patch balance");
    return data;
  },
  deleteStudent: async (id) => {
    const res = await fetch(`${API_URL}/students/students/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || "Failed to delete student");
    }
    return true;
  },

  // STAFF
  listStaff: async () => {
    const res = await fetch(`${API_URL}/staff/staff/`, { headers: authHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data?.detail || "Failed to fetch staff");
    return data;
  },
  getStaff: async (id) => {
    const res = await fetch(`${API_URL}/staff/staff/${id}`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to fetch staff");
    return data;
  },
  updateStaff: async (id, body) => {
    const res = await fetch(`${API_URL}/staff/staff/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Failed to update staff");
    return data;
  },
  deleteStaff: async (id) => {
    const res = await fetch(`${API_URL}/staff/staff/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || "Failed to delete staff");
    }
    return true;
  },
};

export default function UsersListPage() {
  const [tab, setTab] = useState("students"); // students | staff
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const [filter, setFilter] = useState({ q: "", level: "", status: "", subscription: "" });

  const [edit, setEdit] = useState(null); // {type,id,data}
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = tab === "students" ? await api.listStudents() : await api.listStaff();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [tab]);

  const filtered = useMemo(() => {
    let rows = [...items];
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.username?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone_number?.toLowerCase().includes(q)
      );
    }
    if (tab === "students") {
      if (filter.level) rows = rows.filter((r) => r.level === filter.level);
      if (filter.subscription) rows = rows.filter((r) => (r.subscription_type || "") === filter.subscription);
    } else {
      if (filter.level) rows = rows.filter((r) => (r.level || "") === filter.level);
      if (filter.status) rows = rows.filter((r) => (r.status || "") === filter.status);
    }
    return rows;
  }, [items, filter, tab]);

  const openEdit = async (type, id) => {
    setErr(null);
    setMsg(null);
    try {
      const data = type === "student" ? await api.getStudent(id) : await api.getStaff(id);
      setEdit({ type, id, data: data || {} });
    } catch (e) {
      setErr(e?.message || "Failed to open user.");
    }
  };

  const closeEdit = () => setEdit(null);

  const saveEdit = async () => {
    if (!edit) return;
    setErr(null);
    setMsg(null);
    try {
      if (edit.type === "student") {
        await api.updateStudent(edit.id, {
          username: edit.data.username,
          email: edit.data.email,
          phone_number: edit.data.phone_number,
          profile_image: edit.data.profile_image,
          subscription_type: edit.data.subscription_type,
          level: edit.data.level,
          age: edit.data.age,
        });
        setMsg("Student updated.");
      } else {
        await api.updateStaff(edit.id, {
          username: edit.data.username,
          email: edit.data.email,
          phone_number: edit.data.phone_number,
          profile_image: edit.data.profile_image,
          level: edit.data.level,
          status: edit.data.status,
          is_active: edit.data.is_active,
        });
        setMsg("Staff updated.");
      }
      await load();
      closeEdit();
    } catch (e) {
      setErr(e?.message || "Update failed.");
    }
  };

  const quickPatch = async (type, id, field, value) => {
    try {
      if (type === "student") {
        if (field === "level") await api.patchStudentLevel(id, value);
        else if (field === "subscription_type") await api.patchStudentSubscription(id, value);
        else if (field === "lesson_balance") await api.patchStudentBalance(id, Number(value));
        setMsg("Updated.");
      }
      await load();
    } catch (e) {
      setErr(e?.message || "Quick update failed.");
    }
  };

  const remove = async (type, id) => {
    if (!window.confirm("Видалити користувача?")) return;
    try {
      if (type === "student") await api.deleteStudent(id);
      else await api.deleteStaff(id);
      setMsg("User deleted.");
      await load();
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    }
  };

  return (
    <div className="list-wrap">
      <div className="list-head">
        <h2>Users</h2>
        <div className="segmented">
          <button className={`seg-btn ${tab === "students" ? "active" : ""}`} onClick={() => setTab("students")}>
            Students
          </button>
          <button className={`seg-btn ${tab === "staff" ? "active" : ""}`} onClick={() => setTab("staff")}>
            Staff
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          placeholder="Search (name, email, phone)"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <select value={filter.level} onChange={(e) => setFilter({ ...filter, level: e.target.value })}>
          <option value="">Level</option>
          {ENGLISH_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        {tab === "students" ? (
          <select
            value={filter.subscription}
            onChange={(e) => setFilter({ ...filter, subscription: e.target.value })}
          >
            <option value="">Subscription</option>
            {SUBSCRIPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Status</option>
            {STAFF_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <button className="btn ghost" onClick={() => setFilter({ q: "", level: "", status: "", subscription: "" })}>
          Reset
        </button>
      </div>

      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      <div className="table">
        <div className="thead">
          <div>Username</div>
          <div>Email</div>
          <div>Phone</div>
          {tab === "students" && <div>Level</div>}
          {tab === "students" && <div>Subscription</div>}
          {tab === "students" && <div>Balance</div>}
          {tab === "staff" && <div>Status</div>}
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Нічого не знайдено</div>
        ) : (
          filtered.map((row) => (
            <div className="trow" key={`${tab}-${row.id}`}>
              <div className="cell-nowrap">
                <div className="name">{row.username}</div>
                <div className="meta">ID #{row.id}</div>
              </div>
              <div>{row.email}</div>
              <div>{row.phone_number}</div>

              {tab === "students" && (
                <div>
                  <select
                    value={row.level || ""}
                    onChange={(e) => quickPatch("student", row.id, "level", e.target.value)}
                  >
                    {ENGLISH_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tab === "students" && (
                <div>
                  <select
                    value={row.subscription_type || ""}
                    onChange={(e) => quickPatch("student", row.id, "subscription_type", e.target.value)}
                  >
                    {SUBSCRIPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tab === "students" && (
                <div>
                  <input
                    type="number"
                    value={row.lesson_balance ?? 0}
                    onChange={(e) => quickPatch("student", row.id, "lesson_balance", e.target.value)}
                  />
                </div>
              )}

              {tab === "staff" && (
                <div>
                  <select
                    value={row.status || "teacher"}
                    onChange={(e) =>
                      setItems((prev) => prev.map((it) => (it.id === row.id ? { ...it, status: e.target.value } : it)))
                    }
                    onBlur={async (e) => {
                      try {
                        await api.updateStaff(row.id, { ...row, status: e.target.value });
                        setMsg("Staff updated.");
                      } catch (er) {
                        setErr(er?.message || "Update failed.");
                      }
                    }}
                  >
                    {STAFF_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="actions">
                <button className="btn small" onClick={() => openEdit(tab === "students" ? "student" : "staff", row.id)}>
                  Edit
                </button>
                <button
                  className="btn danger small"
                  onClick={() => remove(tab === "students" ? "student" : "staff", row.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {edit && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Edit {edit.type === "student" ? "Student" : "Staff"}</h3>
              <button className="x" onClick={closeEdit}>
                ×
              </button>
            </div>

            <div className="grid-2">
              <label>
                <span>Username</span>
                <input
                  value={edit.data.username || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, username: e.target.value } }))}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  value={edit.data.email || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, email: e.target.value } }))}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  value={edit.data.phone_number || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, phone_number: e.target.value } }))}
                />
              </label>
              <label>
                <span>Profile image</span>
                <input
                  value={edit.data.profile_image || ""}
                  onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, profile_image: e.target.value } }))}
                />
              </label>

              {edit.type === "student" ? (
                <>
                  <label>
                    <span>Age</span>
                    <input
                      type="number"
                      value={edit.data.age ?? ""}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, data: { ...s.data, age: Number(e.target.value) } }))
                      }
                    />
                  </label>
                  <label>
                    <span>Subscription</span>
                    <select
                      value={edit.data.subscription_type || ""}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, data: { ...s.data, subscription_type: e.target.value } }))
                      }
                    >
                      {SUBSCRIPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Level</span>
                    <select
                      value={edit.data.level || ""}
                      onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, level: e.target.value } }))}
                    >
                      {ENGLISH_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Lesson balance</span>
                    <input
                      type="number"
                      value={edit.data.lesson_balance ?? 0}
                      onChange={(e) =>
                        setEdit((s) => ({
                          ...s,
                          data: { ...s.data, lesson_balance: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>Status</span>
                    <select
                      value={edit.data.status || "teacher"}
                      onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, status: e.target.value } }))}
                    >
                      {STAFF_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Teaching Level</span>
                    <select
                      value={edit.data.level || ""}
                      onChange={(e) => setEdit((s) => ({ ...s, data: { ...s.data, level: e.target.value } }))}
                    >
                      {ENGLISH_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Is Active</span>
                    <select
                      value={String(edit.data.is_active ?? true)}
                      onChange={(e) =>
                        setEdit((s) => ({ ...s, data: { ...s.data, is_active: e.target.value === "true" } }))
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                </>
              )}
            </div>

            <div className="form-actions">
              <button className="btn primary" onClick={saveEdit}>
                Save
              </button>
              <button className="btn ghost" onClick={closeEdit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
