from pydantic import BaseModel, Field


# 📝 Схема для оновлення прогресу студента
class ClassroomProgressUpdate(BaseModel):
    classroom_id: int = Field(..., example=1)
    user_id: int = Field(..., example=5)  # ✅ Використовуємо user_id замість student_id
    completed_tasks: int = Field(..., example=10)
    average_score: float = Field(..., example=85.5)


# 🗂️ Схема відповіді для прогресу студента
class ClassroomProgressResponse(BaseModel):
    user_id: int = Field(..., example=5)  # ✅ Використовуємо user_id замість student_id
    student_name: str = Field(..., example="Alice Smith")
    completed_tasks: int = Field(..., example=10)
    average_score: float = Field(..., example=85.5)

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2


class ClassroomProgressCreate(BaseModel):
    classroom_id: int  # ID класу
    user_id: int  # ✅ Використовуємо user_id замість student_id
    task_id: int  # ID завдання
    progress: float  # Прогрес студента (у відсотках або баллах)
    status: str | None = None  # ✅ Використовуємо `| None = None`

    class Config:
        from_attributes = True  # ✅ Оновлено для Pydantic 2
