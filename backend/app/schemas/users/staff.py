from enum import Enum
from pydantic import BaseModel, EmailStr


class Status(str, Enum):
    TEACHER = "teacher"
    ADMIN = "admin"


class EnglishLevel(str, Enum):
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class StaffBase(BaseModel):
    username: str
    email: EmailStr
    phone_number: str
    profile_image: str | None
    level: EnglishLevel | None
    

class StaffCreate(StaffBase):
    password: str
    status: Status = Status.TEACHER


class StaffUpdate(BaseModel):
    username: str | None
    email: EmailStr | None
    phone_number: str | None
    profile_image: str | None
    level: EnglishLevel | None
    status: Status | None
    is_active: bool | None


class StaffResponse(StaffBase):
    id: int
    status: Status
    is_active: bool
    is_admin: bool
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True


class StaffRoleUpdate(BaseModel):
    status: Status
    is_admin: bool


class StaffLogin(BaseModel):
    email: EmailStr
    password: str


