import React, { useEffect, useState, useMemo, useRef } from 'react';
import { API_URL, WS_URL } from '../../config';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import CallComponent from '../components/CallComponent';
import ChatComponent from '../components/ChatComponent';
import BlockRenderer from '../components/lesson/LessonBlocks';
import LessonSelectorModal from '../components/LessonSelectorModal';
import { startRingtone, stopRingtone } from '../utils/ringtone';
import '../pages/ClassPage.css';
import './LessonView.css';
import '../styles/homework.css';
import leaveLessonButton from '../assets/leaveClass-button.svg';
import logo from '../assets/my_logo-1.svg';
import chatSvg from '../assets/chat.svg';

const keyOf = (b, q) => `${b}:${q ?? 'null'}`;

const ClassPage = () => {
  const { id } = useParams(); // classroomId
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [chatReady, setChatReady] = useState(false);
  const [lessonFull, setLessonFull] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [inCall, setInCall] = useState(false);

  // Вхідний дзвінок: null або { fromRole: 'staff' | 'student' }
  const [incomingCall, setIncomingCall] = useState(null);

  // Живі відповіді учня (бачить лише викладач): Map "blockId:qId" -> value
  const [liveAnswers, setLiveAnswers] = useState(() => new Map());

  // Проходження (для учня)
  const [attempt, setAttempt] = useState(null);
  const [initial, setInitial] = useState(() => new Map());
  const [completed, setCompleted] = useState(false);

  // Chat visibility
  const [showChat, setShowChat] = useState(false);

  // Mobile dock
  const [dockOpen, setDockOpen] = useState(false);
  const [dockTab, setDockTab] = useState(null); // 'call' | 'chat' | 'sections' | null

  // Refs
  const wsRef = useRef(null);
  const centerRef = useRef(null);
  const inCallRef = useRef(false);
  const activeSectionRef = useRef(null);
  const lessonFullRef = useRef(null);

  const isStaff = user?.role === 'staff';

  useEffect(() => { inCallRef.current = inCall; }, [inCall]);
  useEffect(() => { activeSectionRef.current = activeSectionId; }, [activeSectionId]);

  // ── WebSocket класу: вхідний дзвінок + "За мною" + live-view (з автоперепідключенням) ──
  useEffect(() => {
    if (!user) return;
    if (!WS_URL) return;

    let closed = false;
    let attempt = 0;
    let retryTimer = null;

    const handleMessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'go_after_me') {
        // Учні слідують за вчителем; сам вчитель — ні
        if (user.role !== 'staff') {
          const applyPosition = () => {
            if (msg.section_id != null) setActiveSectionId(msg.section_id);
            requestAnimationFrame(() => {
              const el = centerRef.current;
              if (el) {
                const max = el.scrollHeight - el.clientHeight;
                el.scrollTo({ top: (msg.scroll_ratio || 0) * max, behavior: 'smooth' });
              }
            });
          };
          if (msg.lesson_id != null && msg.lesson_id !== lessonFullRef.current?.id) {
            // Вчитель перейшов на ІНШИЙ урок — підвантажуємо його, тоді переходимо
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            loadLessonContent(msg.lesson_id, user, headers)
              .then(() => setTimeout(applyPosition, 350))
              .catch(() => {});
          } else {
            applyPosition();
          }
        }
      } else if (msg.type === 'call_started') {
        if (!inCallRef.current) setIncomingCall({ fromRole: msg.from_role });
      } else if (msg.type === 'call_ended') {
        setIncomingCall(null);
      } else if (msg.type === 'answer_update') {
        // Лише викладач отримує (бекенд шле staff-only), оновлюємо живу мапу
        if (user.role === 'staff') {
          setLiveAnswers((prev) => {
            const next = new Map(prev);
            next.set(`${msg.block_id}:${msg.question_id ?? 'null'}`, msg.value);
            return next;
          });
        }
      }
    };

    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}/classroom-ws/${id}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => { attempt = 0; };
      ws.onmessage = handleMessage;
      ws.onerror = () => { try { ws.close(); } catch {} };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (closed) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000); // 1s,2s,4s,8s,10s…
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      const ws = wsRef.current;
      if (ws) { try { ws.close(); } catch {} }
      wsRef.current = null;
    };
  }, [user, id]);

  // ── Рингтон вхідного дзвінка ────────────────────────────────────────
  useEffect(() => {
    if (incomingCall) startRingtone();
    else stopRingtone();
    return () => stopRingtone();
  }, [incomingCall]);

  const sendWs = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  const startCall = () => {
    setIncomingCall(null);
    setInCall(true);
    sendWs({ type: 'call_started' });
  };

  const acceptCall = () => {
    setIncomingCall(null);
    setInCall(true);
  };

  const dismissCall = () => setIncomingCall(null);

  const endCall = () => {
    setInCall(false);
    sendWs({ type: 'call_ended' });
  };

  const goAfterMe = () => {
    const el = centerRef.current;
    const max = el ? el.scrollHeight - el.clientHeight : 0;
    const ratio = el && max > 0 ? el.scrollTop / max : 0;
    sendWs({ type: 'go_after_me', lesson_id: lessonFull?.id ?? lessonFullRef.current?.id ?? null, section_id: activeSectionRef.current, scroll_ratio: ratio });
  };

  const completeLesson = async () => {
    if (!attempt) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/attempts/${attempt.id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompleted(true);
    } catch {
      alert('Не вдалося завершити урок.');
    }
  };

  const openDock = (tab) => {
    if (dockOpen && dockTab === tab) {
      closeDock();
      return;
    }
    setDockTab(tab);
    setDockOpen(true);
    if (tab === 'chat') setShowChat(true);
    if (tab === 'call' && !inCall) startCall();
  };

  const closeDock = () => {
    if (dockTab === 'chat') setShowChat(false);
    setDockOpen(false);
    setDockTab(null);
  };

  // Завантаження нового контенту уроку + (для учня) старт спроби
  const loadLessonContent = async (lessonId, currentUser, headers) => {
    const { data: full } = await axios.get(`${API_URL}/lesson-content/${lessonId}/full`, { headers });
    setLessonFull(full);
    lessonFullRef.current = full;
    setActiveSectionId(full.sections?.[0]?.id ?? null);
    setCompleted(false);

    if (currentUser?.role === 'student') {
      const { data: att } = await axios.post(
        `${API_URL}/attempts/start`,
        { lesson_id: full.id },
        { headers }
      );
      const { data: attFull } = await axios.get(`${API_URL}/attempts/${att.id}`, { headers });
      const m = new Map();
      (attFull.answers || []).forEach((a) => m.set(keyOf(a.block_id, a.question_id), a.student_answer));
      setInitial(m);
      setAttempt(att);
    }
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
          await loadLessonContent(resClass.data.current_lesson_id, res.data, headers);
        }

        setChatReady(true);
      } catch (error) {
        console.error('Error fetching user or chat:', error);
        setChatReady(true);
      }
    };
    fetchUserAndChat();
  }, [id]);

  const runner = useMemo(() => {
    if (!attempt) return null;
    return {
      initial,
      save: async (blockId, questionId, studentAnswer) => {
        sendWs({ type: 'answer_update', block_id: blockId, question_id: questionId ?? null, value: studentAnswer });
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_URL}/attempts/${attempt.id}/answer`,
          { block_id: blockId, question_id: questionId ?? null, student_answer: studentAnswer },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      },
      // Легка трансляція під час друку (без збереження в БД)
      live: (blockId, questionId, value) => {
        sendWs({ type: 'answer_update', block_id: blockId, question_id: questionId ?? null, value });
      },
    };
  }, [attempt, initial]);

  const handleLessonSelected = async (lesson) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/classrooms/classrooms/${id}/set-lesson/${lesson.id}`, {}, { headers });
      await loadLessonContent(lesson.id, user, headers);
      // одразу переводимо учнів на новий урок (без потреби тиснути «За мною»)
      if (user?.role === 'staff') {
        sendWs({ type: 'go_after_me', lesson_id: lesson.id, section_id: null, scroll_ratio: 0 });
      }
      setShowLessonSelector(false);
    } catch (err) {
      console.error('Failed to set lesson:', err);
    }
  };

  const handleLeaveClass = () => {
    const target = user?.role === 'staff' ? '/admin-dashboard' : '/student-dashboard';
    navigate(target, { replace: true, state: { from: `/classroom/${id}` } });
  };

  if (!user || !chatReady) return <p>Loading user and chat...</p>;

  const sections = lessonFull?.sections || [];
  const activeSection = sections.find((s) => s.id === activeSectionId);

  return (
    <div className={`class-page ${dockOpen ? 'mdock-open' : ''} ${dockTab ? `mdock-tab-${dockTab}` : ''}`}>
      <header className="header">
        <button className="choose-lesson" onClick={() => setShowLessonSelector(true)}>Choose Lesson</button>

        <div className="header-center">
          {lessonFull && (
            <>
              <span className="hc-title">{lessonFull.title}</span>
              {lessonFull.level && <span className="hc-level">{lessonFull.level}</span>}
              {sections.length > 0 && activeSection && (
                <span className="hc-progress">
                  Section {sections.findIndex((s) => s.id === activeSectionId) + 1} / {sections.length}
                </span>
              )}
            </>
          )}
        </div>

        <div className="header-actions">
          {isStaff && sections.length > 0 && (
            <button
              className="goafter-btn"
              onClick={goAfterMe}
              title="Перемкнути учнів на мою секцію та позицію"
            >
              ➜ За мною
            </button>
          )}
          {user.role === 'student' && attempt && (
            <button className="finish-btn" onClick={completeLesson} disabled={completed}>
              {completed ? '✓ Урок завершено' : 'Завершити урок'}
            </button>
          )}
          <button className="leave-btn" onClick={handleLeaveClass} aria-label="Leave Lesson">
            <img src={leaveLessonButton} alt="leave Lesson" />
          </button>
        </div>
      </header>

      <section className="main-content">
        {/* LEFT */}
        <div className="left-panel">
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
                  {section.title || `Section ${idx + 1}`}
                  {section.kind === 'homework' && <span className="hw-badge">HW</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CENTER */}
        <div
          ref={centerRef}
          className="center-panel"
          style={{ alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px', paddingBottom: '28px' }}
        >
          {lessonFull ? (
            activeSection ? (
              <div className="lv-doc">
                {activeSection.blocks.length ? (
                  activeSection.blocks.map((b) => (
                    <BlockRenderer
                      key={b.id}
                      block={b}
                      runner={runner}
                      live={isStaff ? liveAnswers : undefined}
                    />
                  ))
                ) : (
                  <div className="lv-state">У цій секції ще немає блоків.</div>
                )}
              </div>
            ) : (
              <div className="lesson-placeholder">У цьому уроці ще немає секцій.</div>
            )
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
              onLeave={endCall}
            />
          ) : (
            <div className="placeholder-box">
              <img src={logo} alt="Prime Academy" />
              <div className="pb-title">Готові почати?</div>
              <div className="pb-sub">Натисніть, щоб увійти у відеодзвінок</div>
              <button onClick={startCall}>Join Call</button>
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
                  {section.title || `Section ${idx + 1}`}
                  {section.kind === 'homework' && <span className="hw-badge">HW</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ЄДИНИЙ ChatComponent */}
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

      {/* Вхідний дзвінок */}
      {incomingCall && (
        <div className="incoming-call" role="dialog" aria-label="Вхідний дзвінок">
          <div className="incoming-call-card">
            <div className="ic-pulse">📞</div>
            <div className="ic-text">
              <strong>{incomingCall.fromRole === 'staff' ? 'Викладач' : 'Учень'} телефонує…</strong>
              <span>Приєднайтесь, щоб увійти в дзвінок</span>
            </div>
            <div className="ic-actions">
              <button className="ic-join" onClick={acceptCall}>Приєднатися</button>
              <button className="ic-dismiss" onClick={dismissCall}>Відхилити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassPage;