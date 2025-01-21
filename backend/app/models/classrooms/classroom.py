from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # group / individual
    teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Відношення
    teacher = relationship("Staff", back_populates="created_classrooms")
    student = relationship("Student", back_populates="classrooms", foreign_keys=[student_id])
