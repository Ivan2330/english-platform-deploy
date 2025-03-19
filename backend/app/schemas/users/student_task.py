from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# 📝 Схема для призначення завдання студенту
class StudentTaskAssign(BaseModel):
    user_id: int = Field(..., example=1)  # ✅ Використовуємо user_id замість student_id
    task_id: int = Field(..., example=101)
    assigned_by: int = Field(..., example=5)  # ✅ Використовуємо user_id замість staff_id
    due_date: str | None = Field(None, example="2024-02-01T12:00:00")


# 🔄 Схема для оновлення статусу індивідуального завдання
class StudentTaskUpdate(BaseModel):
    is_completed: bool | None = Field(None, example=True)
    feedback: str | None = Field(None, example="Good job on completing the task!")
    score: float | None = Field(None, example=95.5)


# 🗂️ Схема відповіді для індивідуального завдання
class StudentTaskResponse(BaseModel):
    id: int = Field(..., example=501)
    user_id: int = Field(..., example=1)  # ✅ Використовуємо user_id замість student_id
    task_id: int = Field(..., example=101)
    assigned_by: int = Field(..., example=5)  # ✅ Використовуємо user_id замість staff_id
    is_completed: bool = Field(..., example=True)
    feedback: str | None = Field(None, example="Well done!")
    score: float | None = Field(None, example=95.5)
    assigned_at: datetime = Field(..., example="2024-01-20T10:00:00")
    due_date: datetime | None = Field(None, example="2024-02-01T12:00:00")
    completed_at: datetime | None = Field(None, example="2024-01-30T15:00:00")

    class Config:
        orm_mode = True
