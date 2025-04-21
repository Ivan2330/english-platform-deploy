import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';
import '../pages/LessonSelectorModal.css';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

const LessonSelectorModal = ({ classroomId, onClose, onSelectLesson }) => {
  const [lessonsByLevel, setLessonsByLevel] = useState({});
  const [expandedLevel, setExpandedLevel] = useState(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_URL}/lessons/lessons/`, { headers });
        const grouped = {};
        for (const level of LEVELS) grouped[level] = [];
        res.data.forEach(lesson => {
          if (LEVELS.includes(lesson.level)) {
            grouped[lesson.level].push(lesson);
          }
        });
        setLessonsByLevel(grouped);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      }
    };
    fetchLessons();
  }, []);

  const handleLevelClick = (level) => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  const handleLessonClick = async (lesson) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };


      await axios.patch(`${API_URL}/classrooms/classrooms/${parseInt(classroomId)}/set-lesson/${lesson.id}`, {}, { headers });

      const tasksRes = await axios.get(`${API_URL}/lessons/lessons/${lesson.id}/tasks/`, { headers });
      onSelectLesson(lesson, tasksRes.data);
    } catch (err) {
      console.error('Error selecting lesson:', err);
    }
  };

  return (
    <div className="lesson-selector-modal">
      <div className="modal-content">
        <h2>📘 Select a Lesson by Level</h2>
        <button onClick={onClose} className="close-button">✖</button>
        <div className="level-list">
          {LEVELS.map(level => (
            <div key={level} className="level-block">
              <button onClick={() => handleLevelClick(level)} className="level-button">{level}</button>
              {expandedLevel === level && (
                <ul className="lesson-list">
                  {lessonsByLevel[level]?.map(lesson => (
                    <li key={lesson.id} onClick={() => handleLessonClick(lesson)}>
                      {lesson.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LessonSelectorModal;
