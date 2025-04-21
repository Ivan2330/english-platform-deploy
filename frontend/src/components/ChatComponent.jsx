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

  useEffect(() => {
    if (!chatId || !currentUser?.id) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/chats/chats/${chatId}`, { headers });
        if (res.data?.messages) setMessages(res.data.messages);
      } catch (err) {
        console.error('❌ Failed to fetch messages:', err);
      }
    };

    fetchMessages();
    

     // 🛑 Закриваємо старий WebSocket перед відкриттям нового
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.warn("❗ Couldn't close previous socket", e);
      }
    }

    
    const ws = new WebSocket(`${WS_URL}/chat-ws/${chatId}?token=${token}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error('❌ Error parsing message:', e);
      }
    };

    ws.onerror = (e) => {
      console.error('🚫 WebSocket error:', e);
    };

    ws.onclose = () => {
      console.warn('🔌 WebSocket closed');
    };

    return () => {
      ws.close();
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
