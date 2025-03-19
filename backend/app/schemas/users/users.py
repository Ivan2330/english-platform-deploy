from pydantic import BaseModel, EmailStr
from fastapi_users import schemas
from enum import Enum
from datetime import datetime
from app.models.users.users import UserRole, Status


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole | None = None
    status: Status | None = None


class UserCreate(UserBase, schemas.BaseUserCreate):
    username: str
    phone_number: str
    password: str
    profile_image: str | None = None
    status: Status | None = None


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    profile_image: str | None = None
    is_active: bool | None = None
    status: Status | None = None


class UserResponse(UserBase):
    id: int
    username: str
    phone_number: str
    profile_image: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
