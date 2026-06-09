import React, { useEffect, useRef, useState } from 'react';
import { WS_URL, API_URL } from '../../config';
import axios from 'axios';
import '../pages/ChatComponent.css';
import sender from '../assets/send_button.svg';

const ChatComponent = ({ chatId, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const seenRef = useRef(new Set());

  // Ключ для дедуплікації (повідомлення не мають унікального id)
  const keyOfMsg = (m) => `${m.user_id}|${m.sent_at}|${m.message}`;

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
        console.error('❌ Failed to fetch messages:', err);
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
          console.error('❌ Error parsing message:', e);
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

    // Спершу історія (засіваємо seen), потім WS — щоб уникнути гонки/дублів
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

    const payload = { content: trimmed };
    socketRef.current.send(JSON.stringify(payload));
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <p className="chat">Chat</p>
        <button className="chat-close-button" onClick={onClose}>✖</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.user_id === currentUser.id ? 'own-message' : 'other-message'}`}
          >
            <div className="chat-meta">
              <span className="chat-role">{msg.role}</span>
              <span className="chat-time">{new Date(msg.sent_at).toLocaleTimeString()}</span>
            </div>
            <div className="chat-text">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}><img src={sender} alt="send" /></button>
      </div>
    </div>
  );
};

export default ChatComponent;