from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


# Типи завдань
class TaskType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    GAP_FILL = "gap_fill"
    OPEN_TEXT = "open_text"


# Типи контролів
class ControlType(str, Enum):
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"


# Видимість завдання
class Visibility(str, Enum):
    GLOBAL = "global"
    CLASS_SPECIFIC = "class_specific"
    PRIVATE = "private"


# 📝 Базова схема завдання
class UniversalTaskBase(BaseModel):
    control_type: ControlType = Field(..., example="reading")
    title: str = Field(..., example="Reading Comprehension Test")
    description: Optional[str] = Field(None, example="Test your reading skills.")
    task_type: TaskType = Field(..., example="multiple_choice")
    content: Optional[str] = Field(None, example="Read the following text and answer the questions.")
    media_url: Optional[str] = Field(None, example="http://example.com/audio.mp3")
    correct_answer: Optional[str] = Field(None, example="Option A")
    explanation: Optional[str] = Field(None, example="This answer is correct because...")
    options: Optional[List[str]] = Field(None, example=["Option A", "Option B", "Option C"])
    visibility: Visibility = Field(..., example="global")


# 🛠️ Схема для створення завдання
class UniversalTaskCreate(UniversalTaskBase):
    created_by: int = Field(..., example=1)


# 🔄 Схема для оновлення завдання
class UniversalTaskUpdate(BaseModel):
    title: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    task_type: Optional[TaskType] = Field(None)
    content: Optional[str] = Field(None)
    media_url: Optional[str] = Field(None)
    correct_answer: Optional[str] = Field(None)
    explanation: Optional[str] = Field(None)
    options: Optional[List[str]] = Field(None)
    visibility: Optional[Visibility] = Field(None)


# 🗂️ Схема відповіді для завдання
class UniversalTaskResponse(UniversalTaskBase):
    id: int = Field(..., example=1)
    created_by: int = Field(..., example=1)
    classroom_id: Optional[int] = Field(None, example=5)
    student_id: Optional[int] = Field(None, example=10)
    is_active: bool = Field(..., example=True)
    created_at: str = Field(..., example="2024-01-01T12:00:00")
    updated_at: str = Field(..., example="2024-01-10T15:30:00")

    class Config:
        orm_mode = True
