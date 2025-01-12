from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class Status(enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"


class EnglishLevel(enum.Enum):
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)  # Хешований пароль
    status = Column(Enum(Status), default=Status.TEACHER)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    profile_image = Column(String(255), default=None)  # URL до фото профілю
    is_active = Column(Boolean, default=True)  # Активний акаунт
    level = Column(Enum(EnglishLevel), default=EnglishLevel.B2)  # Рівень англійської
    is_admin = Column(Boolean, default=False)  # Чи є користувач адміністратором
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, default=func.now(), onupdate=func.now())  # Останній вхід
    created_at = Column(DateTime, default=func.now())  # Дата створення
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Дата оновлення


    class_relationship = relationship("Classroom", back_populates="staff")