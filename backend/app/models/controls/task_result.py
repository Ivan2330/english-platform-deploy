from sqlalchemy import Column, Integer, Text, Boolean, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User

class TaskResult(Base):
    __tablename__ = "task_results"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    student_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    score = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=func.now())

    
    task = relationship("UniversalTask", back_populates="task_results")
    student = relationship("User", foreign_keys=[student_id])
    question = relationship("Question")
    ai_feedback = relationship("AIFeedback", back_populates="task_result", cascade="all, delete-orphan")