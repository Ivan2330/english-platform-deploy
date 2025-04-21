from pydantic import BaseModel, Field
from typing import List
from enum import Enum
from datetime import datetime


class ClassroomType(str, Enum):
    GROUP = "group"
    INDIVIDUAL = "individual"


class ClassroomBase(BaseModel):
    name: str
    type: str = ClassroomType.INDIVIDUAL.value
    description: str | None = None


class ClassroomCreate(ClassroomBase):
    teacher_id: int
    student_id: int | None = None


class ClassroomUpdate(BaseModel):
    name: str | None = None
    teacher_id: int | None = None
    student_id: int | None = None
    description: str | None = None
    is_active: bool | None = None


class ClassroomResponse(ClassroomBase):
    id: int
    teacher_id: int
    student_id: int | None = None
    current_lesson_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2
