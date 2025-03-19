from pydantic import BaseModel, EmailStr
from datetime import datetime
from .users import UserCreate
from app.models.users.users import UserRole, Subscription, EnglishLevel


class StudentCreate(UserCreate):  
    age: int
    subscription_type: str = Subscription.GROUP.value  # ✅ Enum -> str
    lesson_balance: int | None = None
    level: str = EnglishLevel.A1.value  # ✅ Enum -> str
    role: str = UserRole.STUDENT.value  # ✅ Enum -> str
    profile_image: str | None = None  

    class Config:
        from_attributes = True  # ✅ Дозволяє працювати з ORM


class StudentUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    age: int | None = None
    phone_number: str | None = None
    profile_image: str | None = None
    subscription_type: str | None = None  # ✅ Enum -> str
    level: str | None = None  # ✅ Enum -> str


class StudentResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    phone_number: str
    age: int
    profile_image: str | None = None
    lesson_balance: int | None = None
    subscription_type: str | None = None  # ✅ Enum -> str
    role: str = UserRole.STUDENT.value  # ✅ Enum -> str
    average_mark: int | None = None  # ✅ Додаємо `None`, щоб уникнути помилок
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentSubscriptionUpdate(BaseModel):
    subscription_type: str  # ✅ Enum -> str


class StudentLevelUpdate(BaseModel):
    level: str  # ✅ Enum -> str


class StudentBalanceUpdate(BaseModel):
    lesson_balance: int
