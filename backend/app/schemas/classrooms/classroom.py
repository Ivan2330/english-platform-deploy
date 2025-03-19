from pydantic import BaseModel, Field
from typing import List
from enum import Enum
from datetime import datetime


class ClassroomType(str, Enum):
    GROUP = "group"
    INDIVIDUAL = "individual"


class ClassroomBase(BaseModel):
    name: str = Field(..., example="English for Beginners")
    type: str = Field(..., example="group")
    description: str | None = Field(None, example="This is a group class for beginners.")


class ClassroomCreate(ClassroomBase):
    user_id: int = Field(..., example=1)  # ✅ Використовуємо user_id замість teacher_id


class ClassroomUpdate(BaseModel):
    name: str | None = Field(None, example="Updated Class Name")
    description: str | None = Field(None, example="Updated description")
    is_active: bool | None = Field(None, example=True)


class ClassroomResponse(ClassroomBase):
    id: int = Field(..., example=1)
    user_id: int = Field(..., example=1)  # ✅ Використовуємо user_id замість teacher_id
    is_active: bool = Field(..., example=True)
    students: List[int] | None = Field(None, example=[1, 2, 3])
    created_at: datetime = Field(..., example="2024-01-01T12:00:00")
    updated_at: datetime = Field(..., example="2024-01-10T15:30:00")

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2
