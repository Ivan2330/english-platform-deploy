from pydantic import BaseModel, EmailStr
from datetime import datetime
from .users import UserCreate
from app.models.users.users import UserRole, Subscription, EnglishLevel


class StudentCreate(UserCreate):  
    age: int
    subscription_type: str = Subscription.GROUP.value
    lesson_balance: int | None = None
    level: str = EnglishLevel.A1.value
    role: str = UserRole.STUDENT.value
    profile_image: str | None = None  

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    age: int | None = None
    phone_number: str | None = None
    profile_image: str | None = None
    subscription_type: str | None = None
    level: str | None = None


class StudentResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    phone_number: str
    level: str | None = None
    age: int | None = None
    profile_image: str | None = None
    lesson_balance: int | None = None
    subscription_type: str | None = None
    role: str = UserRole.STUDENT.value
    average_mark: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentSubscriptionUpdate(BaseModel):
    subscription_type: str


class StudentLevelUpdate(BaseModel):
    level: str


class StudentBalanceUpdate(BaseModel):
    lesson_balance: int


class StudentPhotoUpdate(BaseModel):
    profile_image: str