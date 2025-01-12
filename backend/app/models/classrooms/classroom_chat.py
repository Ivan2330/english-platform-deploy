from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from app.core.database import Base

class ClassroomChat(Base):
    __tablename__ = "classroom_chats"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("staff.id"), nullable=False)  # Може бути студент або викладач
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=func.now())
