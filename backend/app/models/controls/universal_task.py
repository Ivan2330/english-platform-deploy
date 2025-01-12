from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# Типи завдань
class TaskType(enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    GAP_FILL = "gap_fill"
    OPEN_TEXT = "open_text"


# Типи контролів
class ControlType(enum.Enum):
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"


# Видимість завдань
class Visibility(enum.Enum):
    GLOBAL = "global"
    CLASS_SPECIFIC = "class_specific"
    PRIVATE = "private"


class UniversalTask(Base):
    __tablename__ = "universal_tasks"
    
    # Основна інформація
    id = Column(Integer, primary_key=True, index=True)
    control_type = Column(Enum(ControlType), nullable=False)  # Тип контролю (WRITING, LISTENING і т.д.)
    task_type = Column(Enum(TaskType), nullable=False)  # Тип завдання (MULTIPLE_CHOICE і т.д.)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # Основний контент завдання
    media_url = Column(String, nullable=True)  # Посилання на медіа (аудіо/відео)
    topic = Column(String, nullable=True)  # Тема завдання
    word_list = Column(Text, nullable=True)  # Список слів для VOCABULARY
    correct_answer = Column(Text, nullable=True)  # Правильна відповідь
    explanation = Column(Text, nullable=True)  # Пояснення
    options = Column(Text, nullable=True)  # Відповіді для MULTIPLE_CHOICE (JSON)
    visibility = Column(Enum(Visibility), default=Visibility.GLOBAL)  # Видимість завдання

    # Прив'язки до користувачів і класів
    created_by = Column(Integer, ForeignKey("staff.id"), nullable=False)  # Хто створив завдання
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)  # Прив'язка до класу
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)  # Прив'язка до студента

    # Статуси
    is_active = Column(Boolean, default=True)  # Чи доступне завдання
    created_at = Column(DateTime, default=func.now())  # Час створення
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Час оновлення

    # Зв'язки
    ai_feedback = relationship("AIFeedback", back_populates="task")  # GPT-4 фідбек для райтингу
    task_result = relationship("TaskResult", back_populates="task")  # Результати завдань
