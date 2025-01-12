from pydantic import BaseModel, Field
from typing import Optional


# 📝 Схема для призначення завдання студенту
class StudentTaskAssign(BaseModel):
    student_id: int = Field(..., example=1)
    task_id: int = Field(..., example=101)
    assigned_by: int = Field(..., example=5)
    due_date: Optional[str] = Field(None, example="2024-02-01T12:00:00")


# 🔄 Схема для оновлення статусу індивідуального завдання
class StudentTaskUpdate(BaseModel):
    is_completed: Optional[bool] = Field(None, example=True)
    feedback: Optional[str] = Field(None, example="Good job on completing the task!")
    score: Optional[float] = Field(None, example=95.5)


# 🗂️ Схема відповіді для індивідуального завдання
class StudentTaskResponse(BaseModel):
    id: int = Field(..., example=501)
    student_id: int = Field(..., example=1)
    task_id: int = Field(..., example=101)
    assigned_by: int = Field(..., example=5)
    is_completed: bool = Field(..., example=True)
    feedback: Optional[str] = Field(None, example="Well done!")
    score: Optional[float] = Field(None, example=95.5)
    assigned_at: str = Field(..., example="2024-01-20T10:00:00")
    due_date: Optional[str] = Field(None, example="2024-02-01T12:00:00")
    completed_at: Optional[str] = Field(None, example="2024-01-30T15:00:00")

    class Config:
        orm_mode = True
