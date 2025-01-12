from sqlalchemy import Column, Integer, ForeignKey, Boolean
from app.core.database import Base

class ClassroomTask(Base):
    __tablename__ = "classroom_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("staff.id"), nullable=False)
    is_active = Column(Boolean, default=True)

