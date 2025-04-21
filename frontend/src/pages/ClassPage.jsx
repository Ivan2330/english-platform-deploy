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

const ClassPage = () => {
  const { id } = useParams(); // classroomId
  const [user, setUser] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [showChat, setShowChat] = useState(false);

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
  }, [sections]);

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
        <button onClick={() => window.location.href = user.role === 'staff' ? '/admin-dashboard' : '/student-dashboard'}>
          <img src={leaveLessonButton} alt="leave Lesson" />
        </button>
      </header>

      <section className="main-content">
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

        <div className="center-panel" style={{ alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
          {currentLesson ? (
            sections
              .filter(section => section.id === activeSectionId)
              .map(section => (
                <LessonSection key={section.id} section={section} currentUser={user} />
              ))
          ) : (
            <div className="lesson-placeholder">👀 Please select a lesson to begin.</div>
          )}
        </div>

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
