from sqlalchemy import Column, Integer, Boolean, ForeignKey
from app.core.database import Base

class ClassroomTask(Base):
    __tablename__ = "classroom_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)  # Прив'язка до класу
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)  # Прив'язка до UniversalTask
    assigned_by = Column(Integer, ForeignKey("staff.id"), nullable=False)  # Хто призначив завдання
    is_active = Column(Boolean, default=True)  # Чи активне завдання
