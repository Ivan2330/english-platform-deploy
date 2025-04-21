from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User


class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ Використовуємо users.id
    role = Column(String, nullable=False)  
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)  # Для відслідковування прочитання

    # Односторонній зв’язок – щоб отримати користувача, який надіслав повідомлення
    sender = relationship("User")
