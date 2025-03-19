from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User  # ✅ Оновлений імпорт
import enum


class CallStatus(enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"


class Call(Base):
    __tablename__ = "calls"
    
    id = Column(Integer, primary_key=True, index=True)
    status = Column(Enum(CallStatus), nullable=False, default=CallStatus.ACTIVE)  # ✅ Використовуємо Enum для статусу
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())


class CallParticipant(Base):
    __tablename__ = "call_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ Єдиний ForeignKey на users.id
    role = Column(String, nullable=False)  # "staff" або "student" ✅ Додаємо поле для розрізнення ролей
    joined_at = Column(DateTime, default=func.now())
    left_at = Column(DateTime, nullable=True)
    mic_status = Column(Boolean, default=True)  # Стан мікрофону
    camera_status = Column(Boolean, default=True)  # Стан камери
    screen_sharing = Column(Boolean, default=False)  # Стан трансляції екрану
    video_quality = Column(String, default="medium")  # Якість відео

    # Односторонній зв’язок – щоб отримати користувача, який бере участь у дзвінку
    user = relationship("User")
