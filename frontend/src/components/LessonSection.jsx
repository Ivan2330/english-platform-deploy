// src/components/LessonSection.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from "../../config";
import '../pages/LessonSection.css';
import grammar_time from '../assets/grammar_time.png';
import speaking_page from '../assets/Speaking_Page.png';
import TestResultModal from '../components/TestResultModal';
import SectionContent from './SectionContent';

const SUPPORTED_TYPES = ['grammar', 'reading']; // які секції показуємо

const LessonSection = ({ section, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showTest, setShowTest] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [results, setResults] = useState([]);

  // тип завдання (важливо, щоб прийшов у section)
  const taskType = section?.task_type || 'multiple_choice';

  useEffect(() => {
    if (section && SUPPORTED_TYPES.includes(section.control_type)) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/questions/questions/tasks/${section.id}/questions/`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setQuestions((res.data || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  // універсальний сеттер відповіді
  const setAnswer = (questionId, value) => {
    const v = typeof value === 'string' ? value.trim() : value;
    setAnswers(prev => ({ ...prev, [questionId]: v }));
  };

  // multiple choice
  const handleMCOption = (questionId, optionKey) => {
    const q = questions.find(x => x.id === questionId);
    const value = q?.options?.[optionKey];
    setAnswer(questionId, value);
  };

  const goPrev = () => setCurrentQuestionIndex(i => Math.max(i - 1, 0));
  const goNext = () => setCurrentQuestionIndex(i => (i < questions.length - 1 ? i + 1 : i));

  const sendAnswers = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/task-results/results/tasks/${section.id}/check/`,
        answers,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setResults(res.data);
      setShowResultModal(true);
    } catch (err) {
      console.error('Error sending answers:', err);
    }
  };

  if (!section) {
    return (
      <div className="lesson-section placeholder">
        <p>👀 Please select a lesson to begin.</p>
      </div>
    );
  }
  if (!SUPPORTED_TYPES.includes(section.control_type)) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const heroImage = section.control_type === 'reading' ? speaking_page : grammar_time;

  const renderQuestionBody = (q) => {
    if (!q) return null;

    if (taskType === 'multiple_choice') {
      return (
        <div className="options-container variant--pill">
          {Object.entries(q.options || {}).map(([key, value]) => (
            <div
              key={key}
              className={`option ${answers[q.id] === value ? 'selected' : ''}`}
              onClick={() => handleMCOption(q.id, key)}
            >
              {value}
            </div>
          ))}
        </div>
      );
    }

    if (taskType === 'true_false') {
      const val = String(answers[q.id] || '').toLowerCase();
      return (
        <div className="tf-toggle">
          <button
            type="button"
            className={`tf-btn ${val === 'true' ? 'active' : ''}`}
            onClick={() => setAnswer(q.id, 'true')}
          >True</button>
          <button
            type="button"
            className={`tf-btn ${val === 'false' ? 'active' : ''}`}
            onClick={() => setAnswer(q.id, 'false')}
          >False</button>
        </div>
      );
    }

    if (taskType === 'gap_fill') {
      // 1 пропуск = 1 питання -> звичайний input
      return (
        <div className="gap-box">
          <input
            className="gap-input"
            type="text"
            placeholder="Впиши відповідь"
            value={answers[q.id] || ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') goNext(); }}
          />
        </div>
      );
    }

    if (taskType === 'open_text') {
      return (
        <div className="open-text-box">
          <textarea
            className="open-textarea"
            rows={6}
            placeholder="Напиши відповідь..."
            value={answers[q.id] || ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
          <small className="hint">Цей тип перевіряється вручну викладачем.</small>
        </div>
      );
    }

    return <p>Unsupported task type.</p>;
  };

  return (
    <div className="lesson-section">
      <div className="section-image">
        <h2 className="section-title">{section.title}</h2>
      </div>

      <img
        src={heroImage}
        alt={section.control_type === 'reading' ? 'Speaking lesson' : 'Grammar lesson'}
        className="lesson-section-img"
      />

      {/* Теорія */}
      <section className="lesson-theory-section">
        <div className="theory-section-content">
          <SectionContent content={section.content} />
        </div>
        {section.description && (
          <div className="theory-section-question">
            <SectionContent content={section.description} />
          </div>
        )}
      </section>

      {/* Практика */}
      <section className="lesson-practice-section">
        <button onClick={() => setShowTest(!showTest)} className="toggle-test-button">
          {showTest ? 'Hide Test' : 'Start Test'}
        </button>

        {showTest && currentQuestion && (
          <div className="test-box theme--brand">
            <p className="question-text">{currentQuestion.question_text}</p>

            {renderQuestionBody(currentQuestion)}

            <div className="question-controls">
              <button
                onClick={goPrev}
                disabled={currentQuestionIndex === 0}
                className="previous-button-test"
              >
                ⬅ Previous
              </button>

              <button
                onClick={goNext}
                disabled={currentQuestionIndex === questions.length - 1}
                className="next-button-test"
              >
                Next ➡
              </button>

              {currentQuestionIndex === questions.length - 1 && (
                <button onClick={sendAnswers} className="submit-test-button">✅ Submit</button>
              )}
            </div>
          </div>
        )}
      </section>

      {showResultModal && (
        <TestResultModal
          results={results}
          questions={questions}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </div>
  );
};

export default LessonSection;
