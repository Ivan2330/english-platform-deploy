from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    GAP_FILL = "gap_fill"
    OPEN_TEXT = "open_text"


class ControlType(str, Enum):
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"


class Visibility(str, Enum):
    GLOBAL = "global"
    CLASS_SPECIFIC = "class_specific"
    PRIVATE = "private"


class UniversalTaskBase(BaseModel):
    control_type: ControlType
    task_type: TaskType
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None
    topic: Optional[str] = None
    word_list: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    options: Optional[str] = None
    visibility: Optional[Visibility] = Visibility.GLOBAL
    level: Optional[str] = None  # Рівень завдання


class UniversalTaskCreate(UniversalTaskBase):
    pass


class UniversalTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    media_url: Optional[str] = None
    topic: Optional[str] = None
    word_list: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    options: Optional[str] = None
    visibility: Optional[Visibility] = None
    level: Optional[str] = None


class UniversalTaskResponse(UniversalTaskBase):
    id: int
    created_by: int
    classroom_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
