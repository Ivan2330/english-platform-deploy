from pydantic import BaseModel, Field
from typing import Optional


# 📝 Схема для призначення завдання класу
class ClassroomTaskAssign(BaseModel):
    classroom_id: int = Field(..., example=1)
    task_id: int = Field(..., example=101)
    assigned_by: int = Field(..., example=2)


# 🔄 Схема для оновлення завдання у класі
class ClassroomTaskUpdate(BaseModel):
    task_id: int = Field(..., example=101)
    is_active: Optional[bool] = Field(None, example=True)


# 🗂️ Схема відповіді для завдання у класі
class ClassroomTaskResponse(BaseModel):
    id: int = Field(..., example=201)
    classroom_id: int = Field(..., example=1)
    task_id: int = Field(..., example=101)
    title: str = Field(..., example="Grammar Test")
    is_active: bool = Field(..., example=True)
    assigned_by: int = Field(..., example=2)
    assigned_at: str = Field(..., example="2024-01-10T15:30:00")

    class Config:
        orm_mode = True
