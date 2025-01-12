from sqlalchemy import Column, Integer, ForeignKey, Boolean, Text
from app.core.database import Base

class StudentTask(Base):
    __tablename__ = "student_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    student_feedback = Column(Text, nullable=True)  # Відгук студента
