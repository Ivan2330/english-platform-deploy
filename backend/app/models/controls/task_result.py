from sqlalchemy import Column, Integer, Text, Boolean, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class TaskResult(Base):
    __tablename__ = "task_results"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)  # Прив'язка до UniversalTask
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)  # Прив'язка до студента
    student_answer = Column(Text, nullable=False)  # Відповідь студента
    is_correct = Column(Boolean, nullable=True)  # Чи правильна відповідь
    score = Column(Float, default=0.0)  # Оцінка
    submitted_at = Column(DateTime, default=func.now())  # Час подачі

    # Зв'язки
    task = relationship("UniversalTask", back_populates="task_results")
    ai_feedback = relationship("AIFeedback", back_populates="task_result", cascade="all, delete-orphan")