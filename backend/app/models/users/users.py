from typing import TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from app.core.database import Base
import enum

if TYPE_CHECKING:
    from app.models.classrooms.classroom import Classroom


class UserRole(str, enum.Enum):  # ✅ Enum, який працює як str
    STUDENT = "student"
    STAFF = "staff"


class Subscription(str, enum.Enum):
    GROUP = "group"
    INDIVIDUAL_PREMIUM = "individual_premium"
    INDIVIDUAL = "individual"
    PERSONAL = "personal"
    PERSONAL_PREMIUM = "personal_premium"


class Status(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"


class EnglishLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"
    

class User(SQLAlchemyBaseUserTable[int], Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # ✅ Зберігаємо як TEXT

    # Загальні поля
    profile_image = Column(String(255), default=None)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Поля для студентів
    age = Column(Integer, nullable=True)
    subscription_type = Column(String, nullable=True, default=None)
    short_description = Column(Text, nullable=True)
    average_mark = Column(Integer, nullable=True, default=0.0)
    lesson_balance = Column(Integer, nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    ai_active = Column(Boolean, nullable=True, default=True)
    level = Column(String, nullable=True, default=EnglishLevel.A1.value)  # ✅ Enum -> str

    # Поля для стафу
    status = Column(String, nullable=True, default=None)  # ✅ Enum -> str
    is_admin = Column(Boolean, nullable=True, default=False)
    is_verified = Column(Boolean, nullable=True, default=False)

    # Відносини
    created_classrooms = relationship("Classroom", foreign_keys="Classroom.teacher_id", back_populates="teacher")
    classrooms = relationship("Classroom", foreign_keys="Classroom.student_id", back_populates="student")
