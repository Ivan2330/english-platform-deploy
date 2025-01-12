from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class ClassroomType(str, Enum):
    GROUP = "group"
    INDIVIDUAL = "individual"


class ClassroomBase(BaseModel):
    name: str = Field(..., example="English for Beginners")
    type: ClassroomType = Field(..., example="group")
    description: Optional[str] = Field(None, example="This is a group class for beginners.")


class ClassroomCreate(ClassroomBase):
    teacher_id: int = Field(..., example=1)


class ClassroomUpdate(BaseModel):
    name: Optional[str] = Field(None, example="Updated Class Name")
    description: Optional[str] = Field(None, example="Updated description")
    is_active: Optional[bool] = Field(None, example=True)


class ClassroomResponse(ClassroomBase):
    id: int = Field(..., example=1)
    teacher_id: int = Field(..., example=1)
    is_active: bool = Field(..., example=True)
    students: Optional[List[str]] = Field(None, example=["student1", "student2"])
    created_at: str = Field(..., example="2024-01-01T12:00:00")
    updated_at: str = Field(..., example="2024-01-10T15:30:00")

    class Config:
        orm_mode = True
