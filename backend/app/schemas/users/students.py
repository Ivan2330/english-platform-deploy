from pydantic import BaseModel, EmailStr
from enum import Enum


# Рівні підписок
class Subscription(str, Enum):
    GROUP = "group"
    INDIVIDUAL_PREMIUM = "individual_premium"
    INDIVIDUAL = "individual"
    PERSONAL = "personal"
    PERSONAL_PREMIUM = "personal_premium"

class EnglishLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"

class StudentBase(BaseModel):
    username: str
    email: EmailStr
    age: int
    phone_number: str
    profile_image: str | None
    lesson_balance: str | None

class StudentCreate(StudentBase):
    password: str


# Without level and Sub
class StudentUpdate(BaseModel):
    username: str | None
    email: EmailStr | None
    age: int | None
    phone_number: str | None
    profile_image: str | None
    


# Схема відповіді студента
class StudentResponse(StudentBase):
    id: int
    average_mark: int | None
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


# 🛡️ Схема для оновлення підписки студента персоналом
class StudentSubscriptionUpdate(BaseModel):
    subscription_type: Subscription


# 🎓 Схема для оновлення рівня студента персоналом або автоматично
class StudentLevelUpdate(BaseModel):
    level: EnglishLevel


class StudentBalanceUpdate(BaseModel):
    lesson_balance: int