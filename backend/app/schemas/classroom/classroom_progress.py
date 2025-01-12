from pydantic import BaseModel, Field


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
