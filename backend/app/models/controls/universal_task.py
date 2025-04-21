from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User
from app.models.controls.lessons import Lesson
import enum


class TaskType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    GAP_FILL = "gap_fill"
    OPEN_TEXT = "open_text"

class ControlType(str, enum.Enum):
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"

class Visibility(str, enum.Enum):
    GLOBAL = "global"
    CLASS_SPECIFIC = "class_specific"
    PRIVATE = "private"

class UniversalTask(Base):
    __tablename__ = "universal_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    control_type = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    title = Column(String, nullable=False) # Section name
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    word_list = Column(Text, nullable=True)
    visibility = Column(String, nullable=False) # For whom tasks are available
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


    lesson = relationship("Lesson", foreign_keys=[lesson_id], back_populates="sections")
    questions = relationship("Question", back_populates="task", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    task_results = relationship("TaskResult", back_populates="task")