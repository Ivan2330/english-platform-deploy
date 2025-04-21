from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Dict
from app.models.controls.universal_task import ControlType, TaskType, Visibility


class UniversalTaskBase(BaseModel):
    lesson_id: int | None = None
    control_type: str = ControlType.GRAMMAR.value
    task_type: str = TaskType.TRUE_FALSE.value
    title: str
    description: str | None = None
    content: str | None = None
    media_url: str | None = None
    topic: str | None = None
    word_list: str | None = None
    visibility: str = Visibility.GLOBAL.value


class UniversalTaskCreate(UniversalTaskBase):
    pass


class UniversalTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    media_url: str | None = None
    topic: str | None = None
    word_list: str | None = None
    visibility: str | None = None


class UniversalTaskResponse(UniversalTaskBase):
    id: int
    created_by: int
    classroom_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
