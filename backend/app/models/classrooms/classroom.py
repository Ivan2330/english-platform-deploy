from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # group / individual
    description = Column(String, nullable=True)
    current_lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)

    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    teacher = relationship("User", back_populates="created_classrooms", foreign_keys=[teacher_id])
    student = relationship("User", back_populates="classroom", foreign_keys=[student_id])
    current_lesson = relationship("Lesson", foreign_keys=[current_lesson_id])
