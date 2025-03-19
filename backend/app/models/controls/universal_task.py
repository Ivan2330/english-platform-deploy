from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User  # ✅ Оновлений імпорт
import enum
import json

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
    control_type = Column(String, nullable=False)  # Тип контролю
    task_type = Column(String, nullable=False)  # Тип завдання
    title = Column(String, nullable=False)  # Назва завдання
    level = Column(String, nullable=True)
    description = Column(Text, nullable=True)  # Опис
    content = Column(Text, nullable=True)  # Основний контент
    media_url = Column(String, nullable=True)  # Посилання на медіа
    topic = Column(String, nullable=True)  # Тема завдання
    word_list = Column(Text, nullable=True)  # Список слів для завдань
    correct_answer = Column(Text, nullable=True)  # Правильна відповідь
    explanation = Column(Text, nullable=True)  # Пояснення
    options = Column(Text, nullable=True)  # Варіанти відповідей
    visibility = Column(String, nullable=False)  # Видимість

    # Прив'язки
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ Використовуємо users.id
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)  # Прив'язка до класу
    is_active = Column(Boolean, default=True)  # Чи активне завдання
    created_at = Column(DateTime, default=func.now())  # Дата створення
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Дата оновлення

    # Зв'язки
    task_results = relationship("TaskResult", back_populates="task")

    # Односторонній зв’язок – щоб отримати викладача, який створив завдання
    creator = relationship("User", foreign_keys=[created_by])  # ✅ Додано foreign_keys


    def set_options(self, options_dict):
        """Зберігає варіанти відповідей у JSON"""
        self.options = json.dumps(options_dict)

    def get_options(self):
        """Отримує список варіантів відповідей у вигляді словника"""
        return json.loads(self.options) if self.options else {}