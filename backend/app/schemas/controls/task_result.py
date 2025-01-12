from pydantic import BaseModel, Field
from typing import Optional


# 📝 Схема для надсилання результатів завдання
class TaskResultSubmit(BaseModel):
    task_id: int = Field(..., example=1)
    student_id: int = Field(..., example=10)
    answer: str = Field(..., example="Option A")
    is_correct: Optional[bool] = Field(None, example=True)
    score: Optional[float] = Field(None, example=85.5)


# 🔄 Схема для оновлення результатів завдання
class TaskResultUpdate(BaseModel):
    score: Optional[float] = Field(None)
    is_correct: Optional[bool] = Field(None)


# 🗂️ Схема відповіді для результатів завдання
class TaskResultResponse(BaseModel):
    id: int = Field(..., example=201)
    task_id: int = Field(..., example=1)
    student_id: int = Field(..., example=10)
    answer: str = Field(..., example="Option A")
    is_correct: bool = Field(..., example=True)
    score: float = Field(..., example=85.5)
    submitted_at: str = Field(..., example="2024-01-15T11:30:00")

    class Config:
        orm_mode = True
