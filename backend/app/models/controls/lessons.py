from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User


class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    level = Column(String, nullable=True)
    
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    sections = relationship("UniversalTask", back_populates="lesson", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])