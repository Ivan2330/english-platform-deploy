from pydantic import BaseModel, Field
from typing import Optional


# 📝 Схема для створення дзвінка у класі
class ClassroomCallCreate(BaseModel):
    classroom_id: int = Field(..., example=1)
    status: str = Field(..., example="active")


# 🔄 Схема для оновлення статусу дзвінка
class ClassroomCallUpdate(BaseModel):
    call_id: int = Field(..., example=401)
    status: str = Field(..., example="ended")


# 🗂️ Схема відповіді для дзвінка у класі
class ClassroomCallResponse(BaseModel):
    id: int = Field(..., example=401)
    classroom_id: int = Field(..., example=1)
    status: str = Field(..., example="active")
    started_at: str = Field(..., example="2024-01-15T16:00:00")
    ended_at: Optional[str] = Field(None, example="2024-01-15T17:00:00")

    class Config:
        orm_mode = True
