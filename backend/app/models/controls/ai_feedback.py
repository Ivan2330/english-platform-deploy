from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    task_result_id = Column(Integer, ForeignKey("task_results.id"), nullable=False)  # Прив'язка до TaskResult
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)  # Прив'язка до UniversalTask
    feedback_text = Column(Text, nullable=False)  # Загальний фідбек
    detailed_feedback = Column(Text, nullable=True)  # Детальний фідбек для WRITING
    created_at = Column(DateTime, default=func.now())  # Час створення
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Час оновлення

    # Зв'язки
    task_result = relationship("TaskResult", back_populates="ai_feedback")
    task = relationship("UniversalTask", back_populates="ai_feedback")
