from sqlalchemy import Column, Integer, Text, Boolean, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Answer(Base):
    """Відповідь учня на блок/питання в межах конкретної спроби.

    Містить і бот-перевірку (is_correct / bot_score), і оцінку вчителя
    (teacher_grade / teacher_feedback). Сюди ж зберігаються «живі» відповіді при сдачі.
    """
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("lesson_attempts.id", ondelete="CASCADE"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)

    student_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)    # бот-перевірка
    bot_score = Column(Float, nullable=True)
    teacher_grade = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    answered_at = Column(DateTime, default=func.now(), onupdate=func.now())

    attempt = relationship("LessonAttempt", back_populates="answers")
    block = relationship("Block", back_populates="answers")
    question = relationship("Question")