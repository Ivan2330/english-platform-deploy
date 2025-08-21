import React, { useEffect, useRef, useState } from 'react';
import { WS_URL, API_URL } from '../../config';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CallComponent from '../components/CallComponent';
import ChatComponent from '../components/ChatComponent';
import LessonSection from '../components/LessonSection';
import LessonSelectorModal from '../components/LessonSelectorModal';
import '../pages/ClassPage.css';
import leaveLessonButton from '../assets/leaveClass-button.svg';
import logo from '../assets/my_logo-1.svg';
import chatSvg from '../assets/chat.svg';

/* ──────────────────────────────────────────────────────────────
   Локальна утиліта: мобільна шторка (slide-up) + бекдроп
   ────────────────────────────────────────────────────────────── */
function SlidePanel({ id, title, open, onClose, children, height = '72vh' }) {
  // Закриття по ESC
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`mdock-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <section
        id={id}
        className={`mdock-drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        style={{ height }}
      >
        <header className="mdock-drawer-head">
          <h3 id={`${id}-title`}>{title}</h3>
          <button type="button" className="mdock-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="mdock-drawer-body">{children}</div>
      </section>
    </>
  );
}

const ClassPage = () => {
  const { id } = useParams(); // classroomId
  const [user, setUser] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  // Дзвінок/чат на десктопі
  const [inCall, setInCall] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // ── Мобільний док: "call" | "chat" | "sections" | null
  const [dockActive, setDockActive] = useState(null);
  const toggleDock = (key) => setDockActive((k) => (k === key ? null : key));
  const closeDock = () => setDockActive(null);

  useEffect(() => {
    const fetchUserAndChat = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_URL}/users/me`, { headers });
        setUser(res.data);

        try {
          await axios.get(`${API_URL}/chats/chats/${id}`, { headers });
        } catch (error) {
          if (error.response?.status === 404) {
            await axios.post(`${API_URL}/chats/chats/`, { classroom_id: parseInt(id) }, { headers });
          }
        }

        const resClass = await axios.get(`${API_URL}/classrooms/classrooms/${id}`, { headers });
        if (resClass.data.current_lesson_id) {
          const lesson = await axios.get(`${API_URL}/lessons/lessons/${resClass.data.current_lesson_id}`, { headers });
          setCurrentLesson(lesson.data);

          const resSections = await axios.get(`${API_URL}/lessons/lessons/${lesson.data.id}/tasks/`, { headers });
          setSections(resSections.data);
        }

        setChatReady(true);
      } catch (error) {
        console.error('Error fetching user or chat:', error);
      }
    };
    fetchUserAndChat();
  }, [id]);

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const handleLessonSelected = async (lesson) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/classrooms/classrooms/${id}/set-lesson/${lesson.id}`, {}, { headers });

      setCurrentLesson(lesson);
      const resSections = await axios.get(`${API_URL}/lessons/lessons/${lesson.id}/tasks/`, { headers });
      setSections(resSections.data);
      setShowLessonSelector(false);
    } catch (err) {
      console.error('Failed to set lesson:', err);
    }
  };

  if (!user || !chatReady) return <p>Loading user and chat...</p>;

  return (
    <div className="class-page">
      <header className="header">
        <button onClick={() => setShowLessonSelector(true)}>Choose Lesson</button>
        <button onClick={() => (window.location.href = user.role === 'staff' ? '/admin-dashboard' : '/student-dashboard')}>
          <img src={leaveLessonButton} alt="leave Lesson" />
        </button>
      </header>

      <section className="main-content">
        {/* LEFT panel (десктоп): чат + секції */}
        <div className="left-panel">
          {showChat ? (
            <ChatComponent chatId={parseInt(id)} currentUser={user} onClose={() => setShowChat(false)} />
          ) : (
            <div className="chat-toggle" onClick={() => setShowChat(true)}>
              <img src={chatSvg} alt="chat" />
            </div>
          )}

          {sections.length > 0 && (
            <div className="section-list">
              {sections.map((section, idx) => (
                <button
                  key={section.id}
                  className={`section-button ${activeSectionId === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  {section.title || section.task_type || `Section ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CENTER */}
        <div
          className="center-panel"
          style={{ alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px' }}
        >
          {currentLesson ? (
            sections
              .filter((section) => section.id === activeSectionId)
              .map((section) => <LessonSection key={section.id} section={section} currentUser={user} />)
          ) : (
            <div className="lesson-placeholder">👀 Please select a lesson to begin.</div>
          )}
        </div>

        {/* RIGHT panel (десктоп): дзвінок */}
        <div className="right-panel">
          {inCall ? (
            <CallComponent
              classroomId={parseInt(id)}
              currentUserId={user.id}
              role={user.role}
              onLeave={() => setInCall(false)}
            />
          ) : (
            <div className="placeholder-box">
              <img src={logo} alt="Student Logo" />
              <button onClick={() => setInCall(true)}>Join Call</button>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          МОБІЛЬНИЙ ДОК + ВИСУВНІ ПАНЕЛІ (видимі лише на мобільному)
          Дзвінок/чат залишаються змонтованими всередині шторок.
          ─────────────────────────────────────────────────────── */}
      <SlidePanel
        id="panel-call"
        title="Call"
        open={dockActive === 'call'}
        onClose={closeDock}
        height="72vh"
      >
        {inCall ? (
          <div className="mdock-call-wrap">
            <CallComponent
              classroomId={parseInt(id)}
              currentUserId={user.id}
              role={user.role}
              onLeave={() => {
                setInCall(false);
                closeDock();
              }}
            />
          </div>
        ) : (
          <div className="mdock-call-placeholder">
            <img src={logo} alt="Logo" />
            <button className="mdock-join" onClick={() => setInCall(true)}>
              Join Call
            </button>
          </div>
        )}
      </SlidePanel>

      <SlidePanel id="panel-chat" title="Chat" open={dockActive === 'chat'} onClose={closeDock} height="72vh">
        <div className="mdock-chat-wrap">
          <ChatComponent chatId={parseInt(id)} currentUser={user} onClose={closeDock} />
        </div>
      </SlidePanel>

      <SlidePanel id="panel-sections" title="Sections" open={dockActive === 'sections'} onClose={closeDock} height="64vh">
        <ul className="mdock-sections-list">
          {sections.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`mdock-section-btn ${activeSectionId === s.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveSectionId(s.id);
                  closeDock();
                }}
              >
                {s.title || s.task_type || `Section ${i + 1}`}
              </button>
            </li>
          ))}
        </ul>
      </SlidePanel>

      <nav className="mdock-bar" aria-label="Quick actions">
        <button
          type="button"
          className={`mdock-btn ${dockActive === 'call' ? 'is-active' : ''}`}
          onClick={() => toggleDock('call')}
          aria-controls="panel-call"
          aria-expanded={dockActive === 'call'}
        >
          📞 <span>Call</span>
        </button>
        <button
          type="button"
          className={`mdock-btn ${dockActive === 'chat' ? 'is-active' : ''}`}
          onClick={() => toggleDock('chat')}
          aria-controls="panel-chat"
          aria-expanded={dockActive === 'chat'}
        >
          💬 <span>Chat</span>
        </button>
        <button
          type="button"
          className={`mdock-btn ${dockActive === 'sections' ? 'is-active' : ''}`}
          onClick={() => toggleDock('sections')}
          aria-controls="panel-sections"
          aria-expanded={dockActive === 'sections'}
        >
          📚 <span>Sections</span>
        </button>
      </nav>

      {showLessonSelector && (
        <LessonSelectorModal
          classroomId={id}
          onClose={() => setShowLessonSelector(false)}
          onSelectLesson={handleLessonSelected}
        />
      )}
    </div>
  );
};

export default ClassPage;
