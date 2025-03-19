from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Dict


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
    control_type: str = ControlType.GRAMMAR.value
    task_type: str = TaskType.TRUE_FALSE.value
    title: str
    description: str | None = None
    content: str | None = None
    media_url: str | None = None
    topic: str | None = None
    word_list: str | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    options: Dict[str, str]  # ✅ Варіанти відповідей у JSON-форматі
    visibility: str = Visibility.GLOBAL.value
    level: str | None = None


class UniversalTaskCreate(UniversalTaskBase):
    pass


class UniversalTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    media_url: str | None = None
    topic: str | None = None
    word_list: str | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    options: Dict[str, str] | None = None
    visibility: str | None = None
    level: str | None = None


class UniversalTaskResponse(UniversalTaskBase):
    id: int
    created_by: int
    classroom_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
