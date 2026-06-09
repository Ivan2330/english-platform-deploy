import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';
import '../pages/LessonSelectorModal.css';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const LessonSelectorModal = ({ onClose, onSelectLesson }) => {
  const [lessons, setLessons] = useState([]);
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_URL}/lessons/lessons/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLessons(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error fetching lessons:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => {
      const okLevel = level === 'all' || l.level === level;
      const okQuery = !q || (l.title || '').toLowerCase().includes(q);
      return okLevel && okQuery;
    });
  }, [lessons, level, query]);

  return (
    <div className="ls-bg" onClick={onClose}>
      <div className="ls-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ls-head">
          <span className="ls-title">Обрати урок</span>
          <button className="ls-close" onClick={onClose} aria-label="Close">✖</button>
        </div>

        <div className="ls-controls">
          <input
            className="ls-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за назвою…"
          />
          <div className="ls-levels">
            <button className={`ls-lvl ${level === 'all' ? 'on' : ''}`} onClick={() => setLevel('all')}>
              Усі
            </button>
            {LEVELS.map((lv) => (
              <button key={lv} className={`ls-lvl ${level === lv ? 'on' : ''}`} onClick={() => setLevel(lv)}>
                {lv}
              </button>
            ))}
          </div>
        </div>

        <div className="ls-list">
          {loading ? (
            <div className="ls-empty">Завантаження…</div>
          ) : filtered.length ? (
            filtered.map((l) => (
              <button key={l.id} className="ls-item" onClick={() => onSelectLesson(l)}>
                <span className="ls-item-title">{l.title}</span>
                {l.level && <span className="ls-item-lvl">{l.level}</span>}
              </button>
            ))
          ) : (
            <div className="ls-empty">Уроків не знайдено.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonSelectorModal;