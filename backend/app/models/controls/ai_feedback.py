from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("universal_task.id"), nullable=False)  # Прив'язка до райтинг-завдання
    feedback_text = Column(Text, nullable=False)  # Текстовий фідбек від GPT-4
    score = Column(Integer, nullable=True)  # Оцінка GPT-4
    comments = Column(Text, nullable=True)  # Коментарі GPT-4
    ai_model = Column(String, default="gpt-4")  # Використана модель (завжди GPT-4)
    created_at = Column(DateTime, default=func.now())  # Дата створення
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Дата оновлення

    task = relationship("UniversalTask", back_populates="ai_feedback")
