from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LessonAttempt(Base):
    """Проходження уроку учнем (сесія/спроба).

    Звідси беруться «пройдені уроки»: статус, час, загальна оцінка вчителя.
    """
    __tablename__ = "lesson_attempts"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="in_progress")  # in_progress | completed
    overall_grade = Column(Float, nullable=True)   # оцінка вчителя за весь урок
    teacher_comment = Column(Text, nullable=True)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

    lesson = relationship("Lesson")
    student = relationship("User", foreign_keys=[student_id])
    answers = relationship(
        "Answer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )