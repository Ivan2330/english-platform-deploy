from enum import Enum
from pydantic import BaseModel, EmailStr
from .users import UserCreate
from datetime import datetime
from app.models.users.users import UserRole, Status, EnglishLevel


class StaffCreate(UserCreate):
    username: str    
    phone_number: str
    role: str = UserRole.STAFF.value  # ✅ Enum -> str
    status: str
    profile_image: str | None = None
    level: str

    class Config:
        from_attributes = True  # ✅ Дозволяє працювати з ORM
    


class StaffUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    profile_image: str | None = None
    level: str | None = None  # ✅ Enum -> str
    status: str | None = None  # ✅ Enum -> str
    is_active: bool | None = None


class StaffResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    phone_number: str
    profile_image: str | None = None
    level: str | None = None  # ✅ Enum -> str
    role: str  # ✅ Enum -> str
    status: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StaffRoleUpdate(BaseModel):
    status: str  # ✅ Enum -> str
    is_admin: bool


class StaffLogin(BaseModel):
    email: EmailStr
    password: str
