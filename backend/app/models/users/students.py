from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Enum, CheckConstraint, Text, ForeignKey
from app.core.database import Base
import enum


# Типи підписок
class Subscription(enum.Enum):
    GROUP = "group"  # Навчання у групі з викладачем
    INDIVIDUAL_PREMIUM = "individual_premium"  # Індивідуальне навчання з додатковими можливостями
    INDIVIDUAL = "individual"  # Індивідуальне навчання з викладачем
    PERSONAL = "personal"  # Самостійне навчання
    PERSONAL_PREMIUM = "personal_premium"  # Самостійне навчання + підтримка викладача


# Рівні англійської
class EnglishLevel(enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)  # Ім'я користувача
    email = Column(String, unique=True, nullable=False)  # Електронна пошта
    age = Column(Integer, nullable=False)  # Вік користувача
    phone_number = Column(String, unique=True, nullable=False)  # Номер телефону
    password = Column(String, nullable=False)  # Хешований пароль
    subscription_type = Column(Enum(Subscription), nullable=False, default=Subscription.PERSONAL)  # Тип підписки
    profile_image = Column(String(255), default=None)  # URL до фото профілю
    short_description = Column(Text, nullable=True)
    average_mark = Column(Integer, nullable=False)
    lesson_balance = Column(Integer, nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    ai_active = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, default=True)  # Статус облікового запису
    level = Column(Enum(EnglishLevel), default=EnglishLevel.A1)  # Рівень англійської
    last_login = Column(DateTime, default=func.now(), onupdate=func.now())  # Дата останнього входу
    created_at = Column(DateTime, default=func.now())  # Дата створення акаунта
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Дата оновлення акаунта
    
    __table_args__ = (
        CheckConstraint('age >= 5 AND age <= 90', name='check_age_valid_range'),  # Вік від 5 до 90 років
    )
