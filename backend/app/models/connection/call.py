from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func
from app.core.database import Base

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, nullable=False)  # active, ended
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

class CallParticipant(Base):
    __tablename__ = "call_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)  # Викладач
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)  # Студент
    joined_at = Column(DateTime, default=func.now())
    left_at = Column(DateTime, nullable=True)
    mic_status = Column(Boolean, default=True)  # Стан мікрофону
    camera_status = Column(Boolean, default=True)  # Стан камери
    screen_sharing = Column(Boolean, default=False)  # Стан трансляції екрану
    video_quality = Column(String, default="medium")  # Якість відео
