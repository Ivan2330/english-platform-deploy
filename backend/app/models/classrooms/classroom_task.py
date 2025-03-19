from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User  # ✅ Оновлений імпорт


class ClassroomTask(Base):
    __tablename__ = "classroom_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)  # Прив'язка до класу
    task_id = Column(Integer, ForeignKey("universal_tasks.id"), nullable=False)  # Прив'язка до UniversalTask
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ Використовуємо users.id
    is_active = Column(Boolean, default=True)  # Чи активне завдання

    # Відносини
    assigned_by_user = relationship("User")  # Додаємо зв’язок із користувачем
