from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.users.users import User


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, nullable=False, default="active")  # ✅ Використовуємо string замість Enum
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # ✅ Відносини
    participants = relationship("CallParticipant", back_populates="call")


class CallParticipant(Base):
    __tablename__ = "call_participants"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # ✅ Використовуємо string ("teacher" або "student") замість Enum
    joined_at = Column(DateTime, default=func.now())
    left_at = Column(DateTime, nullable=True)
    mic_status = Column(Boolean, default=True)
    camera_status = Column(Boolean, default=True)
    screen_sharing = Column(Boolean, default=False)
    video_quality = Column(String, default="medium")

    # ✅ Відносини
    call = relationship("Call", back_populates="participants")
    user = relationship("User")  # ✅ Отримуємо учасника дзвінка