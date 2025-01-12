from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func
from app.core.database import Base

class ClassroomCall(Base):
    __tablename__ = "classroom_calls"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    status = Column(String, nullable=False)  # active, ended
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
