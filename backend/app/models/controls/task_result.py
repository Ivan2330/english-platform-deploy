from sqlalchemy import Column, Integer, Boolean, Float, ForeignKey, DateTime, func
from app.core.database import Base

class TaskResult(Base):
    __tablename__ = "task_results"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, default=0.0)
    submitted_at = Column(DateTime, default=func.now())
