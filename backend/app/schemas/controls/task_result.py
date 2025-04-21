from pydantic import BaseModel
from datetime import datetime


class TaskResultBase(BaseModel):
    task_id: int
    student_id: int
    question_id: int | None = None
    student_answer: str
    is_correct: bool | None = None
    teacher_feedback: str | None = None
    score: float | None = None


class TaskResultCreate(TaskResultBase):
    pass


class TaskResultUpdate(BaseModel):
    is_correct: bool | None = None
    score: float | None = None
    teacher_feedback: str | None = None


class TaskResultResponse(TaskResultBase):
    id: int
    completed_at: datetime

    class Config:
        from_attributes = True
