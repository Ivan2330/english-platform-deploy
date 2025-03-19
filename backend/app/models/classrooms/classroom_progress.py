from sqlalchemy import Column, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User  # ✅ Оновлений імпорт


class ClassroomProgress(Base):
    __tablename__ = "classroom_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ Використовуємо users.id
    completed_tasks = Column(Integer, default=0)  # Кількість виконаних завдань
    average_score = Column(Float, default=0.0)  # Середній бал студента у класі

    # Односторонній зв’язок – щоб отримати студента
    student = relationship("User")
