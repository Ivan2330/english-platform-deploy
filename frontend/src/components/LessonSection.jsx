// src/components/LessonSection.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from "../../config";
import '../pages/LessonSection.css';
import grammar_time from '../assets/grammar_time.png';
import TestResultModal from '../components/TestResultModal';
import SectionContent from './SectionContent';

const LessonSection = ({ section, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showTest, setShowTest] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (section?.control_type === 'grammar') {
      fetchQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`${API_URL}/questions/questions/tasks/${section.id}/questions/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setQuestions(res.data.sort((a, b) => a.order - b.order));
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

  if (section.control_type !== 'grammar') return null;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="lesson-section">
      <div className="section-image">
        <h2 className="section-title">{section.title}</h2>
      </div>
      <img src={grammar_time} alt="Learning topic" className="lesson-section-img"/>

      <section className="lesson-theory-section">
        {/* Markdown-rendered content */}
        <div className="theory-section-content">
          <SectionContent content={section.content} />
        </div>
        {/* Опис можна залишити як є, або теж markdown */}
        {section.description && (
          <div className="theory-section-question">
            <SectionContent content={section.description} />
          </div>
        )}
      </section>

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
                className="previous-button-test">
                ⬅ Previous
              </button>
              <button
                onClick={() =>
                  setCurrentQuestionIndex(i =>
                    i < questions.length - 1 ? i + 1 : i
                  )
                }
                disabled={currentQuestionIndex === questions.length - 1}
                className="next-button-test">
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
