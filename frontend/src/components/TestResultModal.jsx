import React from 'react';
import '../pages/TestResultModal.css'; // стилі можна винести сюди

const TestResultModal = ({ results, questions, onClose }) => {
  const getQuestionText = (id) => {
    const q = questions.find(q => q.id === id);
    return q ? q.question_text : '';
  };

  const getCorrectAnswer = (id) => {
    const q = questions.find(q => q.id === id);
    return q ? q.correct_answer : '';
  };

  const total = results.length;
  const correct = results.filter(r => r.is_correct).length;
  const score = `${correct} / ${total}`;

  return (
    <div className="result-modal">
      <div className="modal-content-result">
        <h2>📊 Your Results</h2>
        <p>Score: <strong>{score}</strong></p>
        <div className="result-div">
        {results.map(res => (
          <div key={res.id} className="result-item">
            <p><strong>Q:</strong> {getQuestionText(res.question_id)}</p>
            <p><strong>Your Answer:</strong> {res.student_answer}</p>
            <p><strong>Correct Answer:</strong> {getCorrectAnswer(res.question_id)}</p>
            <p>{res.is_correct ? '✅ Correct' : '❌ Incorrect'}</p>
            <hr />
          </div>
        ))}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default TestResultModal;
