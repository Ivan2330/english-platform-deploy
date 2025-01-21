from pydantic import BaseModel, Field
from typing import Optional

# 📝 Схема для оновлення прогресу студента
class ClassroomProgressUpdate(BaseModel):
    classroom_id: int = Field(..., example=1)
    student_id: int = Field(..., example=5)
    completed_tasks: int = Field(..., example=10)
    average_score: float = Field(..., example=85.5)


# 🗂️ Схема відповіді для прогресу студента
class ClassroomProgressResponse(BaseModel):
    student_id: int = Field(..., example=5)
    student_name: str = Field(..., example="Alice Smith")
    completed_tasks: int = Field(..., example=10)
    average_score: float = Field(..., example=85.5)

    class Config:
        orm_mode = True


class ClassroomProgressCreate(BaseModel):
    classroom_id: int  # ID класу
    student_id: int  # ID студента
    task_id: int  # ID завдання
    progress: float  # Прогрес студента (у відсотках або баллах)
    status: Optional[str] = None  # Статус виконання (наприклад, 'completed', 'in_progress')

    class Config:
        from_attributes = True