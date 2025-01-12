from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from core.database import Base


class AIChat(Base):
    __tablename__ = "ai_chat"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("students.id"), nullable=False)  # Прив'язка до користувача
    message = Column(Text, nullable=False)  # Повідомлення від користувача
    response = Column(Text, nullable=False)  # Відповідь GPT-3.5
    context = Column(Text, nullable=True)  # Контекст для GPT-3.5
    created_at = Column(DateTime, default=func.now())  # Час створення

    user = relationship("Student", back_populates="ai_chats")
