from pydantic import BaseModel
from datetime import datetime


class TaskResultBase(BaseModel):
    task_id: int
    student_id: int
    student_answer: str
    is_correct: bool | None = None
    score: float | None = None


class TaskResultCreate(TaskResultBase):
    pass


class TaskResultUpdate(BaseModel):
    is_correct: bool | None = None
    score: float | None = None


class TaskResultResponse(TaskResultBase):
    id: int
    submitted_at: datetime

    class Config:
        from_attributes = True
