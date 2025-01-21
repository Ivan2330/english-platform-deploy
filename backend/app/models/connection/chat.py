from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, DateTime, func
from app.core.database import Base

class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # Назва чату (наприклад, груповий чат)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("staff.id"), nullable=True)  # Викладач
    sender_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)  # Студент
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)  # Для відслідковування прочитання
