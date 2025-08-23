import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config';
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

const ClassPage = () => {
  const { id } = useParams(); // classroomId
  const [user, setUser] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [inCall, setInCall] = useState(false);

  // Chat visibility (єдиний інстанс, рендериться як overlay у кінці)
  const [showChat, setShowChat] = useState(false);

  // Mobile dock
  const [dockOpen, setDockOpen] = useState(false);
  const [dockTab, setDockTab] = useState(null); // 'call' | 'chat' | 'sections' | null

  const openDock = (tab) => {
    if (dockOpen && dockTab === tab) {
      closeDock();
      return;
    }
    setDockTab(tab);
    setDockOpen(true);
    if (tab === 'chat') setShowChat(true);
    if (tab === 'call' && !inCall) setInCall(true);
  };

  const closeDock = () => {
    if (dockTab === 'chat') setShowChat(false);
    setDockOpen(false);
    setDockTab(null);
  };

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
    <div className={`class-page ${dockOpen ? 'mdock-open' : ''} ${dockTab ? `mdock-tab-${dockTab}` : ''}`}>
      <header className="header">
        <button onClick={() => setShowLessonSelector(true)}>Choose Lesson</button>
        <button
          onClick={() =>
            (window.location.href =
              user.role === 'staff' ? '/admin-dashboard' : '/student-dashboard')
          }
          aria-label="Leave Lesson"
        >
          <img src={leaveLessonButton} alt="leave Lesson" />
        </button>
      </header>

      <section className="main-content">
        {/* LEFT */}
        <div className="left-panel">
          {/* На десктопі ця кнопка відкриває overlay чат */}
          <div
            className="chat-toggle"
            onClick={() => setShowChat(true)}
            role="button"
            aria-label="Open chat"
            title="Open chat"
          >
            <img src={chatSvg} alt="chat" />
          </div>

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
              .map((section) => (
                <LessonSection key={section.id} section={section} currentUser={user} />
              ))
          ) : (
            <div className="lesson-placeholder">👀 Please select a lesson to begin.</div>
          )}
        </div>

        {/* RIGHT — ЄДИНИЙ інстанс CallComponent */}
        <div className={`right-panel ${dockOpen && dockTab === 'call' ? 'is-open' : ''}`}>
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

      {/* MOBILE DOCK */}
      <div className="mdock-bar" role="tablist" aria-label="Mobile actions">
        <button
          className={`mdock-btn ${dockOpen && dockTab === 'call' ? 'is-active' : ''}`}
          onClick={() => openDock('call')}
          role="tab"
          aria-selected={dockOpen && dockTab === 'call'}
        >
          📞 Call
        </button>
        <button
          className={`mdock-btn ${dockOpen && dockTab === 'chat' ? 'is-active' : ''}`}
          onClick={() => openDock('chat')}
          role="tab"
          aria-selected={dockOpen && dockTab === 'chat'}
        >
          💬 Chat
        </button>
        <button
          className={`mdock-btn ${dockOpen && dockTab === 'sections' ? 'is-active' : ''}`}
          onClick={() => openDock('sections')}
          role="tab"
          aria-selected={dockOpen && dockTab === 'sections'}
        >
          📚 Sections
        </button>
      </div>

      {/* Backdrop */}
      <div className={`mdock-backdrop ${dockOpen ? 'is-open' : ''}`} onClick={closeDock} />

      {/* Drawer для Sections */}
      <div className={`mdock-drawer ${dockOpen && dockTab === 'sections' ? 'is-open' : ''}`}>
        <div className="mdock-drawer-head">
          <h3>Sections</h3>
          <button className="mdock-close" onClick={closeDock} aria-label="Close">✖</button>
        </div>
        <div className="mdock-drawer-body">
          <ul className="mdock-sections-list">
            {sections.map((section, idx) => (
              <li key={section.id}>
                <button
                  className={`mdock-section-btn ${activeSectionId === section.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  {section.title || section.task_type || `Section ${idx + 1}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ✅ ЄДИНИЙ ChatComponent ОКРЕМО ВІД left-panel (щоб працював на мобільному) */}
      {showChat && (
        <ChatComponent
          chatId={parseInt(id)}
          currentUser={user}
          onClose={() => {
            setShowChat(false);
            if (dockTab === 'chat') closeDock();
          }}
        />
      )}

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
