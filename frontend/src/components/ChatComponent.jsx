import React, { useEffect, useRef, useState } from 'react';
import { WS_URL, API_URL } from '../../config';
import axios from 'axios';
import '../pages/ChatComponent.css';

const ChatComponent = ({ chatId, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pos, setPos] = useState(null);          // {x,y} — позиція на десктопі
  const [dragging, setDragging] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const seenRef = useRef(new Set());
  const panelRef = useRef(null);
  const isDesktopRef = useRef(true);

  // Дедуплікація: за стабільним id, інакше — за складеним ключем
  const keyOfMsg = (m) => (m.id != null ? `id:${m.id}` : `${m.user_id}|${m.sent_at}|${m.message}`);

  // Час: бекенд віддає UTC без позначки → додаємо 'Z', щоб коректно перевести в локальний
  const fmtTime = (s) => {
    if (!s) return '';
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
    const d = new Date(hasTz ? s : s + 'Z');
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Десктоп vs мобільний (для перетягування) ──
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const apply = () => {
      isDesktopRef.current = mq.matches;
      if (mq.matches && !pos) {
        const w = 320, h = 480;
        setPos({
          x: 24,
          y: Math.max(12, window.innerHeight - h - 24),
        });
      }
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket + історія (логіка без змін) ──
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;
    const token0 = localStorage.getItem('token');
    if (!token0) return;

    const headers = { Authorization: `Bearer ${token0}` };
    seenRef.current = new Set();

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/chats/chats/${chatId}`, { headers });
        if (res.data?.messages) {
          const list = res.data.messages;
          list.forEach((m) => seenRef.current.add(keyOfMsg(m)));
          setMessages(list);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    let closed = false;
    let attempt = 0;
    let retryTimer = null;

    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) { /* ignore */ }
      }

      const ws = new WebSocket(`${WS_URL}/chat-ws/${chatId}?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => { attempt = 0; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const k = keyOfMsg(data);
          if (seenRef.current.has(k)) return; // дедуплікація (реплей кешу)
          seenRef.current.add(k);
          setMessages((prev) => [...prev, data]);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };

      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
        if (closed) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000); // 1s,2s,4s,8s,10s…
        retryTimer = setTimeout(connect, delay);
      };
    };

    (async () => {
      await fetchMessages();
      if (!closed) connect();
    })();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) { /* ignore */ }
      }
      socketRef.current = null;
    };
  }, [chatId, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ content: trimmed }));
    setNewMessage('');
  };

  // ── Перетягування (тільки десктоп, за хедер) ──
  const startDrag = (e) => {
    if (!isDesktopRef.current || !panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    setDragging(true);

    const move = (ev) => {
      const w = panelRef.current?.offsetWidth ?? 360;
      const h = panelRef.current?.offsetHeight ?? 520;
      const x = Math.max(8, Math.min(ev.clientX - offX, window.innerWidth - w - 8));
      const y = Math.max(8, Math.min(ev.clientY - offY, window.innerHeight - h - 8));
      setPos({ x, y });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const style = isDesktopRef.current && pos ? { left: pos.x, top: pos.y } : undefined;

  return (
    <div
      ref={panelRef}
      className={`chat-panel ${dragging ? 'is-dragging' : ''}`}
      style={style}
    >
      <div className="chat-head" onPointerDown={startDrag}>
        <span className="chat-grip" aria-hidden>&#x283F;</span>
        <span className="chat-head-title">Чат класу</span>
        <button className="chat-x" onClick={onClose} aria-label="Закрити">&#x2715;</button>
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="chat-empty">Повідомлень ще немає — почніть розмову 👋</div>
        )}
        {messages.map((msg, idx) => {
          const own = msg.user_id === currentUser.id;
          return (
            <div key={idx} className={`chat-row ${own ? 'own' : 'other'}`}>
              <div className="chat-bubble">
                {!own && <span className="chat-role">{msg.role}</span>}
                <span className="chat-text">{msg.message}</span>
                <span className="chat-time">
                  {fmtTime(msg.sent_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-foot">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Напишіть повідомлення…"
        />
        <button className="chat-send" onClick={sendMessage} aria-label="Надіслати">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2 .4 6.4Z" fill="#fff" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;