// src/components/LessonSection.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from "../../config";
import '../pages/LessonSection.css';
import grammar_time from '../assets/grammar_time.png';
import speaking_page from '../assets/Speaking_Page.png'; // ✅ додали картинку для speaking
import TestResultModal from '../components/TestResultModal';
import SectionContent from './SectionContent';

const SUPPORTED_TYPES = ['grammar', 'speaking']; // ✅ підтримуємо обидва типи

const LessonSection = ({ section, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showTest, setShowTest] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [results, setResults] = useState([]);

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

  const handleAnswer = (questionId, optionKey) => {
    const value = questions.find(q => q.id === questionId)?.options?.[optionKey];
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

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

  // показуємо лише для grammar або speaking
  if (!SUPPORTED_TYPES.includes(section.control_type)) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const heroImage =
    section.control_type === 'speaking' ? speaking_page : grammar_time; // ✅ вибір картинки

  return (
    <div className="lesson-section">
      <div className="section-image">
        <h2 className="section-title">{section.title}</h2>
      </div>

      {/* ✅ картинка залежно від типу секції */}
      <img
        src={heroImage}
        alt={section.control_type === 'speaking' ? 'Speaking lesson' : 'Grammar lesson'}
        className="lesson-section-img"
      />

      {/* ✅ markdown-контент і опис — однаково для обох типів */}
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

      {/* ✅ тести — однакова логіка для grammar та speaking */}
      <section className="lesson-practice-section">
        <button onClick={() => setShowTest(!showTest)} className="toggle-test-button">
          {showTest ? 'Hide Test' : 'Start Test'}
        </button>

        {showTest && currentQuestion && (
          <div className="test-box">
            <p className="question-text">{currentQuestion.question_text}</p>
            <div className="options-container">
              {Object.entries(currentQuestion.options || {}).map(([key, value]) => (
                <div
                  key={key}
                  className={`option ${answers[currentQuestion.id] === value ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQuestion.id, key)}
                >
                  {value}
                </div>
              ))}
            </div>

            <div className="question-controls">
              <button
                onClick={() => setCurrentQuestionIndex(i => Math.max(i - 1, 0))}
                disabled={currentQuestionIndex === 0}
                className="previous-button-test"
              >
                ⬅ Previous
              </button>

              <button
                onClick={() =>
                  setCurrentQuestionIndex(i =>
                    i < questions.length - 1 ? i + 1 : i
                  )
                }
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
