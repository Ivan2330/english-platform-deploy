import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentDashboard.css";
import { API_URL } from "../../config";

import logotype from "../assets/my_logo-1.svg";
import rocket from "../assets/rocket-svg.svg";
import phone_number from "../assets/phone-number.svg";
import telegram from "../assets/tel.svg";
import instagram from "../assets/instagram.svg";

/* --- Inline icons (без зайвих залежностей) --- */
const I = {
  home: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M19 3v18" /></svg>),
  mic: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>),
  clipboard: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="m9 12 2 2 4-4" /></svg>),
  wallet: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14" r="1" /></svg>),
  headset: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4" height="6" rx="1.5" /><rect x="17.5" y="13" width="4" height="6" rx="1.5" /><path d="M20 19a4 4 0 0 1-4 3h-2" /></svg>),
  chevron: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6" /></svg>),
};

/* Ініціали з імені: "student_user" → "SU", "Anna" → "AN" */
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const StudentDashboardPage = () => {
  const [studentData, setStudentData] = useState(null);
  const [studentClass, setStudentClass] = useState(null);
  const [activeTab, setActiveTab] = useState("learning");
  const [contactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();

  // Закриття контактів при кліку поза ними (працює для кількох інстансів)
  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest(".pa-contact")) setContactOpen(false);
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [studentRes, classesRes] = await Promise.all([
          axios.get(`${API_URL}/students/students/me`, { headers }),
          axios.get(`${API_URL}/classrooms/classrooms/`, { headers }),
        ]);

        setStudentData(studentRes.data);

        const matchedClass = classesRes.data.find(
          (cls) =>
            cls.students?.some((s) => s.id === studentRes.data.id) ||
            cls.student_id === studentRes.data.id
        );
        setStudentClass(matchedClass);
      } catch (error) {
        console.error("Failed to fetch student dashboard info:", error);
      }
    };
    fetchStudentData();
  }, []);

  const openClass = () => {
    if (studentClass) navigate(`/classroom/${studentClass.id}`);
  };
  const openPractice = () => navigate("/eng-practice");

  const username = studentData?.username || "Student";
  const level = studentData?.level || "—";
  const balance = studentData?.lesson_balance ?? 0;

  const contactDropdown = (placement) => (
    <div className={`pa-contact ${placement} ${contactOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="pa-contact-btn"
        onClick={() => setContactOpen((o) => !o)}
        aria-expanded={contactOpen}
      >
        <I.headset />
        <span>Contact us</span>
      </button>
      <ul className="pa-contact-menu" role="menu">
        <li role="menuitem"><img src={phone_number} alt="" /> +38 099 179 70 47</li>
        <li role="menuitem"><img src={telegram} alt="" /> @primeacademy</li>
        <li role="menuitem"><img src={instagram} alt="" /> @primeacademy</li>
      </ul>
    </div>
  );

  return (
    <div className="pa-dash">
      {/* ===== Desktop sidebar ===== */}
      <aside className="pa-side">
        <div className="pa-brand">
          <img src={logotype} alt="Prime Academy" />
          <span>Prime Academy</span>
        </div>

        <nav className="pa-nav">
          <button className="pa-nav-item is-active"><I.home /> Dashboard</button>
          <button className="pa-nav-item" onClick={openClass} disabled={!studentClass}>
            <I.book /> Class Mode
          </button>
          <button className="pa-nav-item pa-soon" type="button">
            <I.mic /> Speaking Club <span className="pa-soon-tag">soon</span>
          </button>
          <button className="pa-nav-item" onClick={openPractice}><I.clipboard /> Eng Practice</button>
        </nav>

        <div className="pa-side-foot">{contactDropdown("pa-contact--side")}</div>
      </aside>

      {/* ===== Mobile top bar ===== */}
      <div className="pa-topbar">
        <div className="pa-brand">
          <img src={logotype} alt="Prime Academy" />
          <span>Prime Academy</span>
        </div>
        {contactDropdown("pa-contact--top")}
      </div>

      {/* ===== Main ===== */}
      <main className="pa-main">
        <div className="pa-welcome">
          <div className="pa-welcome-left">
            <div className="pa-avatar">{getInitials(username)}</div>
            <div>
              <div className="pa-name-row">
                <span className="pa-name">{username}</span>
                <span className="pa-level">{level}<img src={rocket} alt="" /></span>
              </div>
              <div className="pa-greeting">Welcome back — ready to learn?</div>
            </div>
          </div>

          <div className="pa-balance">
            <I.wallet />
            <div>
              <div className="pa-balance-num">{balance}</div>
              <div className="pa-balance-label">Lesson Balance</div>
            </div>
          </div>
        </div>

        <div className="pa-tabs">
          <button
            className={`pa-tab ${activeTab === "learning" ? "is-active" : ""}`}
            onClick={() => setActiveTab("learning")}
          >
            Learning
          </button>
          <button
            className={`pa-tab ${activeTab === "additional" ? "is-active" : ""}`}
            onClick={() => setActiveTab("additional")}
          >
            Additional
          </button>
        </div>

        {activeTab === "learning" ? (
          <div className="pa-cards">
            {studentClass && (
              <button className="pa-card" onClick={openClass}>
                <span className="pa-card-ic pa-ic-violet"><I.book /></span>
                <span className="pa-card-title">Class Mode</span>
                <span className="pa-card-sub">Join your live lessons</span>
                <span className="pa-card-go">Open <I.chevron /></span>
              </button>
            )}

            <button className="pa-card pa-soon" type="button">
              <span className="pa-card-ic pa-ic-pink"><I.mic /></span>
              <span className="pa-card-title">Speaking Club <span className="pa-soon-tag">soon</span></span>
              <span className="pa-card-sub">Practice speaking with others</span>
            </button>

            <button className="pa-card" onClick={openPractice}>
              <span className="pa-card-ic pa-ic-purple"><I.clipboard /></span>
              <span className="pa-card-title">Eng Practice</span>
              <span className="pa-card-sub">Self-paced exercises and quizzes</span>
              <span className="pa-card-go">Open <I.chevron /></span>
            </button>
          </div>
        ) : (
          <div className="pa-empty">
            <I.clipboard />
            <p>Nothing here yet — extra materials will appear soon.</p>
          </div>
        )}
      </main>

      {/* ===== Mobile bottom nav ===== */}
      <nav className="pa-bottomnav">
        <button className="is-active"><I.home /><span>Home</span></button>
        <button onClick={openClass} disabled={!studentClass}><I.book /><span>Class</span></button>
        <button className="pa-soon" type="button"><I.mic /><span>Speak</span></button>
        <button onClick={openPractice}><I.clipboard /><span>Practice</span></button>
      </nav>
    </div>
  );
};

export default StudentDashboardPage;